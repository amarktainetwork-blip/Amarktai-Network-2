import { describe, expect, it } from 'vitest'
import {
  getCapabilityById,
  getCapabilityCategories,
  getCapabilitiesByProvider,
  getCapabilityTaxonomy,
  getConnectedProviderKeys,
  HUGGINGFACE_TASK_CAPABILITIES,
  PROVIDER_CAPABILITY_POLICY,
} from '@/lib/capability-taxonomy'

describe('AmarktAI Capability OS taxonomy', () => {
  it('contains every Hugging Face capability category requested for the platform', () => {
    const required = [
      'audio_text_to_text',
      'image_text_to_text',
      'image_text_to_image',
      'image_text_to_video',
      'visual_question_answering',
      'document_question_answering',
      'video_text_to_text',
      'visual_document_retrieval',
      'any_to_any',
      'depth_estimation',
      'image_classification',
      'object_detection',
      'image_segmentation',
      'text_to_image',
      'image_to_text',
      'image_to_image',
      'image_to_video',
      'unconditional_image_generation',
      'video_classification',
      'text_to_video',
      'zero_shot_image_classification',
      'mask_generation',
      'zero_shot_object_detection',
      'text_to_3d',
      'image_to_3d',
      'image_feature_extraction',
      'keypoint_detection',
      'video_to_video',
      'text_classification',
      'token_classification',
      'table_question_answering',
      'question_answering',
      'zero_shot_classification',
      'translation',
      'summarization',
      'feature_extraction',
      'text_generation',
      'fill_mask',
      'sentence_similarity',
      'text_ranking',
      'text_to_speech',
      'text_to_audio',
      'automatic_speech_recognition',
      'audio_to_audio',
      'audio_classification',
      'voice_activity_detection',
      'tabular_classification',
      'tabular_regression',
      'time_series_forecasting',
      'reinforcement_learning',
      'robotics',
      'graph_machine_learning',
    ]

    const ids = new Set(HUGGINGFACE_TASK_CAPABILITIES.map((capability) => capability.id))
    for (const id of required) expect(ids.has(id), `missing capability ${id}`).toBe(true)
  })

  it('keeps AmarktAI core product capabilities in the same taxonomy', () => {
    const ids = new Set(getCapabilityTaxonomy().map((capability) => capability.id))
    expect(ids.has('app_builder')).toBe(true)
    expect(ids.has('repo_import')).toBe(true)
    expect(ids.has('repo_audit')).toBe(true)
    expect(ids.has('patch_generation')).toBe(true)
    expect(ids.has('pull_request_creation')).toBe(true)
    expect(ids.has('media_studio')).toBe(true)
    expect(ids.has('connected_apps_command_center')).toBe(true)
  })

  it('tracks only approved connected providers and services', () => {
    const providers = new Set(getConnectedProviderKeys())
    expect(providers.has('genx')).toBe(true)
    expect(providers.has('huggingface')).toBe(true)
    expect(providers.has('qwen')).toBe(true)
    expect(providers.has('mimo')).toBe(true)
    expect(providers.has('groq')).toBe(true)
    expect(providers.has('together')).toBe(true)
    expect(providers.has('github')).toBe(true)
    expect(providers.has('ffmpeg')).toBe(true)

    expect(providers.has('openai' as never)).toBe(false)
    expect(providers.has('gemini' as never)).toBe(false)
    expect(providers.has('nvidia' as never)).toBe(false)
    expect(providers.has('suno' as never)).toBe(false)
    expect(providers.has('udio' as never)).toBe(false)
  })

  it('maps each approved AI provider to capability coverage without pretending execution is complete', () => {
    for (const provider of ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together']) {
      const capabilities = getCapabilitiesByProvider(provider)
      expect(capabilities.length, `${provider} should expose at least one capability`).toBeGreaterThan(0)
    }

    expect(getCapabilitiesByProvider('huggingface').length).toBeGreaterThan(40)
    expect(getCapabilitiesByProvider('genx')).toContain('text_to_video')
    expect(getCapabilitiesByProvider('qwen')).toContain('image_to_video')
    expect(getCapabilitiesByProvider('groq')).toContain('automatic_speech_recognition')
    expect(getCapabilitiesByProvider('together')).toContain('text_to_image')
  })

  it('keeps provider policy separate from model catalog and execution truth', () => {
    for (const policy of PROVIDER_CAPABILITY_POLICY) {
      expect(policy.provider).toBeTruthy()
      expect(policy.mode).toBeTruthy()
      expect(policy.capabilities.length).toBeGreaterThan(0)
      expect(policy.notes.toLowerCase()).not.toContain('fake')
    }

    expect(getCapabilityById('robotics')?.status).toBe('blocked_until_provider_model_confirmed')
    expect(getCapabilityById('reinforcement_learning')?.status).toBe('blocked_until_provider_model_confirmed')
  })

  it('covers all major operating-system categories', () => {
    const categories = new Set(getCapabilityCategories())
    expect(categories.has('multimodal')).toBe(true)
    expect(categories.has('computer_vision')).toBe(true)
    expect(categories.has('natural_language_processing')).toBe(true)
    expect(categories.has('audio')).toBe(true)
    expect(categories.has('coding_agents')).toBe(true)
    expect(categories.has('app_builder')).toBe(true)
    expect(categories.has('media_studio')).toBe(true)
    expect(categories.has('platform_services')).toBe(true)
  })
})
