/**
 * RAG Pipeline — Retrieval-Augmented Generation
 *
 * Complete pipeline: Document chunking → Embedding → Storage → Retrieval → Context injection.
 * Uses Qdrant vector store for semantic search and Qwen embeddings for vectorization.
 *
 * Truthful: Only returns results that actually exist in the vector store.
 * Gracefully degrades when infrastructure (Qdrant, embedding API) is unavailable.
 */

import { searchVectors, upsertVectors, ensureCollection, isQdrantHealthy } from './vector-store'
import { cacheGet, cacheSet } from './redis'
import { getVaultApiKey } from './brain'
import { randomUUID } from 'crypto'
import { executeCapability } from '@/lib/capability-router'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Document {
  id: string
  content: string
  metadata: Record<string, unknown>
  /** Source identifier (e.g., filename, URL, app slug) */
  source: string
  /** Namespace for isolation (e.g., per-app, per-tenant) */
  namespace: string
}

export interface Chunk {
  id: string
  documentId: string
  content: string
  index: number
  metadata: Record<string, unknown>
  namespace: string
}

export interface RetrievalResult {
  vectorId: string
  content: string
  score: number
  documentId: string
  source: string
  chunkIndex: number
  metadata: Record<string, unknown>
}

export interface RAGContext {
  query: string
  results: RetrievalResult[]
  contextWindow: string
  totalChunksSearched: number
  latencyMs: number
}

export interface IngestResult {
  documentId: string
  chunksCreated: number
  embeddingsGenerated: number
  vectorIds: string[]
  collection: string
  success: boolean
  error?: string
}

// ── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 512
const DEFAULT_CHUNK_OVERLAP = 64
const DEFAULT_TOP_K = 5
const EMBEDDING_MODEL = 'text-embedding-v3'
const EMBEDDING_CACHE_TTL = 3600 // 1 hour

type ProviderEmbeddingPayload = {
  data?: Array<{ embedding?: unknown; index?: number }>
  embedding?: unknown
  embeddings?: unknown
  vector?: unknown
  vectors?: unknown
}

// ── Text Chunking ────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks for embedding.
 * Uses sentence-aware splitting to avoid breaking mid-sentence.
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (!text || text.trim().length === 0) return []
  if (text.length <= chunkSize) return [text.trim()]

  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/)
      const overlapWords = words.slice(-Math.ceil(overlap / 5))
      currentChunk = overlapWords.join(' ') + ' ' + sentence
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

// ── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate embeddings for text using the approved Qwen API.
 * Caches results in Redis to avoid redundant API calls.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Check cache first
  const cacheKey = `emb:${Buffer.from(text.slice(0, 200)).toString('base64').slice(0, 40)}`
  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as number[]
    } catch { /* cache miss */ }
  }

  const [embedding] = await generateEmbeddings([text])
  if (!embedding) return null
  await cacheSet(cacheKey, JSON.stringify(embedding), EMBEDDING_CACHE_TTL)
  return embedding
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const result = await executeCapability({
      input: texts.length === 1 ? texts[0] : `Generate embeddings for ${texts.length} RAG chunks.`,
      capability: 'embeddings',
      saveArtifact: false,
      metadata: {
        input: texts.map((text) => text.slice(0, 8000)),
        embeddingPurpose: 'rag_pipeline',
      },
    })
    if (!result.success || !result.output) return texts.map(() => null)
    return normalizeEmbeddingResponse(result.output, texts.length)
  } catch {
    return texts.map(() => null)
  }
}

export function normalizeEmbeddingResponse(output: unknown, expectedCount = 1): (number[] | null)[] {
  const payload = parseEmbeddingPayload(output)
  const empty = (): (number[] | null)[] => Array.from({ length: expectedCount }, () => null)
  if (!payload) return empty()

  const data = Array.isArray(payload.data) ? payload.data : null
  if (data) {
    const results = empty()
    for (const [position, item] of data.entries()) {
      const index = Number.isInteger(item.index) ? item.index! : position
      if (index >= 0 && index < results.length) {
        results[index] = numericVector(item.embedding)
      }
    }
    return results
  }

  const vectors = payload.embeddings ?? payload.vectors
  if (Array.isArray(vectors) && vectors.every(Array.isArray)) {
    return empty().map((_, index) => numericVector(vectors[index]))
  }

  const single = numericVector(payload.embedding ?? payload.vector ?? output)
  if (!single) return empty()
  return [single, ...Array.from({ length: Math.max(0, expectedCount - 1) }, () => null)]
}

function parseEmbeddingPayload(output: unknown): ProviderEmbeddingPayload | null {
  if (typeof output === 'string') {
    try {
      return JSON.parse(output) as ProviderEmbeddingPayload
    } catch {
      return null
    }
  }
  if (output && typeof output === 'object') return output as ProviderEmbeddingPayload
  return null
}

function numericVector(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null
  const vector = value.map((entry) => typeof entry === 'number' ? entry : Number(entry))
  return vector.length > 0 && vector.every(Number.isFinite) ? vector : null
}

// ── Document Ingestion ───────────────────────────────────────────────────────

/**
 * Ingest a document: chunk → embed → store in vector DB.
 */
