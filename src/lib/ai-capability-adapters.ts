import { callUniversalProvider } from '@/lib/universal-provider-call'
import { callGenXMedia, getGenXJobStatus } from '@/lib/genx-client'
import { getVaultApiKey } from '@/lib/brain'
import { pollQwenWanxTask } from '@/lib/qwen-wanx-polling'
import type {
  AiCapabilityDefinition,
  AiCapabilityProviderRoute,
} from '@/lib/ai-capability-taxonomy'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export type CapabilityReferenceKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'tabular'
  | 'brand_kit'
  | 'app_context'

export interface CapabilityReference {
  kind: CapabilityReferenceKind
  url?: string
  artifactId?: string
  mimeType?: string
  data?: unknown
}

export interface CapabilityAdapterInput {
  capability: AiCapabilityDefinition
  route: AiCapabilityProviderRoute
  prompt: string
  text?: string
  inputs?: Record<string, unknown>
  references: CapabilityReference[]
  context: Record<string, unknown>
  model?: string
  endpointUrl?: string
}

export type CapabilityAdapterStatus =
  | 'completed'
  | 'processing'
  | 'needs_configuration'
  | 'blocked'
  | 'failed'

export interface CapabilityAdapterResult {
  status: CapabilityAdapterStatus
  provider: ApprovedDirectProviderId
  model: string
  output: unknown | null
  mediaUrl: string | null
  bytes: Buffer | null
  contentType: string | null
  providerJobId: string | null
  error: string | null
}

export interface ProviderCapabilityAdapter {
  id: string
  provider: ApprovedDirectProviderId
  categories: readonly string[]
  execute(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult>
  poll?(providerJobId: string, input: CapabilityAdapterInput): Promise<CapabilityAdapterResult>
}

const PROVIDER_CATEGORIES: Record<ApprovedDirectProviderId, readonly string[]> = {
  genx: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'music', 'avatar_voice', 'agents_or_planning'],
  huggingface: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'music', 'avatar_voice', 'tabular', 'experimental'],
  qwen: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'agents_or_planning'],
  mimo: ['text', 'multimodal', 'video', 'audio', 'agents_or_planning'],
  groq: ['text', 'multimodal', 'audio', 'agents_or_planning'],
  together: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'agents_or_planning'],
}

