import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createArtifact: vi.fn(),
  getMeshCredential: vi.fn(),
}))

vi.mock('@/lib/artifact-store', () => ({
  createArtifact: mocks.createArtifact,
}))

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: mocks.getMeshCredential,
}))

import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'

function artifact(overrides: Record<string, unknown>) {
  return {
    id: 'artifact-1',
    appSlug: 'amarktai-network',
    type: 'image',
    subType: 'studio_image',
    title: 'Studio image',
    description: '',
    provider: 'genx',
    model: 'gpt-image-2',
    traceId: 'trace-1',
    storageDriver: 'local_vps',
    storagePath: 'artifacts/amarktai-network/image/1.png',
    storageUrl: '/api/artifacts/file/artifacts/amarktai-network/image/1.png',
    mimeType: 'image/png',
    fileSizeBytes: 4,
    previewable: true,
    downloadable: true,
    status: 'completed',
    errorMessage: '',
    costUsdCents: 0,
    metadata: {},
    createdAt: new Date('2026-06-28T00:00:00.000Z'),
    updatedAt: new Date('2026-06-28T00:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  mocks.createArtifact.mockReset()
  mocks.getMeshCredential.mockReset()
  mocks.getMeshCredential.mockResolvedValue('redacted-test-key')
  vi.stubGlobal('fetch', vi.fn())
})

describe('canonical media artifact ingestion', () => {
  it('fetches a completed image provider URL and saves bytes into platform artifact storage', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }))
    mocks.createArtifact.mockResolvedValue(artifact({}))

    const saved = await persistCanonicalMediaResult({
      result: { resultUrl: 'https://query.genx.sh/api/v1/jobs/image-job/file', providerJobId: 'image-job' },
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'studio_image',
      title: 'Image',
      provider: 'genx',
      model: 'gpt-image-2',
      metadata: { capability: 'image_generation', localJobId: 'local-image-job' },
    })

    expect(saved.storageUrl).toBe('/api/artifacts/file/artifacts/amarktai-network/image/1.png')
    expect(saved.mediaUrl).toBe('/api/artifacts/file/artifacts/amarktai-network/image/1.png')
    expect(fetch).toHaveBeenCalledWith('https://query.genx.sh/api/v1/jobs/image-job/file', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }))
    const createInput = mocks.createArtifact.mock.calls[0][0]
    expect(createInput).toEqual(expect.objectContaining({
      content: expect.any(Buffer),
      mimeType: 'image/png',
      metadata: expect.objectContaining({
        capability: 'image_generation',
        providerJobId: 'image-job',
        originalProviderUrl: 'https://query.genx.sh/api/v1/jobs/image-job/file',
        ingestedProviderBytes: true,
        ingestedProviderSizeBytes: 4,
      }),
    }))
    expect(createInput).not.toHaveProperty('contentUrl')
    expect(createInput).not.toHaveProperty('allowRemoteReference')
  })

  it('fetches completed music provider audio and saves a playable platform artifact URL', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([9, 8, 7]), {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    }))
    mocks.createArtifact.mockResolvedValue(artifact({
      id: 'song-artifact',
      type: 'music',
      subType: 'generated_audio',
      storagePath: 'artifacts/amarktai-network/music/1.mpeg',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/1.mpeg',
      mimeType: 'audio/mpeg',
      fileSizeBytes: 3,
    }))

    const saved = await persistCanonicalMediaResult({
      result: { resultUrl: 'https://query.genx.sh/api/v1/jobs/song-job/file', providerJobId: 'song-job' },
      appSlug: 'amarktai-network',
      type: 'music',
      subType: 'generated_audio',
      title: 'Song',
      provider: 'genx',
      model: 'lyria-3-clip-preview',
      metadata: { capability: 'music_generation', genres: ['cinematic', 'pop'] },
    })

    expect(saved.storageUrl).toBe('/api/artifacts/file/artifacts/amarktai-network/music/1.mpeg')
    expect(mocks.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'music',
      content: expect.any(Buffer),
      mimeType: 'audio/mpeg',
      metadata: expect.objectContaining({
        capability: 'music_generation',
        originalProviderUrl: 'https://query.genx.sh/api/v1/jobs/song-job/file',
      }),
    }))
  })

  it('rejects non-audio music provider files with an explicit blocker source', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not audio', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))

    await expect(persistCanonicalMediaResult({
      result: { resultUrl: 'https://query.genx.sh/api/v1/jobs/song-job/file', providerJobId: 'song-job' },
      appSlug: 'amarktai-network',
      type: 'music',
      subType: 'generated_audio',
      title: 'Song',
      provider: 'genx',
      model: 'lyria-3-clip-preview',
    })).rejects.toThrow('provider returned text/html; expected audio media')
  })
})