export async function ingestDocument(doc: Document): Promise<IngestResult> {
  const _start = Date.now()

  try {
    // Chunk the document
    const textChunks = chunkText(doc.content)
    if (textChunks.length === 0) {
      return { documentId: doc.id, chunksCreated: 0, embeddingsGenerated: 0, vectorIds: [], collection: 'amarktai_memory', success: true }
    }

    // Generate embeddings in batch
    const embeddings = await generateEmbeddings(textChunks)
    const validPairs: Array<{ chunk: string; embedding: number[]; index: number }> = []
    for (let i = 0; i < textChunks.length; i++) {
      if (embeddings[i]) {
        validPairs.push({ chunk: textChunks[i], embedding: embeddings[i]!, index: i })
      }
    }

    if (validPairs.length === 0) {
      return {
        documentId: doc.id,
        chunksCreated: textChunks.length,
        embeddingsGenerated: 0,
        vectorIds: [],
        collection: 'amarktai_memory',
        success: false,
        error: 'Failed to generate any embeddings',
      }
    }

    const collectionReady = await ensureCollection('amarktai_memory', validPairs[0].embedding.length)
    if (!collectionReady) {
      return {
        documentId: doc.id,
        chunksCreated: textChunks.length,
        embeddingsGenerated: validPairs.length,
        vectorIds: [],
        collection: 'amarktai_memory',
        success: false,
        error: 'Qdrant collection is not reachable or could not be prepared',
      }
    }

    // Store in vector DB
    const points = validPairs.map((p) => ({
      id: randomUUID(),
      vector: p.embedding,
      payload: {
        documentId: doc.id,
        content: p.chunk,
        chunkIndex: p.index,
        source: doc.source,
        namespace: doc.namespace,
        ...doc.metadata,
        ingestedAt: new Date().toISOString(),
      },
    }))

    const stored = await upsertVectors(points)
    if (!stored) {
      return {
        documentId: doc.id,
        chunksCreated: textChunks.length,
        embeddingsGenerated: validPairs.length,
        vectorIds: points.map((point) => point.id),
        collection: 'amarktai_memory',
        success: false,
        error: 'Qdrant vector upsert failed',
      }
    }

    return {
      documentId: doc.id,
      chunksCreated: textChunks.length,
      embeddingsGenerated: validPairs.length,
      vectorIds: points.map((point) => point.id),
      collection: 'amarktai_memory',
      success: true,
    }
  } catch (err) {
    return {
      documentId: doc.id,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      vectorIds: [],
      collection: 'amarktai_memory',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown ingestion error',
    }
  }
}

// ── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Retrieve relevant context for a query from the vector store.
 */
export async function retrieve(
  query: string,
  namespace?: string,
  topK: number = DEFAULT_TOP_K,
): Promise<RAGContext> {
  const start = Date.now()

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)
  if (!queryEmbedding) {
    return {
      query,
      results: [],
      contextWindow: '',
      totalChunksSearched: 0,
      latencyMs: Date.now() - start,
    }
  }

  // Search vector store
  const searchResults = await searchVectors(queryEmbedding, topK * 2) // Fetch more for namespace filtering

  // Filter by namespace if specified
  let filtered = searchResults
  if (namespace) {
    filtered = searchResults.filter((r) => r.payload?.namespace === namespace)
  }

  // Take top K
  const topResults = filtered.slice(0, topK)

  // Map to retrieval results
  const results: RetrievalResult[] = topResults.map((r) => ({
    vectorId: String(r.id),
    content: String(r.payload?.content ?? ''),
    score: r.score,
    documentId: String(r.payload?.documentId ?? ''),
    source: String(r.payload?.source ?? ''),
    chunkIndex: Number(r.payload?.chunkIndex ?? 0),
    metadata: (r.payload ?? {}) as Record<string, unknown>,
  }))

  // Build context window
  const contextWindow = results
    .map((r, i) => `[Source ${i + 1}: ${r.source} (relevance: ${(r.score * 100).toFixed(1)}%)]\n${r.content}`)
    .join('\n\n---\n\n')

  return {
    query,
    results,
    contextWindow,
    totalChunksSearched: searchResults.length,
    latencyMs: Date.now() - start,
  }
}

/**
 * Build a RAG-augmented prompt by injecting retrieved context.
 */
export function buildRAGPrompt(
  userQuery: string,
  context: RAGContext,
  systemPrompt?: string,
): string {
  if (context.results.length === 0) {
    return userQuery
  }

  const ragPrefix = systemPrompt
    ? `${systemPrompt}\n\n`
    : ''

  return `${ragPrefix}Use the following context to answer the user's question. If the context doesn't contain relevant information, say so honestly.\n\n--- Retrieved Context ---\n${context.contextWindow}\n--- End Context ---\n\nUser Question: ${userQuery}`
}

// ── Health Check ─────────────────────────────────────────────────────────────

export interface RAGHealthStatus {
  vectorStoreHealthy: boolean
  embeddingAvailable: boolean
  ready: boolean
}

export async function getRAGHealth(): Promise<RAGHealthStatus> {
  const vectorStoreHealthy = await isQdrantHealthy()
  const embeddingAvailable = !!(await getVaultApiKey('qwen'))
  return {
    vectorStoreHealthy,
    embeddingAvailable,
    ready: vectorStoreHealthy && embeddingAvailable,
  }
}

// ── Constants for testing ────────────────────────────────────────────────────
export const RAG_CHUNK_SIZE = DEFAULT_CHUNK_SIZE
export const RAG_CHUNK_OVERLAP = DEFAULT_CHUNK_OVERLAP
export const RAG_TOP_K = DEFAULT_TOP_K
export const RAG_EMBEDDING_MODEL = EMBEDDING_MODEL
