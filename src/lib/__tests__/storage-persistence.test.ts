import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integrationConfig: {
      findUnique: vi.fn(async () => null),
    },
    aiProvider: {
      findUnique: vi.fn(async () => null),
    },
    artifact: {
      create: vi.fn(async ({ data }) => ({
        id: 'artifact_test',
        ...data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
      update: vi.fn(async ({ data }) => ({
        id: 'artifact_test',
        appSlug: 'test-app',
        type: 'document',
        subType: '',
        title: '',
        description: '',
        provider: '',
        model: '',
        traceId: '',
        storageDriver: 'local_vps',
        storagePath: '',
        storageUrl: '',
        mimeType: 'text/plain',
        fileSizeBytes: 0,
        previewable: true,
        downloadable: true,
        status: data.status ?? 'completed',
        errorMessage: data.errorMessage ?? '',
        costUsdCents: 0,
        metadata: data.metadata ?? '{}',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
    },
  },
}))

vi.mock('@/lib/event-bus', () => ({
  emitSystemEvent: vi.fn(),
}))

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: vi.fn(async (id: string) => id === 'genx' ? 'genx-test-key' : null),
}))

const originalEnv = { ...process.env }

async function makeTempStorageRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'amarktai-storage-'))
}

afterEach(async () => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('VPS storage persistence policy', () => {
  it('uses local_vps and the required storage root by default', async () => {
    delete process.env.STORAGE_DRIVER
    delete process.env.AMARKTAI_STORAGE_ROOT
    delete process.env.STORAGE_ROOT
    vi.resetModules()

    const { getStorageStatus } = await import('@/lib/storage-driver')
    const status = getStorageStatus()

    expect(status.driver).toBe('local_vps')
    expect(status.basePath).toBe('/var/www/amarktai/storage')
    expect(status.persistent).toBe(true)
    expect(status.requiredDirectories).toEqual(['artifacts', 'uploads', 'repos', 'workspaces', 'logs'])
  })

  it('creates required directories and verifies write access', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { verifyStorage } = await import('@/lib/storage-driver')
    const health = await verifyStorage()

    expect(health.configured).toBe(true)
    expect(health.ready).toBe(true)
    expect(health.root).toBe(process.env.AMARKTAI_STORAGE_ROOT)
    expect(health.writable).toBe(true)
    expect(health.readable).toBe(true)
    expect(health.deletable).toBe(true)
    expect(health.checkedAt).toBeTruthy()
    expect(health.directories.map((dir) => dir.name)).toEqual(['artifacts', 'uploads', 'repos', 'workspaces', 'logs'])
    expect(health.directories.every((dir) => dir.exists && dir.writable && dir.readable && dir.deletable)).toBe(true)
  })

  it('keeps concurrent storage verification probes isolated', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { REQUIRED_STORAGE_DIRS, verifyStorage } = await import('@/lib/storage-driver')
    const results = await Promise.all(
      Array.from({ length: 30 }, () => verifyStorage()),
    )

    expect(results.every((health) =>
      health.ready
      && health.readable
      && health.writable
      && health.deletable
      && health.error === null
      && health.directories.every((directory) => directory.error === null),
    )).toBe(true)

    for (const directory of REQUIRED_STORAGE_DIRS) {
      const files = await fs.readdir(path.join(process.env.AMARKTAI_STORAGE_ROOT, directory))
      expect(files.some((file) => file.startsWith('.amarktai-write-test-'))).toBe(false)
    }
  })

  it('returns a structured not-ready result for an invalid storage root', async () => {
    const invalidRoot = path.join(await makeTempStorageRoot(), 'not-a-directory')
    await fs.writeFile(invalidRoot, 'file')
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = invalidRoot
    vi.resetModules()

    const { verifyStorage } = await import('@/lib/storage-driver')
    const health = await verifyStorage()

    expect(health).toMatchObject({
      ready: false,
      root: invalidRoot,
      writable: false,
      readable: false,
      deletable: false,
    })
    expect(health.checkedAt).toBeTruthy()
  })

  it('writes, reads, and deletes artifact files through local_vps storage', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { getStorageDriver } = await import('@/lib/storage-driver')
    const driver = getStorageDriver()
    const result = await driver.put('artifacts/test-app/document/test.txt', Buffer.from('persistent'), 'text/plain')

    expect(result.url).toBe('/api/artifacts/file/artifacts/test-app/document/test.txt')
    expect(await driver.exists(result.path)).toBe(true)
    expect((await driver.get(result.path))?.toString()).toBe('persistent')
    expect(await driver.delete(result.path)).toBe(true)
    expect(await driver.exists(result.path)).toBe(false)
  })

  it('blocks storage keys that escape the configured root', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { getStorageDriver } = await import('@/lib/storage-driver')
    const driver = getStorageDriver()

    await expect(
      driver.put('../outside.txt', Buffer.from('blocked'), 'text/plain'),
    ).rejects.toThrow('Path traversal detected')
  })

  it('createArtifact does not claim success until physical storage is verified', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { createArtifact } = await import('@/lib/artifact-store')
    const artifact = await createArtifact({
      appSlug: 'test-app',
      type: 'document',
      subType: 'storage-proof',
      content: Buffer.from('saved for restart'),
      mimeType: 'text/plain',
    })

    expect(artifact.storageDriver).toBe('local_vps')
    expect(artifact.storagePath).toMatch(/^artifacts\/test-app\/document\//)
    expect(artifact.storageUrl).toContain('/api/artifacts/file/artifacts/test-app/document/')
    expect(artifact.fileSizeBytes).toBe(Buffer.byteLength('saved for restart'))
  })

  it('stores a GenX completed media URL locally with provider authentication', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypmp42', 'ascii'),
      Buffer.from('local-video-bytes'),
    ])
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(mp4), {
      status: 200,
      headers: { 'content-type': 'video/mp4' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()

    const { createArtifact } = await import('@/lib/artifact-store')
    const artifact = await createArtifact({
      appSlug: 'test-app',
      type: 'video',
      subType: 'video_generation',
      provider: 'genx',
      model: 'grok-imagine-video',
      contentUrl: 'https://query.genx.sh/api/v1/jobs/job_123/file',
      mimeType: 'video/mp4',
      metadata: {
        remoteMediaUrl: 'https://query.genx.sh/api/v1/jobs/job_123/file',
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://query.genx.sh/api/v1/jobs/job_123/file',
      expect.objectContaining({
        headers: { Authorization: 'Bearer genx-test-key' },
      }),
    )
    expect(artifact.status).toBe('completed')
    expect(artifact.storageDriver).toBe('local_vps')
    expect(artifact.storagePath).toMatch(/^artifacts\/test-app\/video\//)
    expect(artifact.storageUrl).toMatch(/^\/api\/artifacts\/file\/artifacts\/test-app\/video\//)
    expect(artifact.fileSizeBytes).toBe(mp4.length)
  })

  it('rejects completed media remote references when provider fetch fails', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorized', { status: 401 })))
    vi.resetModules()

    const { createArtifact } = await import('@/lib/artifact-store')
    const { prisma } = await import('@/lib/prisma')
    const createCallsBefore = vi.mocked(prisma.artifact.create).mock.calls.length

    await expect(createArtifact({
      appSlug: 'test-app',
      type: 'video',
      subType: 'video_generation',
      provider: 'genx',
      model: 'grok-imagine-video',
      contentUrl: 'https://query.genx.sh/api/v1/jobs/job_401/file',
      allowRemoteReference: true,
      mimeType: 'video/mp4',
    })).rejects.toThrow('External artifact fetch failed with HTTP 401')
    expect(vi.mocked(prisma.artifact.create).mock.calls.slice(createCallsBefore).some((call) =>
      call[0].data.type === 'video' && call[0].data.status === 'completed',
    )).toBe(false)
  })

  it('requires completed image, audio, and video artifacts to have local bytes', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { createArtifact } = await import('@/lib/artifact-store')
    for (const [type, mimeType, bytes] of [
      ['image', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1])],
      ['audio', 'audio/mpeg', Buffer.from('ID3audio-bytes')],
      ['video', 'video/mp4', Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypmp42video')])],
    ] as const) {
      const artifact = await createArtifact({
        appSlug: 'test-app',
        type,
        subType: `${type}_proof`,
        content: bytes,
        mimeType,
      })
      expect(artifact.status).toBe('completed')
      expect(artifact.storagePath).toMatch(new RegExp(`^artifacts/test-app/${type}/`))
      expect(artifact.storageUrl).toMatch(new RegExp(`^/api/artifacts/file/artifacts/test-app/${type}/`))
      expect(artifact.fileSizeBytes).toBeGreaterThan(0)
    }
  })

  it('bounds long artifact descriptions and keeps full prompts out of DB description', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const longPrompt = `Generate a video. ${'cinematic '.repeat(600)}`
    const { createArtifact, ARTIFACT_PERSISTENCE_FIELD_LIMITS } = await import('@/lib/artifact-store')
    const { prisma } = await import('@/lib/prisma')

    await createArtifact({
      appSlug: 'test-app',
      type: 'video',
      subType: 'video_generation',
      title: longPrompt,
      description: longPrompt,
      provider: 'genx',
      model: 'veo-3.1',
      content: Buffer.from('video bytes'),
      mimeType: 'video/mp4',
      metadata: {
        prompt: longPrompt,
        providerResponse: { body: 'ok' },
      },
    })

    const call = vi.mocked(prisma.artifact.create).mock.calls.at(-1)![0]
    const title = String(call.data.title)
    const description = String(call.data.description)
    expect(title.length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.title)
    expect(description.length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.description)
    expect(description).not.toBe(longPrompt)
    expect(description).toContain('[truncated]')
    const metadata = JSON.parse(String(call.data.metadata))
    expect(metadata.prompt).not.toBe(longPrompt)
    expect(metadata.metadataTruncated).toBe(true)
  })

  it('bounds provider/model/error fields and sanitizes large provider metadata', async () => {
    process.env.STORAGE_DRIVER = 'local_vps'
    process.env.AMARKTAI_STORAGE_ROOT = await makeTempStorageRoot()
    vi.resetModules()

    const { createArtifact, ARTIFACT_PERSISTENCE_FIELD_LIMITS } = await import('@/lib/artifact-store')
    const { prisma } = await import('@/lib/prisma')
    const longValue = 'x'.repeat(5_000)

    await createArtifact({
      appSlug: 'test-app',
      type: 'document',
      status: 'failed',
      provider: `provider-${longValue}`,
      model: `model-${longValue}`,
      traceId: `trace-${longValue}`,
      errorMessage: `Provider returned ${longValue}`,
      metadata: {
        apiKey: 'sk-testsecret1234567890',
        providerResponse: { rawJson: longValue },
        videoBase64: 'a'.repeat(9_000),
      },
    })

    const call = vi.mocked(prisma.artifact.create).mock.calls.at(-1)![0]
    expect(String(call.data.provider).length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.provider)
    expect(String(call.data.model).length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.model)
    expect(String(call.data.traceId).length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.traceId)
    expect(String(call.data.errorMessage).length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.errorMessage)
    const metadata = JSON.parse(String(call.data.metadata))
    expect(metadata.apiKey).toBe('[redacted]')
    expect(metadata.providerResponse.rawJson.length).toBeLessThanOrEqual(ARTIFACT_PERSISTENCE_FIELD_LIMITS.metadataLargeValue)
    expect(metadata.videoBase64).toBe('[omitted: large media payload]')
    expect(metadata.metadataTruncated).toBe(true)
  })
})