const HF_DEFAULT_MODELS: Record<string, string> = {
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
  visual_question_answering: 'dandelin/vilt-b32-finetuned-vqa',
  image_to_text: 'Salesforce/blip-image-captioning-base',
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

function result(
  provider: ApprovedDirectProviderId,
  model: string,
  status: CapabilityAdapterStatus,
  values: Partial<Omit<CapabilityAdapterResult, 'provider' | 'model' | 'status'>> = {},
): CapabilityAdapterResult {
  return {
    provider,
    model,
    status,
    output: values.output ?? null,
    mediaUrl: values.mediaUrl ?? null,
    bytes: values.bytes ?? null,
    contentType: values.contentType ?? null,
    providerJobId: values.providerJobId ?? null,
    error: values.error ?? null,
  }
}

function firstReference(input: CapabilityAdapterInput, kinds: CapabilityReferenceKind[]) {
  return input.references.find((reference) => kinds.includes(reference.kind))
}

function publicHttpsUrl(value?: string): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return null
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost'
      || host === '0.0.0.0'
      || host.startsWith('127.')
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function structuredPrompt(input: CapabilityAdapterInput): string {
  return [
    `Capability: ${input.capability.id}`,
    input.prompt || input.text || '',
    Object.keys(input.context).length ? `App context: ${JSON.stringify(input.context)}` : '',
    input.references.length ? `References: ${JSON.stringify(input.references)}` : '',
    Object.keys(input.inputs ?? {}).length ? `Inputs: ${JSON.stringify(input.inputs)}` : '',
    'Return only the requested result. Use JSON when the output is structured.',
  ].filter(Boolean).join('\n\n')
}

function textModel(provider: ApprovedDirectProviderId, requested?: string): string {
  if (requested) return requested
  if (provider === 'genx') return 'gpt-5.4-mini'
  if (provider === 'qwen') return 'qwen-plus'
  if (provider === 'mimo') return 'mimo-v2.5'
  if (provider === 'groq') return 'llama-3.3-70b-versatile'
  if (provider === 'together') return 'meta-llama/Llama-3-70b-chat-hf'
  return 'task:text'
}

async function executeText(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  if (input.route.provider === 'huggingface') return executeHuggingFace(input)
  const model = textModel(input.route.provider, input.model)
  const response = await callUniversalProvider({
    providerKey: input.route.provider,
    model,
    message: structuredPrompt(input),
    systemPrompt: 'Execute the requested capability faithfully. Never claim an external action or generated file unless the response contains it.',
    temperature: 0.2,
    maxTokens: 2400,
  })
  if (!response.ok) {
    return result(input.route.provider, response.model, configurationStatus(response.error), {
      error: response.error,
    })
  }
  return result(input.route.provider, response.model, 'completed', {
    output: parseProviderJson(response.output),
    contentType: 'application/json',
  })
}

function configurationStatus(error: string | null): CapabilityAdapterStatus {
  return /not configured|no api key|add .*settings/i.test(error ?? '')
    ? 'needs_configuration'
    : 'failed'
}

function parseProviderJson(value: string | null): unknown {
  if (!value) return null
  const trimmed = value.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

async function executeHuggingFace(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'huggingface' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
    ?? HF_DEFAULT_MODELS[input.capability.id]
    ?? input.route.modelIds.find((id) => !id.startsWith('task:'))
    ?? 'custom:huggingface-endpoint'
  if (!key) return result(provider, model, 'needs_configuration', { error: 'Hugging Face key not configured.' })
  const endpoint = publicHttpsUrl(input.endpointUrl)
    ?? (!model.startsWith('custom:') ? `https://api-inference.huggingface.co/models/${model}` : null)
  if (!endpoint) {
    return result(provider, model, 'needs_configuration', {
      error: `${input.capability.id} requires a configured Hugging Face Inference Endpoint URL or model ID.`,
    })
  }

  const binaryReference = firstReference(input, ['image', 'audio', 'video', 'document'])
  let body: BodyInit
  let contentType = 'application/json'
  if (binaryReference?.url && !['document_question_answering', 'visual_question_answering'].includes(input.capability.id)) {
    const referenceUrl = publicHttpsUrl(binaryReference.url)
    if (!referenceUrl) return result(provider, model, 'blocked', { error: 'Reference URLs must be public HTTPS URLs.' })
    const source = await fetch(referenceUrl, { signal: AbortSignal.timeout(30_000) }).catch(() => null)
    if (!source?.ok) return result(provider, model, 'failed', { error: 'Unable to fetch the provider input reference.' })
    body = Buffer.from(await source.arrayBuffer())
    contentType = binaryReference.mimeType ?? source.headers.get('content-type') ?? 'application/octet-stream'
  } else {
    body = JSON.stringify({
      inputs: huggingFaceInputs(input),
      parameters: input.inputs?.parameters ?? {},
    })
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': contentType },
      body,
      signal: AbortSignal.timeout(input.capability.longRunning ? 120_000 : 45_000),
    })
    const responseType = response.headers.get('content-type') ?? 'application/octet-stream'
    if (!response.ok) {
      return result(provider, model, 'failed', {
        error: `Hugging Face HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 600)}`,
      })
    }
    if (responseType.includes('application/json')) {
      return result(provider, model, 'completed', {
        output: await response.json().catch(() => null),
        contentType: responseType,
      })
    }
    return result(provider, model, 'completed', {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: responseType,
    })
  } catch (error) {
    return result(provider, model, 'failed', {
      error: error instanceof Error ? error.message : 'Hugging Face inference failed.',
    })
  }
}

