/**
 * @module rag-capability
 * @description Real RAG pipeline for the AmarktAI Network.
 *
 * Pipeline:
 *   1. Ingest (document text or website via in-house scraper)
 *   2. Chunk text into overlapping segments
 *   3. Embed chunks via HuggingFace sentence-transformers
 *   4. Store vectors in Qdrant (via vector-store.ts)
 *   5. Retrieve top-K matching chunks by query embedding
 *   6. Assemble context with citations/metadata
 *
 * Honest failure contract:
 *   - Qdrant not configured → clear setup error, no fake success
 *   - HF embeddings not configured → clear setup error
 *   - Keyword-only search is NOT returned as "RAG complete"
 *
 * Scopes: app, workspace, brand, character — enforced via Qdrant payload filter.
 *
 * Server-side only.
 */

import {
  getQdrantClientAsync,
  ensureAppKnowledgeCollection,
  upsertAppKnowledge,
  searchAppKnowledge,
  type VectorPoint,
} from '@/lib/vector-store'
import { crawlWebsite } from '@/lib/scraper'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentType = 'pdf' | 'docx' | 'txt' | 'markdown' | 'website' | 'knowledge_base'

export type RAGScope = 'app' | 'workspace' | 'brand' | 'character' | 'global'

export interface RAGDocumentMeta {
  id: string
  type: DocumentType
  title: string
  url?: string
  appSlug: string
  scope: RAGScope
  scopeId?: string
  ingestedAt: Date
  chunkCount: number
}

export interface RAGChunk {
  id: string
  documentId: string
  appSlug: string
  scope: RAGScope
  scopeId?: string
  content: string
  startIndex: number
  endIndex: number
  metadata: Record<string, unknown>
}

export interface RAGRetrievalResult {
  success: boolean
  chunks: RAGChunkWithScore[]
  context: string
  sources: string[]
  totalScore: number
  error?: string
}

export interface RAGChunkWithScore {
  chunk: RAGChunk
  score: number
}

export interface RAGIngestionResult {
  success: boolean
  documentId: string
  chunkCount: number
  embeddedCount: number
  storedCount: number
  error?: string
}

// ── HF Embedding ──────────────────────────────────────────────────────────────

const HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const _EMBEDDING_DIM = 384 // all-MiniLM-L6-v2 output dim (kept for documentation)

/**
 * Generate embeddings for a batch of texts via HuggingFace Inference API.
 * Returns null arrays if HF key is missing.
 * Never throws — returns error string on failure.
 */
