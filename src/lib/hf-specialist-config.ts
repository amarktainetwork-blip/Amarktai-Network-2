import type { AiCapabilityProviderRoute } from '@/lib/ai-capability-taxonomy'

export const HF_SPECIALIST_DEFAULT_MODELS: Readonly<Record<string, string>> = {
  chat: 'mistralai/Mistral-7B-Instruct-v0.3',
  text_generation: 'mistralai/Mistral-7B-Instruct-v0.3',
  lyrics_generation: 'mistralai/Mistral-7B-Instruct-v0.3',
  campaign_generation: 'mistralai/Mistral-7B-Instruct-v0.3',
  brand_aware_content_generation: 'mistralai/Mistral-7B-Instruct-v0.3',
  text_classification: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
  token_classification: 'dslim/bert-base-NER',
  zero_shot_classification: 'facebook/bart-large-mnli',
  translation: 'Helsinki-NLP/opus-mt-en-fr',
  summarization: 'facebook/bart-large-cnn',
  question_answering: 'deepset/roberta-base-squad2',
  table_question_answering: 'google/tapas-base-finetuned-wtq',
  sentence_similarity: 'sentence-transformers/all-MiniLM-L6-v2',
  text_ranking: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
  feature_extraction: 'sentence-transformers/all-MiniLM-L6-v2',
  fill_mask: 'google-bert/bert-base-uncased',
  embeddings: 'sentence-transformers/all-MiniLM-L6-v2',
  rerank: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
  document_question_answering: 'impira/layoutlm-document-qa',
  visual_question_answering: 'dandelin/vilt-b32-finetuned-vqa',
  image_text_to_text: 'Salesforce/blip2-opt-2.7b',
  image_to_text: 'Salesforce/blip-image-captioning-base',
  image_text_to_image: 'timbrooks/instruct-pix2pix',
  image_to_image: 'timbrooks/instruct-pix2pix',
  text_to_image: 'stabilityai/stable-diffusion-xl-base-1.0',
  image_classification: 'google/vit-base-patch16-224',
  zero_shot_image_classification: 'openai/clip-vit-large-patch14',
  object_detection: 'facebook/detr-resnet-50',
  zero_shot_object_detection: 'google/owlvit-base-patch32',
  image_segmentation: 'facebook/mask2former-swin-large-coco-panoptic',
  mask_generation: 'facebook/sam-vit-base',
  depth_estimation: 'Intel/dpt-large',
  keypoint_detection: 'facebook/detr-resnet-50',
  image_feature_extraction: 'google/vit-base-patch16-224',
  video_classification: 'MCG-NJU/videomae-base-finetuned-kinetics',
  text_to_speech: 'facebook/mms-tts-eng',
  automatic_speech_recognition: 'openai/whisper-large-v3',
  audio_classification: 'MIT/ast-finetuned-audioset-10-10-0.4593',
  voice_activity_detection: 'pyannote/voice-activity-detection',
  time_series_forecasting: 'amazon/chronos-t5-small',
}

export const HF_ENDPOINT_REQUIRED_CAPABILITIES = [
  'image_to_video',
  'image_text_to_video',
  'text_to_video',
  'video_to_video',
  'video_text_to_text',
  'visual_document_retrieval',
  'text_to_3d',
  'image_to_3d',
  'text_to_audio',
  'audio_to_audio',
  'music_generation',
  'avatar_generation',
  'avatar_video',
  'voice_clone_or_voice_design',
  'tabular_classification',
  'tabular_regression',
  'reinforcement_learning',
  'robotics',
  'any_to_any',
  'multimodal_generation',
] as const

export interface HfSpecialistResolution {
  capability: string
  model: string | null
  endpoint: string | null
  modelSource: 'environment' | 'default' | 'route' | 'missing'
  endpointSource: 'environment' | 'model_api' | 'missing'
  endpointRequired: boolean
  configured: boolean
  requiredEnv: string[]
}

function envSuffix(capability: string): string {
  return capability.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
}

function parseJsonMap(envName: string): Record<string, string> {
  const raw = process.env[envName]?.trim()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()))
        .map(([key, value]) => [key, value.trim()]),
    )
  } catch {
    return {}
  }
}

function publicHttpsUrl(raw?: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost'
      || host === '0.0.0.0'
      || host.startsWith('127.')
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || host.startsWith('169.254.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) return null
    return url.toString()
  } catch {
    return null
  }
}

export function resolveHfSpecialistConfig(
  capability: string,
  route?: Pick<AiCapabilityProviderRoute, 'modelIds'>,
): HfSpecialistResolution {
  const suffix = envSuffix(capability)
  const endpointEnv = `HF_ENDPOINT_${suffix}`
  const modelEnv = `HF_MODEL_${suffix}`
  const endpointMap = parseJsonMap('HF_SPECIALIST_ENDPOINTS_JSON')
  const modelMap = parseJsonMap('HF_SPECIALIST_MODELS_JSON')
  const envEndpoint = publicHttpsUrl(process.env[endpointEnv] ?? endpointMap[capability])
  const envModel = process.env[modelEnv]?.trim() || modelMap[capability]?.trim() || null
  const defaultModel = HF_SPECIALIST_DEFAULT_MODELS[capability] ?? null
  const routeModel = route?.modelIds.find((model) => model && !model.startsWith('custom:') && !model.startsWith('task:')) ?? null
  const model = envModel || defaultModel || routeModel
  const endpointRequired = (HF_ENDPOINT_REQUIRED_CAPABILITIES as readonly string[]).includes(capability)
  const endpoint = envEndpoint ?? (!endpointRequired && model
    ? `https://router.huggingface.co/hf-inference/models/${model}`
    : null)

  return {
    capability,
    model,
    endpoint,
    modelSource: envModel ? 'environment' : defaultModel ? 'default' : routeModel ? 'route' : 'missing',
    endpointSource: envEndpoint ? 'environment' : endpoint ? 'model_api' : 'missing',
    endpointRequired,
    configured: Boolean(model && endpoint),
    requiredEnv: endpointRequired
      ? [endpointEnv, 'HF_SPECIALIST_ENDPOINTS_JSON']
      : [modelEnv, endpointEnv, 'HF_SPECIALIST_MODELS_JSON', 'HF_SPECIALIST_ENDPOINTS_JSON'],
  }
}