function huggingFaceInputs(input: CapabilityAdapterInput): unknown {
  const reference = firstReference(input, ['image', 'audio', 'video', 'document', 'tabular'])
  if (input.capability.id === 'question_answering') {
    return { question: input.prompt, context: String(input.inputs?.context ?? input.text ?? '') }
  }
  if (input.capability.id === 'table_question_answering') {
    return { query: input.prompt, table: input.inputs?.table ?? reference?.data ?? {} }
  }
  if (['sentence_similarity', 'text_ranking', 'rerank'].includes(input.capability.id)) {
    return {
      source_sentence: input.prompt,
      sentences: input.inputs?.documents ?? input.inputs?.sentences ?? [],
    }
  }
  if (input.capability.id === 'zero_shot_classification') {
    return input.text ?? input.prompt
  }
  if (reference?.url) return { question: input.prompt, image: reference.url, document: reference.url }
  if (reference?.data !== undefined) return reference.data
  return input.text ?? input.prompt
}

async function executeGenXMedia(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'genx' as const
  const type = input.capability.group === 'video' || input.capability.id === 'avatar_video'
    ? 'video'
    : input.capability.group === 'computer_vision' || input.capability.outputTypes.includes('image')
      ? 'image'
      : 'audio'
  const model = input.model ?? input.route.modelIds[0] ?? (
    type === 'video' ? 'veo-3.1' : type === 'image' ? 'gpt-image-1' : 'lyria-2'
  )
  const generated = await callGenXMedia({
    model,
    prompt: structuredPrompt(input),
    type,
    params: {
      references: input.references,
      capability: input.capability.id,
      inputs: input.inputs,
    },
    metadata: { capability: input.capability.id },
  })
  if (!generated.success) {
    return result(provider, generated.model, configurationStatus(generated.error), { error: generated.error })
  }
  return result(provider, generated.model, generated.jobId ? 'processing' : 'completed', {
    mediaUrl: generated.url,
    providerJobId: generated.jobId,
  })
}

async function executeQwen(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  if (
    input.capability.group === 'multimodal'
    && !input.capability.outputTypes.includes('image')
    && !input.capability.outputTypes.includes('video')
  ) {
    return executeQwenMultimodal(input)
  }
  if (input.capability.group !== 'video' && !input.capability.outputTypes.includes('image')) {
    return executeText(input)
  }
  const provider = 'qwen' as const
  const key = await getVaultApiKey(provider)
  const isVideo = input.capability.group === 'video'
  const model = input.model ?? (isVideo ? 'wan2.1-i2v-turbo' : 'qwen-image-2.0')
  if (!key) return result(provider, model, 'needs_configuration', { error: 'Qwen/DashScope key not configured.' })
  const imageReference = firstReference(input, ['image'])
  const videoReference = firstReference(input, ['video'])
  const endpoint = isVideo
    ? 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
    : 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
  const body = isVideo
    ? {
        model,
        input: {
          prompt: input.prompt,
          ...(imageReference?.url ? { img_url: imageReference.url } : {}),
          ...(videoReference?.url ? { video_url: videoReference.url } : {}),
        },
        parameters: input.inputs ?? {},
      }
    : {
        model,
        input: {
          messages: [{
            role: 'user',
            content: [
              ...(imageReference?.url ? [{ image: imageReference.url }] : []),
              { text: input.prompt },
            ],
          }],
        },
        parameters: input.inputs ?? {},
      }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(isVideo ? { 'X-DashScope-Async': 'enable' } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
    const json = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok) {
      return result(provider, model, 'failed', {
        error: `Qwen HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`,
      })
    }
    const taskId = nestedString(json, ['output', 'task_id']) ?? nestedString(json, ['task_id'])
    const mediaUrl = nestedString(json, ['output', 'choices', '0', 'message', 'content', '0', 'image'])
      ?? nestedString(json, ['output', 'video_url'])
      ?? nestedString(json, ['output', 'results', '0', 'url'])
    return result(provider, model, taskId ? 'processing' : 'completed', {
      output: json,
      mediaUrl,
      providerJobId: taskId,
      contentType: 'application/json',
    })
  } catch (error) {
    return result(provider, model, 'failed', {
      error: error instanceof Error ? error.message : 'Qwen capability execution failed.',
    })
  }
}