export async function generateEmbeddings(
  texts: string[],
  hfApiKey: string,
  model = HF_EMBEDDING_MODEL,
): Promise<{ embeddings: (number[] | null)[]; error: string | null }> {
  if (!texts.length) return { embeddings: [], error: null }

  const url = `https://api-inference.huggingface.co/models/${model}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      const isLoading = res.status === 503 || errText.toLowerCase().includes('loading')
      return {
        embeddings: texts.map(() => null),
        error: isLoading
          ? `HF embedding model is loading. Retry shortly.`
          : `HF embeddings error ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json().catch(() => null)
    // HF returns float[][] for batch inputs
    if (!Array.isArray(data)) {
      return { embeddings: texts.map(() => null), error: 'HF embeddings returned unexpected format' }
    }

    const embeddings = (data as unknown[]).map((item: unknown) => {
      if (Array.isArray(item) && item.every(x => typeof x === 'number')) return item as number[]
      return null
    })
    return { embeddings, error: null }
  } catch (err) {
    return {
      embeddings: texts.map(() => null),
      error: `HF embeddings request failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Generate a single query embedding.
 */
export async function generateQueryEmbedding(
  query: string,
  hfApiKey: string,
  model = HF_EMBEDDING_MODEL,
): Promise<{ embedding: number[] | null; error: string | null }> {
  const { embeddings, error } = await generateEmbeddings([query], hfApiKey, model)
  return { embedding: embeddings[0] ?? null, error }
}

// ── Chunking ──────────────────────────────────────────────────────────────────

export interface ChunkOptions {
  chunkSize?: number
  chunkOverlap?: number
}

/**
 * Split text into overlapping chunks with stable deterministic IDs.
 */
export function chunkText(
  documentId: string,
  text: string,
  opts: ChunkOptions = {},
): RAGChunk[] {
  const chunkSize = opts.chunkSize ?? 512
  const overlap = opts.chunkOverlap ?? 64

  const words = text.split(/\s+/)
  const chunks: RAGChunk[] = []
  let wordStart = 0
  let chunkIndex = 0

  while (wordStart < words.length) {
    const wordEnd = Math.min(wordStart + chunkSize, words.length)
    const chunkWords = words.slice(wordStart, wordEnd)
    const content = chunkWords.join(' ')

    if (content.trim().length > 0) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        appSlug: '',
        scope: 'app',
        content,
        startIndex: wordStart,
        endIndex: wordEnd,
        metadata: { chunkIndex, wordCount: chunkWords.length },
      })
      chunkIndex++
    }

    wordStart += chunkSize - overlap
    if (wordStart >= wordEnd) break // safety
  }

  return chunks
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export interface IngestDocumentOptions {
  appSlug: string
  scope?: RAGScope
  scopeId?: string
  chunkSize?: number
  chunkOverlap?: number
  hfApiKey: string
  embeddingModel?: string
  metadata?: Record<string, unknown>
}

/**
 * Ingest a text document into the RAG pipeline.
 * Chunks → embeds → stores in Qdrant.
 * Returns clear error if Qdrant or embeddings are unavailable.
 */
export async function ingestDocument(
  documentId: string,
  title: string,
  content: string,
  type: DocumentType,
  opts: IngestDocumentOptions,
): Promise<RAGIngestionResult> {
  const fail = (error: string): RAGIngestionResult => ({
    success: false, documentId, chunkCount: 0, embeddedCount: 0, storedCount: 0, error,
  })

  // Check Qdrant
  const qdrant = await getQdrantClientAsync()
  if (!qdrant) {
    return fail('RAG ingestion requires Qdrant. Configure QDRANT_URL and optionally QDRANT_API_KEY.')
  }

  // Ensure collection
  const collectionReady = await ensureAppKnowledgeCollection()
  if (!collectionReady) {
    return fail('Failed to ensure Qdrant collection for RAG ingestion.')
  }

  // Chunk
  const rawChunks = chunkText(documentId, content, {
    chunkSize: opts.chunkSize,
    chunkOverlap: opts.chunkOverlap,
  })

  if (rawChunks.length === 0) {
    return fail('No chunks produced — content may be empty.')
  }

  // Embed in batches of 32
  const BATCH = 32
  const vectors: VectorPoint[] = []
  let embeddedCount = 0
  let embeddingError: string | null = null

  for (let i = 0; i < rawChunks.length; i += BATCH) {
    const batch = rawChunks.slice(i, i + BATCH)
    const texts = batch.map(c => c.content)
    const { embeddings, error } = await generateEmbeddings(texts, opts.hfApiKey, opts.embeddingModel)

    if (error && !embeddingError) embeddingError = error

    for (let j = 0; j < batch.length; j++) {
      const emb = embeddings[j]
      if (!emb) continue
      embeddedCount++
      const chunk = batch[j]
      vectors.push({
        id: chunk.id,
        vector: emb,
        payload: {
          document_id: documentId,
          chunk_id: chunk.id,
          app_slug: opts.appSlug,
          scope: opts.scope ?? 'app',
          scope_id: opts.scopeId ?? '',
          title,
          type,
          content: chunk.content,
          start_index: chunk.startIndex,
          end_index: chunk.endIndex,
          chunk_index: (chunk.metadata.chunkIndex as number) ?? 0,
          ...opts.metadata,
        },
      })
    }
  }

  if (embeddedCount === 0) {
    return fail(embeddingError ?? 'All embeddings failed — check HuggingFace API key and model availability.')
  }

  // Store in Qdrant
  const stored = await upsertAppKnowledge(opts.appSlug, vectors)
  if (!stored) {
    return fail('Failed to store vectors in Qdrant.')
  }

  return {
    success: true,
    documentId,
    chunkCount: rawChunks.length,
    embeddedCount,
    storedCount: vectors.length,
    error: embeddingError ?? undefined,
  }
}

/**
 * Ingest a website by crawling it with the in-house scraper.
 * Each page is ingested as a separate document.
 */
export async function ingestWebsite(
  url: string,
  opts: IngestDocumentOptions & {
    maxPages?: number
    maxDepth?: number
    scrapeTimeoutMs?: number
  },
): Promise<RAGIngestionResult[]> {
  const crawl = await crawlWebsite(url, {
    maxPages: opts.maxPages ?? 10,
    maxDepth: opts.maxDepth ?? 2,
    timeoutMs: opts.scrapeTimeoutMs ?? 15_000,
  })

  if (!crawl.success || crawl.pages.length === 0) {
    return [{
      success: false,
      documentId: url,
      chunkCount: 0,
      embeddedCount: 0,
      storedCount: 0,
      error: crawl.error ?? 'Website crawl returned no pages',
    }]
  }

  const results: RAGIngestionResult[] = []
  for (const page of crawl.pages) {
    const docId = `web_${Buffer.from(page.url).toString('base64').slice(0, 32).replace(/[^a-zA-Z0-9]/g, '_')}`
    const text = [page.title, page.description, page.headings.join(' '), page.bodyText].join('\n\n')
    const result = await ingestDocument(docId, page.title || page.url, text, 'website', {
      ...opts,
      metadata: { ...opts.metadata, source_url: page.url, page_title: page.title },
    })
    results.push(result)
  }
  return results
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

export interface RAGQueryOptions {
  appSlug: string
  scope?: RAGScope
  scopeId?: string
  limit?: number
  minScore?: number
  hfApiKey: string
  embeddingModel?: string
}

/**
 * Query the RAG pipeline for relevant chunks.
 * Returns assembled context with citations.
 * Returns clear error if Qdrant or embeddings are unavailable.
 */
export async function queryRAG(
  query: string,
  opts: RAGQueryOptions,
): Promise<RAGRetrievalResult> {
  const fail = (error: string): RAGRetrievalResult => ({
    success: false, chunks: [], context: '', sources: [], totalScore: 0, error,
  })

  // Check Qdrant
  const qdrant = await getQdrantClientAsync()
  if (!qdrant) {
    return fail('RAG retrieval requires Qdrant. Configure QDRANT_URL and optionally QDRANT_API_KEY.')
  }

  // Embed query
  const { embedding, error: embError } = await generateQueryEmbedding(query, opts.hfApiKey, opts.embeddingModel)
  if (!embedding) {
    return fail(embError ?? 'Failed to generate query embedding — check HuggingFace API key.')
  }

  // Search Qdrant
  const searchResults = await searchAppKnowledge(opts.appSlug, embedding, opts.limit ?? 5)

  if (searchResults.length === 0) {
    return {
      success: true,
      chunks: [],
      context: '',
      sources: [],
      totalScore: 0,
    }
  }

  const minScore = opts.minScore ?? 0.3
  const chunks: RAGChunkWithScore[] = []
  const sources: string[] = []

  for (const r of searchResults) {
    if (r.score < minScore) continue

    // Scope filter
    if (opts.scope && r.payload.scope !== opts.scope) continue
    if (opts.scopeId && r.payload.scope_id !== opts.scopeId) continue

    const chunk: RAGChunk = {
      id: String(r.payload.chunk_id ?? r.id),
      documentId: String(r.payload.document_id ?? ''),
      appSlug: String(r.payload.app_slug ?? opts.appSlug),
      scope: (r.payload.scope as RAGScope) ?? 'app',
      scopeId: r.payload.scope_id ? String(r.payload.scope_id) : undefined,
      content: String(r.payload.content ?? ''),
      startIndex: Number(r.payload.start_index ?? 0),
      endIndex: Number(r.payload.end_index ?? 0),
      metadata: {
        title: r.payload.title,
        type: r.payload.type,
        source_url: r.payload.source_url,
        chunk_index: r.payload.chunk_index,
      },
    }
    chunks.push({ chunk, score: r.score })

    // Collect unique sources
    const src = String(r.payload.source_url ?? r.payload.title ?? r.payload.document_id ?? '')
    if (src && !sources.includes(src)) sources.push(src)
  }

  // Assemble context
  const context = assembleContext(chunks, query)
  const totalScore = chunks.reduce((s, c) => s + c.score, 0)

  return { success: true, chunks, context, sources, totalScore }
}

/**
 * Assemble retrieved chunks into a context string with citations.
 */
export function assembleContext(chunks: RAGChunkWithScore[], query: string): string {
  if (chunks.length === 0) return ''

  const parts = chunks
    .sort((a, b) => (a.chunk.metadata.chunk_index as number ?? 0) - (b.chunk.metadata.chunk_index as number ?? 0))
    .map((c, i) => {
      const src = c.chunk.metadata.source_url ?? c.chunk.metadata.title ?? c.chunk.documentId
      return `[${i + 1}] ${src ? `(Source: ${src}) ` : ''}${c.chunk.content}`
    })

  return `Relevant context for "${query}":\n\n${parts.join('\n\n---\n\n')}`
}
