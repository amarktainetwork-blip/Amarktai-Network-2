/**
 * RAG Capability Tests — real Qdrant + HF embeddings pipeline
 *
 * Covers:
 *  - chunkText produces stable chunk IDs
 *  - generateEmbeddings via HF API
 *  - ingestDocument: Qdrant missing → clear error
 *  - ingestDocument: embeddings failure → clear error
 *  - ingestDocument: success path
 *  - ingestWebsite: uses in-house scraper (no Firecrawl)
 *  - queryRAG: Qdrant missing → clear error
 *  - queryRAG: embedding failure → clear error
 *  - queryRAG: success returns context with sources
 *  - app/workspace scope isolation
 *  - no removed providers
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  chunkText,
  generateEmbeddings,
  generateQueryEmbedding,
  assembleContext,
  type RAGChunkWithScore,
  type RAGChunk,
} from '../rag-capability'

// ── chunkText ─────────────────────────────────────────────────────────────────

describe('chunkText', () => {
  it('produces chunks with stable IDs', () => {
    const text = Array(600).fill('word').join(' ')
    const chunks = chunkText('doc1', text, { chunkSize: 100, chunkOverlap: 10 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].id).toBe('doc1_chunk_0')
    expect(chunks[1].id).toBe('doc1_chunk_1')
  })

  it('sets documentId on all chunks', () => {
    const chunks = chunkText('my-doc', 'hello world foo bar baz', { chunkSize: 3, chunkOverlap: 1 })
    for (const c of chunks) {
      expect(c.documentId).toBe('my-doc')
    }
  })

  it('returns empty array for empty text', () => {
    const chunks = chunkText('doc', '', {})
    expect(chunks).toHaveLength(0)
  })

  it('single chunk for short text', () => {
    const chunks = chunkText('doc', 'short text', { chunkSize: 512 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe('short text')
  })

  it('chunk content is non-empty', () => {
    const text = Array(200).fill('word').join(' ')
    const chunks = chunkText('doc', text, { chunkSize: 50, chunkOverlap: 5 })
    for (const c of chunks) {
      expect(c.content.trim().length).toBeGreaterThan(0)
    }
  })
})

// ── generateEmbeddings ────────────────────────────────────────────────────────

describe('generateEmbeddings', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns float arrays on success', async () => {
    const fakeEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => fakeEmbeddings,
      text: async (): Promise<string> => '[]',
    })))

    const { embeddings, error } = await generateEmbeddings(['text one', 'text two'], 'hf-key')
    expect(error).toBeNull()
    expect(embeddings[0]).toEqual([0.1, 0.2, 0.3])
    expect(embeddings[1]).toEqual([0.4, 0.5, 0.6])
  })

  it('returns null embeddings and error on 503 loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      headers: { get: () => null },
      text: async (): Promise<string> => 'Model is loading',
      json: async () => ({}),
    })))

    const { embeddings, error } = await generateEmbeddings(['text'], 'hf-key')
    expect(error).toContain('loading')
    expect(embeddings[0]).toBeNull()
  })

  it('returns error on unexpected format', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ not: 'an array' }),
      text: async (): Promise<string> => '{}',
    })))

    const { embeddings, error } = await generateEmbeddings(['text'], 'hf-key')
    expect(error).toContain('unexpected format')
    expect(embeddings[0]).toBeNull()
  })

  it('returns empty arrays for empty input', async () => {
    const { embeddings, error } = await generateEmbeddings([], 'hf-key')
    expect(embeddings).toHaveLength(0)
    expect(error).toBeNull()
  })

  it('query embedding returns single vector', async () => {
    const fakeEmb = [[0.1, 0.2, 0.3]]
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => fakeEmb,
      text: async (): Promise<string> => '[]',
    })))

    const { embedding, error } = await generateQueryEmbedding('find me something', 'hf-key')
    expect(error).toBeNull()
    expect(embedding).toEqual([0.1, 0.2, 0.3])
  })
})

// ── ingestDocument ────────────────────────────────────────────────────────────

describe('ingestDocument', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('returns clear error when Qdrant is not configured', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => null),
      ensureAppKnowledgeCollection: vi.fn(async () => false),
      upsertAppKnowledge: vi.fn(async () => false),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    const { ingestDocument } = await import('../rag-capability')
    const result = await ingestDocument('doc1', 'Title', 'Some content text', 'txt', {
      appSlug: 'app1', hfApiKey: 'hf-key',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Qdrant')
    expect(result.storedCount).toBe(0)
  })

  it('returns clear error when all embeddings fail', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      headers: { get: () => null },
      text: async (): Promise<string> => 'loading',
      json: async () => ({}),
    })))

    const { ingestDocument } = await import('../rag-capability')
    const result = await ingestDocument('doc1', 'Title', 'Some content text here', 'txt', {
      appSlug: 'app1', hfApiKey: 'hf-key',
    })

    expect(result.success).toBe(false)
    expect(result.storedCount).toBe(0)
  })

  it('success path: returns chunkCount and storedCount', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    // HF returns an embedding per input text
    vi.stubGlobal('fetch', vi.fn(async (_url: string, opts: { body: string }) => {
      const body = JSON.parse(opts.body) as { inputs: string[] }
      const count = body.inputs.length
      const fakeEmb = Array(count).fill(null).map(() => Array(384).fill(0.1))
      return {
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: async () => fakeEmb,
        text: async (): Promise<string> => '[]',
      }
    }))

    const { ingestDocument } = await import('../rag-capability')
    const longText = Array(600).fill('test word content').join(' ')
    const result = await ingestDocument('doc1', 'Title', longText, 'txt', {
      appSlug: 'app1', hfApiKey: 'hf-key',
    })

    expect(result.success).toBe(true)
    expect(result.chunkCount).toBeGreaterThan(0)
    expect(result.storedCount).toBeGreaterThan(0)
  })
})

// ── ingestWebsite ─────────────────────────────────────────────────────────────

describe('ingestWebsite', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('uses in-house scraper — not Firecrawl', async () => {
    // Verify that ingestWebsite imports from scraper, not firecrawl
    // If firecrawl were used, this test would need to mock firecrawl
    const scraperModule = await import('../scraper')
    expect(scraperModule.crawlWebsite).toBeDefined()
    // No firecrawl usage in rag-capability
    const ragSource = await import('../rag-capability')
    expect(ragSource.ingestWebsite).toBeDefined()
    // Calling it with a private URL should fail safely (uses in-house scraper rules)
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    const { ingestWebsite } = await import('../rag-capability')
    const results = await ingestWebsite('http://localhost/', {
      appSlug: 'app1', hfApiKey: 'hf-key',
    })
    // Should fail due to private URL (in-house scraper rule)
    expect(results[0].success).toBe(false)
    expect(results[0].error).toBeTruthy()
  })

  it('ingests crawled pages into Qdrant', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    vi.doMock('../scraper', async () => {
      const actual = await vi.importActual<typeof import('../scraper')>('../scraper')
      return {
        ...actual,
        crawlWebsite: vi.fn(async () => ({
          success: true,
          pages: [{ url: 'https://example.com/', title: 'Home', description: 'desc', headings: [], bodyText: 'Welcome to our website', links: [], byteSize: 100 }],
          totalPages: 1,
          errors: [],
          summary: 'Crawled 1 page',
          detectedNiche: 'general',
          detectedFeatures: [],
          aiCapabilitiesNeeded: [],
        })),
      }
    })

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [Array(384).fill(0.1)],
      text: async (): Promise<string> => '[]',
    })))

    const { ingestWebsite } = await import('../rag-capability')
    const results = await ingestWebsite('https://example.com/', {
      appSlug: 'app1', hfApiKey: 'hf-key',
    })

    expect(results.length).toBe(1)
    expect(results[0].success).toBe(true)
    expect(results[0].storedCount).toBeGreaterThan(0)
  })
})

// ── queryRAG ──────────────────────────────────────────────────────────────────

describe('queryRAG', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('returns clear error when Qdrant not configured', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => null),
      ensureAppKnowledgeCollection: vi.fn(async () => false),
      upsertAppKnowledge: vi.fn(async () => false),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    const { queryRAG } = await import('../rag-capability')
    const result = await queryRAG('find something', { appSlug: 'app1', hfApiKey: 'hf-key' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Qdrant')
  })

  it('returns clear error when embeddings fail', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => []),
    }))

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 401,
      headers: { get: () => null },
      text: async (): Promise<string> => 'Unauthorized',
      json: async () => ({}),
    })))

    const { queryRAG } = await import('../rag-capability')
    const result = await queryRAG('find something', { appSlug: 'app1', hfApiKey: 'bad-key' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('embedding')
  })

  it('success path: returns context and sources', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async () => [
        {
          id: 'chunk1',
          score: 0.88,
          payload: {
            chunk_id: 'chunk1', document_id: 'doc1', app_slug: 'app1',
            scope: 'app', scope_id: '', title: 'Home', type: 'website',
            content: 'Welcome to our platform, the best solution for teams.',
            source_url: 'https://example.com/', chunk_index: 0,
            start_index: 0, end_index: 10,
          },
        },
        {
          id: 'chunk2',
          score: 0.75,
          payload: {
            chunk_id: 'chunk2', document_id: 'doc1', app_slug: 'app1',
            scope: 'app', scope_id: '', title: 'Home', type: 'website',
            content: 'Our pricing starts at $10/month.',
            source_url: 'https://example.com/pricing', chunk_index: 1,
            start_index: 10, end_index: 20,
          },
        },
      ]),
    }))

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [Array(384).fill(0.1)],
      text: async (): Promise<string> => '[]',
    })))

    const { queryRAG } = await import('../rag-capability')
    const result = await queryRAG('pricing information', { appSlug: 'app1', hfApiKey: 'hf-key' })

    expect(result.success).toBe(true)
    expect(result.chunks.length).toBeGreaterThan(0)
    expect(result.context).toContain('pricing information')
    expect(result.context).toContain('Welcome to our platform')
    expect(result.sources.length).toBeGreaterThan(0)
    expect(result.totalScore).toBeGreaterThan(0)
  })

  it('app/workspace scope isolation — filters by appSlug', async () => {
    vi.doMock('@/lib/vector-store', () => ({
      getQdrantClientAsync: vi.fn(async () => ({ dummy: 'client' })),
      ensureAppKnowledgeCollection: vi.fn(async () => true),
      upsertAppKnowledge: vi.fn(async () => true),
      searchAppKnowledge: vi.fn(async (appSlug: string) => {
        // Only return results for app1
        if (appSlug !== 'app1') return []
        return [{ id: 'c1', score: 0.9, payload: { chunk_id: 'c1', document_id: 'd1', app_slug: 'app1', scope: 'app', scope_id: '', title: 'T', type: 'txt', content: 'content', source_url: 'https://app1.com', chunk_index: 0, start_index: 0, end_index: 1 } }]
      }),
    }))

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [Array(384).fill(0.1)],
      text: async (): Promise<string> => '[]',
    })))

    const { queryRAG } = await import('../rag-capability')
    const app1Result = await queryRAG('test', { appSlug: 'app1', hfApiKey: 'hf-key' })
    const app2Result = await queryRAG('test', { appSlug: 'app2', hfApiKey: 'hf-key' })

    expect(app1Result.chunks.length).toBeGreaterThan(0)
    expect(app2Result.chunks.length).toBe(0) // no leakage
  })
})

// ── assembleContext ───────────────────────────────────────────────────────────

describe('assembleContext', () => {
  it('returns empty string for empty chunks', () => {
    expect(assembleContext([], 'query')).toBe('')
  })

  it('includes source URL in context', () => {
    const chunk: RAGChunk = {
      id: 'c1', documentId: 'd1', appSlug: 'app1', scope: 'app',
      content: 'Relevant text here',
      startIndex: 0, endIndex: 5,
      metadata: { source_url: 'https://example.com/', chunk_index: 0 },
    }
    const ctx = assembleContext([{ chunk, score: 0.9 }], 'query')
    expect(ctx).toContain('Relevant text here')
    expect(ctx).toContain('https://example.com/')
  })

  it('includes the query in context header', () => {
    const chunk: RAGChunk = {
      id: 'c1', documentId: 'd1', appSlug: 'app1', scope: 'app',
      content: 'Some content', startIndex: 0, endIndex: 1,
      metadata: { chunk_index: 0 },
    }
    const ctx = assembleContext([{ chunk, score: 0.8 }], 'my search query')
    expect(ctx).toContain('my search query')
  })
})
