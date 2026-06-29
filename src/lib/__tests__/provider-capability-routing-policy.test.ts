import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { MEDIA_CAPABILITY_ROUTES, getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import {
  getModelsForCapability,
  isTogetherAdultFallbackEnabled,
  validateCapabilitySelection,
} from '@/lib/provider-capability-governance'
import { PROVIDER_MESH } from '@/lib/provider-mesh'
import {
  V1_PRODUCTION_AI_PROVIDER_KEYS,
  getProviderRuntime,
  isV1ProductionAIProviderKey,
} from '@/lib/provider-runtime'
import { routeLiveModel } from '@/lib/live-ai-routing'

const root = process.cwd()
const source = (relativePath: string) => fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')

afterEach(() => {
  delete process.env.TOGETHER_ADULT_FALLBACK_ENABLED
  delete process.env.TOGETHER_ADULT_TEXT_MODEL
  delete process.env.TOGETHER_ADULT_IMAGE_MODEL
  delete process.env.TOGETHER_ADULT_VIDEO_MODEL
  delete process.env.TOGETHER_ADULT_VOICE_MODEL
})

describe('provider capability truth and routing policy', () => {
  it('keeps MiMo in the mesh but out of V1 production backend routing', () => {
    expect(PROVIDER_MESH.some((entry) => entry.id === 'mimo')).toBe(true)
    expect(V1_PRODUCTION_AI_PROVIDER_KEYS).toEqual(['genx', 'huggingface', 'together', 'groq'])
    expect(isV1ProductionAIProviderKey('mimo')).toBe(false)

    const routed = routeLiveModel({ capability: 'chat', selectedProvider: 'mimo' })
    expect(routed.selectedProvider).toBeNull()
    expect(routed.blockedReason).toContain('V1 production backend routing is disabled')

    const automatic = routeLiveModel({ capability: 'chat' })
    expect(automatic.selectedProvider).not.toBe('mimo')
    expect(automatic.fallbackChain.map((entry) => entry.provider)).not.toContain('mimo')
  })

  it('allows Groq for text, streaming/vision truth, STT, and TTS but not image or video generation', () => {
    const groqRuntime = getProviderRuntime('groq')!
    const groqMesh = PROVIDER_MESH.find((entry) => entry.id === 'groq')!

    expect(routeLiveModel({ capability: 'chat', selectedProvider: 'groq' }).selectedProvider).toBe('groq')
    expect(routeLiveModel({ capability: 'tts', selectedProvider: 'groq' }).selectedProvider).toBe('groq')
    expect(routeLiveModel({ capability: 'stt', selectedProvider: 'groq' }).selectedProvider).toBe('groq')
    expect(groqRuntime.supportedCapabilityKeys).toEqual(expect.arrayContaining(['streaming_chat', 'speech_to_text', 'text_to_speech']))
    expect(groqMesh.capabilities).toEqual(expect.arrayContaining(['streaming_text', 'vision', 'stt', 'tts']))
    expect(validateCapabilitySelection({ capability: 'image_generation', provider: 'groq' }).allowed).toBe(false)
    expect(validateCapabilitySelection({ capability: 'video_generation', provider: 'groq' }).allowed).toBe(false)
  })

  it('routes Together only through capabilities with executable truth', () => {
    expect(routeLiveModel({ capability: 'embeddings', selectedProvider: 'together' }).selectedProvider).toBe('together')
    expect(routeLiveModel({ capability: 'rerank', selectedProvider: 'together' }).selectedProvider).toBe('together')
    expect(routeLiveModel({ capability: 'rag', selectedProvider: 'together' }).selectedProvider).toBe('together')
    expect(routeLiveModel({ capability: 'image_generation', selectedProvider: 'together' }).selectedProvider).toBe('together')
    expect(getModelsForCapability('rag', { provider: 'together' })).not.toHaveLength(0)

    expect(source('app/api/brain/embeddings/route.ts')).toContain("provider: 'together'")
    expect(source('app/api/brain/rerank/route.ts')).toContain("provider: 'together'")
    expect(source('app/api/brain/image/route.ts')).toContain('https://api.together.xyz/v1/images/generations')
  })

  it('keeps adult routing private, Hugging Face primary, and Together fallback gated', () => {
    for (const capability of ['adult_text', 'adult_image', 'adult_voice'] as const) {
      const route = getMediaCapabilityRoute(capability)!
      expect(route.providers[0].provider).toBe('huggingface')
      expect(route.providers.map((entry) => entry.provider)).not.toContain('genx')
      expect(route.providers.map((entry) => entry.provider)).not.toContain('groq')
      expect(route.providers.map((entry) => entry.provider)).not.toContain('mimo')
    }
    expect(getMediaCapabilityRoute('adult_video')?.route).toBe('')
    expect(getMediaCapabilityRoute('adult_video')?.providers).toEqual([])

    const blocked = validateCapabilitySelection({
      capability: 'adult_text',
      provider: 'together',
      adultPolicyAllows: true,
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.blockers).toContain('adult_fallback_not_configured')

    process.env.TOGETHER_ADULT_FALLBACK_ENABLED = 'true'
    expect(isTogetherAdultFallbackEnabled('adult_image')).toBe(false)
    process.env.TOGETHER_ADULT_IMAGE_MODEL = 'approved-adult-image-model'
    expect(isTogetherAdultFallbackEnabled('adult_image')).toBe(true)

    process.env.TOGETHER_ADULT_TEXT_MODEL = 'approved-adult-text-model'
    const allowed = validateCapabilitySelection({
      capability: 'adult_text',
      provider: 'together',
      adultPolicyAllows: true,
    })
    expect(allowed.allowed).toBe(true)
    expect(routeLiveModel({
      capability: 'adult_text',
      selectedProvider: 'together',
      adultPolicy: 'adult_text',
    }).selectedModel).toBe('approved-adult-text-model')
  })

  it('does not silently force Studio video routing back to GenX', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain('No silent GenX fallback was applied.')
    expect(route).toContain("if (route.selectedProvider !== 'genx')")
    expect(route).not.toContain("route.selectedProvider === 'genx'\r\n        ? route.selectedProvider\r\n        : 'genx'")
    expect(route).not.toContain("route.selectedProvider === 'genx'\n        ? route.selectedProvider\n        : 'genx'")
  })

  it('marks non-executable provider capabilities as blocked instead of optimistic working truth', () => {
    const genx = getProviderRuntime('genx')!
    const validation = validateCapabilitySelection({ capability: 'avatar_video', provider: 'genx' })

    expect(genx.unsupportedCapabilityKeys).toContain('avatar_video')
    expect(genx.taskEndpointMap).not.toHaveProperty('avatar_video')
    expect(validation.allowed).toBe(false)
    expect(validation.reason).toBe('No approved wired model supports this capability.')
    expect(source('app/api/brain/avatar-video/route.ts')).toContain('generic Veo video is not accepted as avatar lip-sync proof')
  })

  it('preserves existing Studio chat, image, music, and short-video routing behavior', () => {
    expect(routeLiveModel({ capability: 'chat' }).selectedProvider).toMatch(/^(groq|together|genx|huggingface)$/)
    expect(routeLiveModel({ capability: 'image_generation' }).selectedProvider).toMatch(/^(genx|together|huggingface)$/)
    expect(routeLiveModel({ capability: 'music_generation' }).selectedProvider).toBe('genx')
    expect(MEDIA_CAPABILITY_ROUTES.video_generation.providers.map((entry) => entry.provider)).toEqual(['genx'])
  })
})
