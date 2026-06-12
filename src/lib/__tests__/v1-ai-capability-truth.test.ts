import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  AI_CAPABILITY_CATEGORIES,
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
  getAiCapabilityTruthSummary,
  getCapabilityTaxonomyByGroup,
} from '@/lib/ai-capability-taxonomy'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'
import { CONNECTED_APP_SCOPES } from '@/lib/connected-apps'

const ROOT = path.resolve(__dirname, '../../..')
const REQUIRED_CAPABILITIES = [
  'chat',
  'reasoning',
  'research',
  'text_generation',
  'text_classification',
  'token_classification',
  'zero_shot_classification',
  'translation',
  'summarization',
  'question_answering',
  'table_question_answering',
  'sentence_similarity',
  'text_ranking',
  'feature_extraction',
  'fill_mask',
  'embeddings',
  'rerank',
  'document_question_answering',
  'visual_question_answering',
  'image_text_to_text',
  'image_text_to_image',
  'image_to_text',
  'image_to_image',
  'image_to_video',
  'image_text_to_video',
  'text_to_image',
  'text_to_video',
  'video_to_video',
  'video_text_to_text',
  'video_classification',
  'visual_document_retrieval',
  'image_classification',
  'zero_shot_image_classification',
  'object_detection',
  'zero_shot_object_detection',
  'image_segmentation',
  'mask_generation',
  'depth_estimation',
  'keypoint_detection',
  'image_feature_extraction',
  'text_to_3d',
  'image_to_3d',
  'text_to_speech',
  'text_to_audio',
  'automatic_speech_recognition',
  'audio_to_audio',
  'audio_classification',
  'voice_activity_detection',
  'music_generation',
  'lyrics_generation',
  'avatar_generation',
  'avatar_video',
  'voice_clone_or_voice_design',
  'tabular_classification',
  'tabular_regression',
  'time_series_forecasting',
  'reinforcement_learning',
  'robotics',
  'any_to_any',
  'multimodal_generation',
  'campaign_generation',
  'brand_aware_content_generation',
] as const

describe('V1 universal AI capability truth', () => {
  it('contains every required capability exactly once', () => {
    const ids = AI_CAPABILITY_TAXONOMY.map((capability) => capability.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining([...REQUIRED_CAPABILITIES]))
  })

  it('provides complete app-facing truth metadata', () => {
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      expect(AI_CAPABILITY_CATEGORIES).toContain(capability.group)
      expect(capability.inputTypes.length).toBeGreaterThan(0)
      expect(capability.outputTypes.length).toBeGreaterThan(0)
      expect(CONNECTED_APP_AI_SCOPES).toContain(capability.requiredScope)
      expect(['working', 'partially_wired', 'provider_available_not_wired', 'unavailable']).toContain(capability.status)
      expect(typeof capability.exposeToConnectedAppsV1).toBe('boolean')
      expect(typeof capability.createsArtifact).toBe('boolean')
      expect(typeof capability.longRunning).toBe('boolean')
    }
  })

  it('requires proof for working claims and blockers for unavailable claims', () => {
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      if (capability.status === 'working') {
        expect(
          Boolean(capability.executableEndpoint)
          || capability.providerRoutes.some((route) => route.executable),
        ).toBe(true)
      }
      if (capability.status === 'unavailable') {
        expect(capability.blocker?.trim().length).toBeGreaterThan(0)
      }
      if (capability.status !== 'working') {
        expect(capability.blocker?.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('uses only providers from the canonical provider mesh', () => {
    const approved = new Set(APPROVED_DIRECT_PROVIDER_IDS)
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      for (const route of capability.providerRoutes) {
        expect(approved.has(route.provider)).toBe(true)
      }
    }

    const source = fs.readFileSync(path.join(ROOT, 'src/lib/ai-capability-taxonomy.ts'), 'utf8')
    expect(source).toContain("from '@/lib/provider-mesh'")
    expect(source).toContain("from '@/lib/universal-model-catalog'")
    expect(source).not.toMatch(/openai|anthropic|gemini|deepseek|minimax|cohere|elevenlabs|replicate/i)
  })

  it('generates connected-app scopes for every app-facing capability', () => {
    for (const capability of AI_CAPABILITY_TAXONOMY.filter((entry) => entry.exposeToConnectedAppsV1)) {
      expect(CONNECTED_APP_AI_SCOPES).toContain(capability.requiredScope)
      expect(CONNECTED_APP_SCOPES).toContain(capability.requiredScope)
    }
  })

  it('groups every capability in the required API categories', () => {
    const grouped = getCapabilityTaxonomyByGroup()
    expect(Object.keys(grouped)).toEqual([...AI_CAPABILITY_CATEGORIES])
    expect(Object.values(grouped).flat()).toHaveLength(AI_CAPABILITY_TAXONOMY.length)
    expect(getAiCapabilityTruthSummary()).toMatchObject({
      total: 62,
      byStatus: {
        working: 62,
        partially_wired: 0,
        provider_available_not_wired: 0,
        unavailable: 0,
      },
    })
  })

  it('adds an authenticated truth API backed by the connected-app execution surface', () => {
    const route = fs.readFileSync(
      path.join(ROOT, 'src/app/api/admin/system/ai-capabilities-truth/route.ts'),
      'utf8',
    )
    expect(route).toContain('getSession')
    expect(route).toContain('Unauthorized')
    expect(route).toContain('getCapabilityTaxonomyByGroup')
    expect(route).toContain('connectedAppExecutionAddedInThisChange: true')
    expect(route).not.toMatch(/selectedModel|modelOverride|model picker/i)
  })
})
