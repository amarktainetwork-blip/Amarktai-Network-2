import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const root = process.cwd()
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

vi.mock('@/lib/provider-mesh-status', () => ({
  getMeshCredential: vi.fn(),
  getMeshTestNotes: vi.fn(),
}))

vi.mock('@/lib/local-json-store', () => ({
  checkWritable: vi.fn(() => ({ writable: true, root: '/tmp', file: '/tmp/artifacts.json' })),
  listRecords: vi.fn(() => []),
  LOCAL_STORE_FILES: {
    memory: 'memory.json',
    approvals: 'approvals.json',
    artifacts: 'artifacts.json',
    research: 'research.json',
    apps: 'apps.json',
    agents: 'agents.json',
  },
  getStorageRoot: vi.fn(() => '/tmp'),
}))

import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'

const mockGetMeshCredential = vi.mocked(getMeshCredential)
const mockGetMeshTestNotes = vi.mocked(getMeshTestNotes)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMeshCredential.mockResolvedValue(null)
  mockGetMeshTestNotes.mockResolvedValue({})
  delete process.env.GENX_BASE_URL
  delete process.env.GENX_API_URL
  delete process.env.HF_ADULT_VIDEO_ENDPOINT
  delete process.env.HF_ADULT_VIDEO_ENDPOINT_FALLBACK
  delete process.env.HF_ADULT_VIDEO_MODEL
  delete process.env.HF_ADULT_VIDEO_MODEL_FALLBACK
  delete process.env.TOGETHER_ADULT_FALLBACK_ENABLED
  delete process.env.TOGETHER_ADULT_VIDEO_MODEL
})

describe('cleanup 2 dashboard truth and adult routing', () => {
  it('adult_video does not call generic video generation from runtime-execution', async () => {
    const runtime = source('src/lib/runtime-execution.ts')
    const adultBlock = runtime.slice(runtime.indexOf("if (capability === 'adult_video')"), runtime.indexOf("if (capability === 'video_generation'"))
    expect(adultBlock).toContain('blockedAdultVideoResponse')
    expect(adultBlock).not.toContain('/api/brain/video-generate')

    const { executeCapability } = await import('@/lib/runtime-execution')
    const result = await executeCapability({
      input: 'adult video request',
      capability: 'adult_video',
      adultMode: true,
    })
    expect(result.success).toBe(false)
    expect(result.provider).toBeNull()
    expect(result.model).toBeNull()
    expect(result.error).toContain('dedicated Hugging Face adult video endpoint/model')
    expect(result.error).toContain('HF_ADULT_VIDEO_ENDPOINT')
  })

  it('adult_video does not route through GenX, Groq, MiMo, Together, or generic video', () => {
    const videoRoute = source('src/app/api/brain/video-generate/route.ts')
    const adultBlock = videoRoute.slice(videoRoute.indexOf("if (capability === 'adult_video')"), videoRoute.indexOf('const enhancedPrompt'))
    expect(adultBlock).toContain('HF_ADULT_VIDEO_ENDPOINT')
    expect(adultBlock).toContain('HF_ADULT_VIDEO_MODEL')
    expect(adultBlock).toContain('does not execute adult_video')
    expect(adultBlock).not.toContain('callGenXMedia')
    expect(adultBlock).not.toContain('planningFallback')
    expect(adultBlock).not.toContain('Together')
  })

  it('Hugging Face adult main/fallback endpoint and model env names are represented in truth', () => {
    const truth = source('src/lib/capability-runtime-truth.ts')
    for (const envName of [
      'HF_ADULT_TEXT_ENDPOINT',
      'HF_ADULT_TEXT_ENDPOINT_FALLBACK',
      'HF_ADULT_TEXT_MODEL',
      'HF_ADULT_TEXT_MODEL_FALLBACK',
      'HF_ADULT_IMAGE_ENDPOINT',
      'HF_ADULT_IMAGE_ENDPOINT_FALLBACK',
      'HF_ADULT_IMAGE_MODEL',
      'HF_ADULT_IMAGE_MODEL_FALLBACK',
      'HF_ADULT_VOICE_ENDPOINT',
      'HF_ADULT_VOICE_ENDPOINT_FALLBACK',
      'HF_ADULT_VOICE_MODEL',
      'HF_ADULT_VOICE_MODEL_FALLBACK',
      'HF_ADULT_AVATAR_ENDPOINT',
      'HF_ADULT_AVATAR_ENDPOINT_FALLBACK',
      'HF_ADULT_AVATAR_MODEL',
      'HF_ADULT_AVATAR_MODEL_FALLBACK',
      'HF_ADULT_VIDEO_ENDPOINT',
      'HF_ADULT_VIDEO_ENDPOINT_FALLBACK',
      'HF_ADULT_VIDEO_MODEL',
      'HF_ADULT_VIDEO_MODEL_FALLBACK',
    ]) {
      expect(truth).toContain(envName)
    }
  })

  it('dashboard no longer hardcodes backend-missing voice labels', () => {
    const layout = source('src/app/admin/dashboard/layout.tsx')
    expect(layout).not.toContain('backend missing')
    expect(layout).not.toContain('Voice backend not wired')
    expect(layout).not.toContain('Mic stream disabled')
    expect(layout).toContain('/api/admin/system/capabilities')
    expect(layout).toContain('/api/realtime/session')
  })

  it('dashboard overview preserves needs_proof instead of showing it as blocked', () => {
    const adapter = source('src/lib/runtime-capability-truth.ts')
    const overview = source('src/app/admin/dashboard/page.tsx')
    expect(adapter).toContain("if (status === 'wired_unproven') return 'needs_proof'")
    expect(overview).toContain("capability.status === 'needs_proof'")
    expect(overview).not.toContain("capability.status === 'available'")
    expect(overview).not.toContain("capability.status === 'not_implemented'")
  })

  it('GenX endpoint truth uses the genx-client default URL when no env URL is set', async () => {
    mockGetMeshCredential.mockResolvedValue('genx-key')
    mockGetMeshTestNotes.mockResolvedValue({})
    const { getProviderRuntimeTruthEntry } = await import('@/lib/provider-runtime-truth')
    const genx = await getProviderRuntimeTruthEntry('genx')
    expect(genx?.hasKey).toBe(true)
    expect(genx?.endpointStatus).toBe('ok')
    expect(genx?.blocker).not.toContain('requires_endpoint')
  })

  it('deleted old router files remain gone and opencode is not staged by this cleanup', () => {
    for (const file of [
      'src/lib/capability-router.ts',
      'src/lib/capability-registry.ts',
      'src/lib/runtime-registry.ts',
      'src/lib/model-resolver.ts',
      'src/lib/provider-capability-map.ts',
    ]) {
      expect(fs.existsSync(path.join(root, file))).toBe(false)
    }
    const status = execFileSync('git', ['status', '--short', '--', 'opencode.json'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(status.trim()).toBe('')
  })
})
