import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/ai-capability-taxonomy'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { CAPABILITY_MAP } from '@/lib/capability-engine'
import { selectCapabilityRoute } from '@/lib/connected-app-capability-engine'
import { LIVE_SMOKE_PROVIDER_IDS } from '@/lib/live-smoke-tests'
import { MODEL_REGISTRY } from '@/lib/model-registry'
import {
  AI_PROVIDER_MESH,
  APPROVED_DIRECT_PROVIDER_IDS,
} from '@/lib/provider-mesh'
import { CANONICAL_PROVIDERS } from '@/lib/provider-catalog'
import { UNIVERSAL_MODEL_ROUTES } from '@/lib/universal-model-catalog'

const ROOT = path.resolve(__dirname, '../../..')
const source = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

describe('V1 final source-of-truth contracts', () => {
  it('derives every runtime provider projection from provider-mesh', () => {
    const expected = ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together']
    expect(APPROVED_DIRECT_PROVIDER_IDS).toEqual(expected)
    expect(AI_PROVIDER_MESH.map((provider) => provider.id)).toEqual(expected)
    expect(APPROVED_AI_PROVIDERS.map((provider) => provider.key)).toEqual(expected)
    expect(CANONICAL_PROVIDERS.map((provider) => provider.key)).toEqual(expected)

    for (const file of [
      'src/lib/approved-ai-catalog.ts',
      'src/lib/provider-catalog.ts',
      'src/lib/ai-provider-governance.ts',
    ]) {
      expect(source(file)).toContain("from '@/lib/provider-mesh'")
    }
  })

  it('keeps the legacy model registry as a projection of the universal catalog', () => {
    expect(MODEL_REGISTRY.map((model) => [model.provider, model.model_id]))
      .toEqual(UNIVERSAL_MODEL_ROUTES.map((model) => [model.provider, model.modelId]))
    expect(source('src/lib/model-registry.ts'))
      .toContain('every entry is derived from')
  })

  it('uses the canonical capability taxonomy for connected-app execution', () => {
    expect(AI_CAPABILITY_TAXONOMY).toHaveLength(62)
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      const route = selectCapabilityRoute(capability)
      expect(route).not.toBeNull()
      expect(capability.providerRoutes).toContain(route)
      expect(APPROVED_DIRECT_PROVIDER_IDS).toContain(route?.provider)
    }

    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(engine).toContain("from '@/lib/ai-capability-taxonomy'")
    expect(engine).toContain('AI_CAPABILITY_TAXONOMY.find')
    expect(engine).not.toMatch(/CAPABILITY_(REGISTRY|MATRIX)\s*=/)
  })

  it('runs live smoke tests only for canonical approved providers', () => {
    expect(LIVE_SMOKE_PROVIDER_IDS).toBe(APPROVED_DIRECT_PROVIDER_IDS)
    expect(LIVE_SMOKE_PROVIDER_IDS).toEqual([
      'genx',
      'huggingface',
      'qwen',
      'mimo',
      'groq',
      'together',
    ])
  })

  it('keeps legacy capability guidance inside the approved provider set', () => {
    for (const requirement of Object.values(CAPABILITY_MAP)) {
      for (const provider of requirement.suggestedProviders) {
        expect(APPROVED_DIRECT_PROVIDER_IDS).toContain(provider)
      }
    }
  })

  it('does not manufacture completed jobs or artifacts', () => {
    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(engine).toContain("status: 'processing'")
    expect(engine).toContain('artifactId: null')
    expect(engine).toContain("if (result.status !== 'completed')")
    expect(engine).toContain('await createArtifact')
    expect(engine).toContain("status: 'failed'")
    expect(engine).not.toMatch(/fake success|placeholder result|mock artifact/i)
  })

  it('keeps live voice routes approved-only and reports unsupported realtime honestly', () => {
    const voiceOptions = source('src/app/api/admin/voice/options/route.ts')
    const voicePreview = source('src/app/api/admin/voice/preview/route.ts')
    const assistantTts = source('src/app/api/admin/amarktai-assistant/tts/route.ts')
    const realtimeSession = source('src/app/api/realtime/session/route.ts')
    const realtimeHealth = source('src/app/api/realtime/health/route.ts')

    expect(voiceOptions + voicePreview).not.toMatch(/elevenlabs|deepgram/i)
    expect(assistantTts).toContain('isApprovedDirectProvider')
    expect(assistantTts).not.toMatch(/minimax|openai/i)
    expect(realtimeSession + realtimeHealth).toContain("status: 'unavailable'")
    expect(realtimeSession + realtimeHealth).not.toMatch(/providerKey:\s*'openai'|provider:\s*'openai'/i)
  })
})