async function executeQwenMultimodal(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'qwen' as const
  const key = await getVaultApiKey(provider)
  const model = input.model ?? 'qwen-vl-max'
  if (!key) return result(provider, model, 'needs_configuration', { error: 'Qwen/DashScope key not configured.' })
  const referenceContent: Record<string, unknown>[] = []
  for (const reference of input.references) {
      const url = publicHttpsUrl(reference.url)
      if (!url) continue
      if (reference.kind === 'image') referenceContent.push({ type: 'image_url', image_url: { url } })
      if (reference.kind === 'video') referenceContent.push({ type: 'video_url', video_url: { url } })
      if (reference.kind === 'audio') referenceContent.push({ type: 'audio_url', audio_url: { url } })
  }
  const content: Record<string, unknown>[] = [
    ...referenceContent,
    { type: 'text', text: structuredPrompt(input) },
  ]
  try {
    const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
      signal: AbortSignal.timeout(60_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return result(provider, model, 'failed', {
        error: `Qwen multimodal HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`,
      })
    }
    return result(provider, model, 'completed', { output: json, contentType: 'application/json' })
  } catch (error) {
    return result(provider, model, 'failed', {
      error: error instanceof Error ? error.message : 'Qwen multimodal execution failed.',
    })
  }
}

async function executeTogetherImage(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const key = await getVaultApiKey(provider)
  const model = input.model ?? input.route.modelIds[0] ?? 'black-forest-labs/FLUX.1-schnell-Free'
  if (!key) return result(provider, model, 'needs_configuration', { error: 'Together AI key not configured.' })
  const reference = firstReference(input, ['image'])
  try {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        ...(reference?.url ? { image_url: reference.url } : {}),
        ...(input.inputs ?? {}),
      }),
      signal: AbortSignal.timeout(90_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return result(provider, model, 'failed', {
        error: `Together image HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`,
      })
    }
    const mediaUrl = nestedString(json, ['data', '0', 'url'])
    const base64 = nestedString(json, ['data', '0', 'b64_json'])
    if (!mediaUrl && !base64) {
      return result(provider, model, 'failed', { output: json, error: 'Together completed without image data.' })
    }
    return result(provider, model, 'completed', {
      output: json,
      mediaUrl,
      bytes: base64 ? Buffer.from(base64, 'base64') : null,
      contentType: 'image/png',
    })
  } catch (error) {
    return result(provider, model, 'failed', {
      error: error instanceof Error ? error.message : 'Together image execution failed.',
    })
  }
}

function nestedString(value: unknown, path: string[]): string | null {
  let cursor: unknown = value
  for (const key of path) {
    if (Array.isArray(cursor)) cursor = cursor[Number(key)]
    else if (cursor && typeof cursor === 'object') cursor = (cursor as Record<string, unknown>)[key]
    else return null
  }
  return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : null
}

async function executeGroqAudio(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'groq' as const
  const key = await getVaultApiKey(provider)
  const isStt = input.capability.id === 'automatic_speech_recognition'
  const model = input.model ?? (isStt ? 'whisper-large-v3-turbo' : 'canopylabs/orpheus-v1-english')
  if (!key) return result(provider, model, 'needs_configuration', { error: 'Groq key not configured.' })
  try {
    if (isStt) {
      const audio = firstReference(input, ['audio'])
      const url = publicHttpsUrl(audio?.url)
      if (!url) return result(provider, model, 'blocked', { error: 'Speech recognition requires a public HTTPS audio reference.' })
      const source = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!source.ok) return result(provider, model, 'failed', { error: `Audio fetch failed (${source.status}).` })
      const form = new FormData()
      form.append('model', model)
      form.append('file', new Blob([await source.arrayBuffer()], { type: audio?.mimeType ?? 'audio/mpeg' }), 'audio-input')
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) return result(provider, model, 'failed', { error: `Groq STT HTTP ${response.status}.` })
      return result(provider, model, 'completed', {
        output: await response.json().catch(() => null),
        contentType: 'application/json',
      })
    }
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: input.text ?? input.prompt,
        voice: String(input.inputs?.voice ?? 'troy'),
        response_format: 'wav',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) return result(provider, model, 'failed', { error: `Groq TTS HTTP ${response.status}.` })
    return result(provider, model, 'completed', {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'audio/wav',
    })
  } catch (error) {
    return result(provider, model, 'failed', {
      error: error instanceof Error ? error.message : 'Groq audio execution failed.',
    })
  }
}

