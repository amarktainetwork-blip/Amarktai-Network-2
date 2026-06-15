import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CANONICAL_AGENT_TYPES } from '@/lib/agent-runtime'
import { CANONICAL_PROVIDER_IDS } from '@/lib/providers/provider-types'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import { LONG_FORM_VIDEO_ARCHITECTURE } from '@/lib/long-form-video'
import {
  FUTURE_RESEARCH_TOOLS,
  RESEARCH_RUNTIME_STATUS,
} from '@/lib/research-runtime'

const ROOT = process.cwd()
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('V1 final Brain architecture', () => {
  it('keeps exactly the six canonical production providers', () => {
    expect(CANONICAL_PROVIDER_IDS).toEqual([
      'huggingface',
      'together',
      'groq',
      'genx',
      'qwen',
      'mimo',
    ])
    expect(PROVIDER_TRUTH.map((provider) => provider.id)).toEqual(CANONICAL_PROVIDER_IDS)
    for (const provider of PROVIDER_TRUTH) {
      expect(provider.discovery.models).not.toBeUndefined()
      expect(provider.features).toEqual(expect.objectContaining({
        streaming: expect.any(Boolean),
        asyncJobs: expect.any(Boolean),
        artifactSupport: expect.any(Boolean),
      }))
      expect(provider.billing).toMatchObject({
        pricingSource: 'provider_catalog',
        staticPrices: false,
      })
    }
  })

  it('makes discovery and scoring the only live orchestrator selection path', () => {
    const orchestrator = source('src/lib/orchestrator.ts')
    expect(orchestrator).toContain('planCanonicalExecution')
    expect(orchestrator).toContain('NO_ROUTE_FOUND')
    expect(orchestrator).not.toContain('loadSmartRouterState().catch')
    expect(orchestrator).not.toContain('await callProvider(')
    expect(orchestrator).not.toContain('getDefaultModelForProvider(')
  })

  it('keeps specialist product routes as capability delegates', () => {
    for (const file of [
      'src/app/api/brain/adult-image/route.ts',
      'src/app/api/brain/adult-text/route.ts',
      'src/app/api/brain/avatar-video/route.ts',
      'src/app/api/brain/embeddings/route.ts',
      'src/app/api/brain/image-edit/route.ts',
      'src/app/api/brain/rerank/route.ts',
      'src/app/api/brain/stt/route.ts',
      'src/app/api/brain/suggestive-video/route.ts',
      'src/app/api/brain/tts/route.ts',
      'src/app/api/brain/video/route.ts',
      'src/app/api/brain/video-generate/route.ts',
    ]) {
      expect(source(file), file).toMatch(/delegateJsonCapability|executeCapability/)
    }
    expect(source('src/app/api/admin/music-studio/route.ts')).toContain('executeCapability')
  })

  it('does not retain hardcoded model fallbacks in canonical adapters', () => {
    const adapter = source('src/lib/ai-capability-adapters.ts')
    for (const modelFamily of [
      'gpt-image',
      'qwen-image',
      'whisper-large',
      'orpheus',
      'FLUX.',
      'veo-',
      'wan2.',
    ]) {
      expect(adapter).not.toContain(modelFamily)
    }
    expect(adapter).toContain('Discovery did not select')
  })

  it('defines the final partial research and long-form interfaces', () => {
    expect(RESEARCH_RUNTIME_STATUS).toBe('PARTIAL')
    expect(FUTURE_RESEARCH_TOOLS).toEqual([
      'google',
      'website',
      'youtube',
      'reddit',
      'news',
      'pdf',
      'ocr',
      'browser',
      'social',
    ])
    expect(LONG_FORM_VIDEO_ARCHITECTURE).toEqual([
      'storyboard',
      'scene_list',
      'scene_jobs',
      'provider_generation',
      'voice',
      'music',
      'assembly',
      'artifact',
    ])
  })

  it('exposes only the six canonical agent classes as product truth', () => {
    expect(CANONICAL_AGENT_TYPES).toEqual([
      'research',
      'creative',
      'operations',
      'ceo',
      'marketing',
      'custom',
    ])
    const runtime = source('src/lib/agent-runtime.ts')
    expect(runtime).toContain("capability: 'agents'")
    expect(runtime).not.toContain('defaultProvider:')
    expect(runtime).not.toContain('defaultModel:')
    expect(runtime).not.toContain('callProvider(')
  })
})
