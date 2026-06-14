import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  V1_CAPABILITY_MATRIX,
  getCapabilityDefinition,
} from '@/lib/brain/v1-capability-matrix'
import { detectArtifactContent } from '@/lib/artifact-store'

const mocks = vi.hoisted(() => ({
  createArtifact: vi.fn(),
}))

vi.mock('@/lib/artifact-store', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/artifact-store')>(),
  createArtifact: mocks.createArtifact,
}))
vi.mock('@/lib/content-filter', () => ({
  getAppSafetyConfig: vi.fn().mockReturnValue({
    safeMode: true,
    adultMode: false,
    suggestiveMode: false,
  }),
  loadAppSafetyConfigFromDB: vi.fn(),
  scanContent: vi.fn().mockReturnValue({ flagged: false, message: '' }),
}))
vi.mock('@/lib/firecrawl', () => ({ crawlAppWebsite: vi.fn() }))

import { executeCapabilityOrchestration } from '@/lib/orchestrator'

describe('canonical V1 brain capability router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createArtifact.mockResolvedValue({
      id: 'artifact-blueprint',
      downloadUrl: '/api/admin/artifacts/artifact-blueprint/download',
      storageUrl: '/api/artifacts/file/blueprint.json',
    })
  })

  it('owns all 62 capabilities and never marks a route ready without an adapter', () => {
    expect(V1_CAPABILITY_MATRIX).toHaveLength(62)
    for (const capability of V1_CAPABILITY_MATRIX) {
      if (capability.readiness === 'ready' || capability.readiness === 'ready_with_fallback') {
        expect(capability.adapterImplemented, capability.id).toBe(true)
        expect(capability.providerRoutes.some((route) => route.executable), capability.id).toBe(true)
      }
    }
  })

  it('keeps GenX from being a single point of failure for core text and image routes', () => {
    for (const id of ['chat', 'text_generation', 'research', 'campaign_generation', 'brand_aware_content_generation', 'text_to_image']) {
      const capability = getCapabilityDefinition(id)!
      const executable = capability.providerRoutes.filter((route) => route.executable).map((route) => route.provider)
      expect(executable.some((provider) => provider !== 'genx'), id).toBe(true)
      expect(executable.length, id).toBeGreaterThan(1)
    }
  })

  it('keeps text-to-video off image-to-video models and requires an image for image-to-video', async () => {
    const textToVideo = getCapabilityDefinition('text_to_video')!
    const qwen = textToVideo.providerRoutes.find((route) => route.provider === 'qwen')!
    expect(qwen.modelIds).toContain('wan2.1-t2v-turbo')
    expect(qwen.modelIds.some((model) => /i2v/i.test(model))).toBe(false)

    const result = await executeCapabilityOrchestration({
      input: 'Animate this product image.',
      capability: 'image_to_video',
    })
    expect(result).toMatchObject({
      success: false,
      readiness: 'NEEDS_INPUT',
    })
    expect(result.providerAttempts).toEqual([])
  })

  it('returns needs_input for image edit before selecting a provider', async () => {
    const result = await executeCapabilityOrchestration({
      input: 'Increase contrast.',
      capability: 'image_edit',
    })
    expect(result).toMatchObject({
      success: false,
      readiness: 'NEEDS_INPUT',
    })
  })

  it('routes music to real audio adapters without a completed blueprint fallback', () => {
    expect(getCapabilityDefinition('music_generation')).toMatchObject({
      status: 'working',
      readiness: 'ready_with_fallback',
      adapterImplemented: true,
      executableEndpoint: '/api/admin/music-studio',
      createsArtifact: true,
    })
    expect(fs.readFileSync(path.join(process.cwd(), 'src/lib/orchestrator.ts'), 'utf8'))
      .not.toContain('createPlanningFallback')
  })

  it('detects real media bytes and unwraps JSON base64 instead of saving image JSON', () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    expect(detectArtifactContent(png, 'application/json')).toMatchObject({
      mimeType: 'image/png',
      extension: 'png',
    })
    const wrapped = Buffer.from(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }))
    const detected = detectArtifactContent(wrapped, 'application/json')
    expect(detected.mimeType).toBe('image/png')
    expect(detected.extension).toBe('png')
    expect(detected.content.equals(png)).toBe(true)
  })

  it('makes Studio, models, media models, providers, and truth APIs consume canonical brain truth', () => {
    const root = process.cwd()
    const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')
    expect(read('src/app/admin/dashboard/studio/page.tsx')).toContain('/api/admin/system/v1-brain-route-matrix')
    expect(read('src/app/api/admin/models/route.ts')).toContain('getV1BrainRouteMatrix')
    expect(read('src/app/api/admin/media-studio/models/route.ts')).toContain('getV1BrainRouteMatrix')
    expect(read('src/app/api/admin/providers/route.ts')).toContain('PROVIDER_REGISTRY')
    expect(read('src/app/api/admin/system/ai-capabilities-truth/route.ts')).toContain('getV1BrainRouteMatrix')
    expect(read('src/lib/media-capability-registry.ts')).toContain("from '@/lib/brain/v1-capability-matrix'")
  })
})