function adapterExecute(provider: ApprovedDirectProviderId, input: CapabilityAdapterInput) {
  if (provider === 'huggingface') return executeHuggingFace(input)
  if (provider === 'qwen') return executeQwen(input)
  if (provider === 'genx' && (
    input.capability.longRunning
    || ['computer_vision', 'video', 'audio', 'music', 'avatar_voice'].includes(input.capability.group)
  )) return executeGenXMedia(input)
  if (provider === 'groq' && ['text_to_speech', 'automatic_speech_recognition'].includes(input.capability.id)) {
    return executeGroqAudio(input)
  }
  if (provider === 'together' && input.capability.outputTypes.includes('image')) {
    return executeTogetherImage(input)
  }
  return executeText(input)
}

async function pollProvider(
  provider: ApprovedDirectProviderId,
  providerJobId: string,
  input: CapabilityAdapterInput,
): Promise<CapabilityAdapterResult> {
  const model = input.model ?? input.route.modelIds[0] ?? 'unknown'
  if (provider === 'genx') {
    const polled = await getGenXJobStatus(providerJobId)
    if (!polled) return result(provider, model, 'processing', { providerJobId })
    if (polled.status === 'failed') return result(provider, model, 'failed', { providerJobId, error: polled.error ?? 'GenX job failed.' })
    if (!['completed', 'succeeded'].includes(polled.status)) return result(provider, model, 'processing', { providerJobId })
    return result(provider, model, 'completed', { providerJobId, mediaUrl: polled.resultUrl })
  }
  if (provider === 'qwen') {
    const polled = await pollQwenWanxTask({ taskId: providerJobId, model })
    if (!polled.ok) return result(provider, model, polled.executed ? 'failed' : 'needs_configuration', { providerJobId, error: polled.error })
    const json = polled.json
    const taskStatus = nestedString(json, ['output', 'task_status']) ?? ''
    if (['PENDING', 'RUNNING', 'QUEUED'].includes(taskStatus.toUpperCase())) {
      return result(provider, model, 'processing', { providerJobId, output: json })
    }
    const mediaUrl = nestedString(json, ['output', 'video_url'])
      ?? nestedString(json, ['output', 'results', '0', 'url'])
    if (!mediaUrl) return result(provider, model, 'failed', { providerJobId, output: json, error: 'Provider completed without a media URL.' })
    return result(provider, model, 'completed', { providerJobId, mediaUrl, output: json })
  }
  return result(provider, model, 'failed', {
    providerJobId,
    error: `Provider ${provider} does not expose a polling contract for this adapter.`,
  })
}

export const PROVIDER_CAPABILITY_ADAPTERS: readonly ProviderCapabilityAdapter[] =
  (Object.keys(PROVIDER_CATEGORIES) as ApprovedDirectProviderId[]).map((provider) => ({
    id: `${provider}_capability_adapter`,
    provider,
    categories: PROVIDER_CATEGORIES[provider],
    execute: (input) => adapterExecute(provider, input),
    poll: (providerJobId, input) => pollProvider(provider, providerJobId, input),
  }))

export function getProviderCapabilityAdapter(provider: ApprovedDirectProviderId) {
  return PROVIDER_CAPABILITY_ADAPTERS.find((adapter) => adapter.provider === provider) ?? null
}

export function countProviderAdapterRoutes() {
  return PROVIDER_CAPABILITY_ADAPTERS.reduce(
    (total, adapter) => total + adapter.categories.length,
    0,
  )
}
