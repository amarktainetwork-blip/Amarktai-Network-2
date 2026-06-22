import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  executeCapability: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  ensureCollection: vi.fn(),
  upsertVectors: vi.fn(),
  searchVectors: vi.fn(),
  isQdrantHealthy: vi.fn(),
  getVaultApiKey: vi.fn(),
}))

vi.mock('@/lib/capability-router', () => ({
  executeCapability: mocks.executeCapability,
}))

vi.mock('@/lib/redis', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
}))

vi.mock('@/lib/vector-store', () => ({
  ensureCollection: mocks.ensureCollection,
  upsertVectors: mocks.upsertVectors,
  searchVectors: mocks.searchVectors,
  isQdrantHealthy: mocks.isQdrantHealthy,
}))

vi.mock('@/lib/brain', () => ({
  getVaultApiKey: mocks.getVaultApiKey,
}))

describe('RAG pipeline embedding and vector truth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheGet.mockResolvedValue(null)
    mocks.cacheSet.mockResolvedValue(undefined)
    mocks.ensureCollection.mockResolvedValue(true)
    mocks.upsertVectors.mockResolvedValue(true)
    mocks.searchVectors.mockResolvedValue([])
    mocks.isQdrantHealthy.mockResolvedValue(true)
    mocks.getVaultApiKey.mockResolvedValue('configured')
  })

  it('normalizes provider embedding response payloads into numeric vectors', async () => {
    const { normalizeEmbeddingResponse } = await import('@/lib/rag-pipeline')

    expect(normalizeEmbeddingResponse(JSON.stringify({
      data: [
        { index: 0, embedding: [0.1, '0.2', 0.3] },
        { index: 1, embedding: [0.4, 0.5, 0.6] },
      ],
    }), 2)).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ])
    expect(normalizeEmbeddingResponse({ embedding: [1, 2, 3] }, 1)).toEqual([[1, 2, 3]])
    expect(normalizeEmbeddingResponse({ data: [{ embedding: [] }] }, 1)).toEqual([null])
  })

  it('uses the Brain embeddings capability and writes non-empty vectors to Qdrant', async () => {
    mocks.executeCapability.mockResolvedValue({
      success: true,
      output: JSON.stringify({
        data: [
          { index: 0, embedding: [0.1, 0.2, 0.3] },
          { index: 1, embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    })

    const { ingestDocument } = await import('@/lib/rag-pipeline')
    const result = await ingestDocument({
      id: 'doc-1',
      content: 'First sentence. Second sentence.',
      source: 'https://example.com',
      namespace: 'app',
      metadata: { title: 'Example' },
    })

    expect(mocks.executeCapability).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'embeddings',
      saveArtifact: false,
      metadata: expect.objectContaining({
        embeddingPurpose: 'rag_pipeline',
      }),
    }))
    expect(mocks.ensureCollection).toHaveBeenCalledWith('amarktai_memory', 3)
    expect(mocks.upsertVectors).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        vector: [0.1, 0.2, 0.3],
        payload: expect.objectContaining({
          documentId: 'doc-1',
          namespace: 'app',
        }),
      }),
    ]))
    expect(result).toMatchObject({
      success: true,
      documentId: 'doc-1',
      embeddingsGenerated: 1,
      collection: 'amarktai_memory',
    })
    expect(result.vectorIds).toHaveLength(1)
  })

  it('fails truthfully when the Brain embeddings capability returns no vector', async () => {
    mocks.executeCapability.mockResolvedValue({
      success: true,
      output: JSON.stringify({ data: [{ index: 0, embedding: [] }] }),
    })

    const { ingestDocument } = await import('@/lib/rag-pipeline')
    const result = await ingestDocument({
      id: 'doc-1',
      content: 'Example content.',
      source: 'https://example.com',
      namespace: 'app',
      metadata: {},
    })

    expect(result).toMatchObject({
      success: false,
      embeddingsGenerated: 0,
      vectorIds: [],
      error: 'Failed to generate any embeddings',
    })
    expect(mocks.upsertVectors).not.toHaveBeenCalled()
  })
})
