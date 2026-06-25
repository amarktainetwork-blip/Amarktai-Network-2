import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  ACTIVE_AI_PROVIDER_KEYS,
  REMOVED_AI_PROVIDER_KEYS,
  getAllProviderRuntimes,
  getEligibleProvidersForCapability,
  getProviderRuntime,
} from '@/lib/provider-runtime'
import {
  REQUIRED_RUNTIME_CAPABILITY_KEYS,
  getAllRuntimeCapabilityProofs,
  getRuntimeCapabilityProof,
} from '@/lib/capability-proof-registry'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { AI_PROVIDER_MESH } from '@/lib/provider-mesh'
import { TOGETHER_VIDEO_CATALOG, resolveVideoProviderOrder } from '@/lib/video-capability'

const repoPath = (...parts: string[]) => path.join(process.cwd(), ...parts)

describe('provider endpoint and capability proof recovery', () => {
  it('keeps the active provider set exact and excludes removed providers', () => {
    expect(ACTIVE_AI_PROVIDER_KEYS).toEqual(['genx', 'huggingface', 'together', 'groq', 'mimo'])

    const runtimeKeys = getAllProviderRuntimes().map((provider) => provider.key)
    expect(runtimeKeys).toEqual([...ACTIVE_AI_PROVIDER_KEYS])

    const meshKeys = AI_PROVIDER_MESH.map((provider) => provider.id)
    for (const removed of REMOVED_AI_PROVIDER_KEYS) {
      expect(runtimeKeys).not.toContain(removed)
      expect(meshKeys).not.toContain(removed)
    }
  })

  it('documents provider endpoint shape without over-claiming media support', () => {
    const huggingFace = getProviderRuntime('huggingface')!
    expect(huggingFace.taskEndpointMap.chat?.endpoint).toContain('/chat/completions')
    expect(huggingFace.taskEndpointMap.text_to_image?.endpoint).toBe('/models/{model}')
    expect(huggingFace.taskEndpointMap.music_song?.status).toBe('requires_endpoint')
    expect(huggingFace.taskEndpointMap.adult_text?.dedicatedEndpointEnv).toBe('HF_ADULT_TEXT_ENDPOINT')

    const together = getProviderRuntime('together')!
    expect(together.taskEndpointMap.text_to_image?.notes).toContain('never video')
    expect(together.supportedCapabilityKeys).not.toContain('text_to_video')

    const groq = getProviderRuntime('groq')!
    expect(groq.unsupportedCapabilityKeys).toEqual(expect.arrayContaining(['text_to_image', 'text_to_video', 'music_song']))

    const mimo = getProviderRuntime('mimo')!
    expect(mimo.baseUrl).toContain('xiaomimimo')
    expect(mimo.envAliases).not.toContain('MINIMAX_API_KEY')
    expect(mimo.unsupportedCapabilityKeys).toEqual(expect.arrayContaining(['text_to_image', 'text_to_video', 'text_to_speech']))
  })

  it('keeps adult providers hidden from normal routing and HF-only behind endpoint gates', () => {
    expect(getEligibleProvidersForCapability('adult_text').map((provider) => provider.key)).toEqual([])
    expect(getEligibleProvidersForCapability('adult_text', { adult: true }).map((provider) => provider.key)).toEqual(['huggingface'])

    for (const capability of ['adult_text', 'adult_image', 'adult_voice', 'adult_video'] as const) {
      const route = getMediaCapabilityRoute(capability)
      expect(route?.providers.map((entry) => entry.provider)).toEqual(['huggingface'])
    }
  })

  it('proves every required capability has a status and storage/async contract', () => {
    const proofs = getAllRuntimeCapabilityProofs()
    expect(proofs).toHaveLength(REQUIRED_RUNTIME_CAPABILITY_KEYS.length)
    for (const key of REQUIRED_RUNTIME_CAPABILITY_KEYS) {
      const proof = getRuntimeCapabilityProof(key)
      expect(proof?.key).toBe(key)
      expect(proof?.status).toMatch(/working|requires_endpoint|requires_verification/)
      if (key.includes('video')) expect(proof?.requiresAsyncJob || proof?.status === 'working').toBeTruthy()
    }

    for (const key of ['text_to_image', 'text_to_video', 'text_to_speech', 'music_song', 'artifact_create'] as const) {
      expect(getRuntimeCapabilityProof(key)?.requiresStorage).toBe(true)
    }
    expect(getRuntimeCapabilityProof('adult_video')?.status).toBe('requires_endpoint')
    expect(getRuntimeCapabilityProof('long_form_video_assembly')?.status).toBe('requires_verification')
  })

  it('does not route Together FLUX image models as video', () => {
    expect(TOGETHER_VIDEO_CATALOG).toEqual([])
    const cheap = resolveVideoProviderOrder('cheap', 'text_to_video', 10)
    const balanced = resolveVideoProviderOrder('balanced', 'text_to_video', 10)
    expect([cheap.primary, ...cheap.fallbacks]).not.toContain('together')
    expect([balanced.primary, ...balanced.fallbacks]).not.toContain('together')
  })

  it('blocks app-facing provider/model overrides while preserving admin test lanes', () => {
    const requestRoute = readFileSync(repoPath('src/app/api/brain/request/route.ts'), 'utf8')
    expect(requestRoute).toContain('App requests cannot override provider routing')
    expect(requestRoute).not.toContain('providerOverride: typeof body.metadata')
    expect(requestRoute).not.toContain('modelOverride: typeof body.metadata')

    const executeRoute = readFileSync(repoPath('src/app/api/brain/execute/route.ts'), 'utf8')
    const normaliseSegment = executeRoute.slice(
      executeRoute.indexOf('function normaliseToStandard'),
      executeRoute.indexOf('function applyResolvedTaskType'),
    )
    expect(normaliseSegment).not.toContain('provider_override')
    expect(normaliseSegment).not.toContain('model_override')
    expect(executeRoute).toContain('__admin_test__')
  })

  it('uses provider-runtime for admin provider tests and reports non-working states', () => {
    const adminRoute = readFileSync(repoPath('src/app/api/admin/providers/[id]/test/route.ts'), 'utf8')
    expect(adminRoute).toContain("from '@/lib/provider-runtime'")
    expect(adminRoute).toContain('requires_endpoint')
    expect(adminRoute).toContain('requires live verification')
    expect(adminRoute).toContain('/api/admin/settings/test-provider')
  })
})
