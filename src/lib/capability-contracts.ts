/**
 * Canonical Capability Contracts
 *
 * Each capability has a typed contract defining its identity, input/output
 * schemas, provider policy, proof/artifact/job requirements, and example
 * app payloads. The dashboard studio metadata, Studio execution route, and
 * app gateway all reference these contracts for validation and blocker messages.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CapabilityCategory =
  | 'text'
  | 'image'
  | 'video'
  | 'long_form_video'
  | 'music'
  | 'voice'
  | 'avatar'
  | 'scrape_brand'
  | 'rag_knowledge'
  | 'ops'
  | 'app'
  | 'agent_learning'

export type CapabilityMode = 'sync' | 'async' | 'sync_stream' | 'orchestration'

export type CapabilityContractStatus = 'active' | 'blocked' | 'deferred' | 'future' | 'needs_proof'

export type ProofRequirement =
  | 'live_provider_call'
  | 'artifact_persisted'
  | 'webhook_delivery'
  | 'job_completion'
  | 'ffmpeg_assembly'
  | 'asset_reference'
  | 'app_handoff'
  | 'storage_writable'
  | 'provider_key_configured'

export type ActiveV1Provider = 'genx' | 'together' | 'groq'

export interface InputFieldSpec {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'url' | 'select'
  required: boolean
  description: string
  defaultValue?: unknown
  options?: string[]
}

export interface OutputFieldSpec {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'binary' | 'url'
  description: string
}

export interface AssetReferenceSpec {
  type: string
  description: string
  required: boolean
}

export interface ProviderPolicySpec {
  allowedActiveProviders: ActiveV1Provider[]
  primaryProvider?: ActiveV1Provider
  blockedProviders?: string[]
  deferredProviders?: string[]
  notes?: string
}

export interface ExampleAppRequest {
  description: string
  payload: Record<string, unknown>
}

export interface CapabilityContract {
  capabilityId: string
  displayName: string
  studioId: string
  category: CapabilityCategory
  description: string
  status: CapabilityContractStatus
  appFacing: boolean
  mode: CapabilityMode
  inputSchema: InputFieldSpec[]
  outputSchema: OutputFieldSpec[]
  supportedAssetReferences: AssetReferenceSpec[]
  providerPolicy: ProviderPolicySpec
  blockedOrDeferredReason?: string
  proofRequirements: ProofRequirement[]
  artifactRequired: boolean
  jobRequired: boolean
  webhookSupport: boolean
  exampleDashboardRequest: Record<string, unknown>
  exampleAppRequest: ExampleAppRequest
  validationRules: string[]
  connectedAppExamples: string[]
  nextActionIfBlocked?: string
}

// ── Registry ──────────────────────────────────────────────────────────────────

const ACTIVE_PROVIDERS: ActiveV1Provider[] = ['genx', 'together', 'groq']

const TEXT_INPUT_BASE: InputFieldSpec[] = [
  { name: 'prompt', type: 'string', required: true, description: 'The text prompt or instruction' },
  { name: 'systemInstruction', type: 'string', required: false, description: 'System-level instruction for the model' },
  { name: 'tone', type: 'select', required: false, description: 'Tone of the output', options: ['professional', 'casual', 'exciting', 'formal', 'playful'] },
  { name: 'language', type: 'string', required: false, description: 'Output language code', defaultValue: 'en' },
  { name: 'brandVoice', type: 'string', required: false, description: 'Brand voice lock reference' },
  { name: 'forbiddenPhrases', type: 'array', required: false, description: 'Phrases to exclude from output' },
  { name: 'memoryScope', type: 'string', required: false, description: 'Memory scope for context retrieval' },
]

const TEXT_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'text', type: 'string', description: 'Generated text output' },
]

const IMAGE_INPUT_BASE: InputFieldSpec[] = [
  { name: 'prompt', type: 'string', required: true, description: 'Image generation prompt' },
  { name: 'negativePrompt', type: 'string', required: false, description: 'What to avoid in the image' },
  { name: 'aspectRatio', type: 'select', required: false, description: 'Image aspect ratio', defaultValue: '1:1', options: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
  { name: 'width', type: 'number', required: false, description: 'Image width in pixels' },
  { name: 'height', type: 'number', required: false, description: 'Image height in pixels' },
  { name: 'variations', type: 'number', required: false, description: 'Number of variations to generate', defaultValue: 1 },
  { name: 'seed', type: 'number', required: false, description: 'Seed for reproducibility' },
  { name: 'steps', type: 'number', required: false, description: 'Inference steps' },
  { name: 'guidanceScale', type: 'number', required: false, description: 'Guidance scale for generation' },
]

const IMAGE_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'imageUrl', type: 'url', description: 'URL of the generated image' },
  { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
]

const VIDEO_INPUT_BASE: InputFieldSpec[] = [
  { name: 'prompt', type: 'string', required: true, description: 'Video generation prompt' },
  { name: 'negativePrompt', type: 'string', required: false, description: 'What to avoid in the video' },
  { name: 'durationSeconds', type: 'number', required: false, description: 'Target duration in seconds', defaultValue: 4 },
  { name: 'fps', type: 'number', required: false, description: 'Frames per second', defaultValue: 24 },
  { name: 'aspectRatio', type: 'select', required: false, description: 'Video aspect ratio', defaultValue: '16:9', options: ['16:9', '9:16', '1:1'] },
  { name: 'resolution', type: 'string', required: false, description: 'Output resolution' },
  { name: 'outputFormat', type: 'select', required: false, description: 'Output format', defaultValue: 'mp4', options: ['mp4', 'webm'] },
  { name: 'seed', type: 'number', required: false, description: 'Seed for reproducibility' },
  { name: 'guidanceScale', type: 'number', required: false, description: 'Guidance scale' },
  { name: 'cameraMotion', type: 'string', required: false, description: 'Camera motion preset' },
  { name: 'platformPreset', type: 'string', required: false, description: 'Platform preset (e.g. tiktok, youtube)' },
]

const VIDEO_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'videoUrl', type: 'url', description: 'URL of the generated video' },
  { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
  { name: 'jobId', type: 'string', description: 'Async job ID for polling' },
]

const MUSIC_INPUT_BASE: InputFieldSpec[] = [
  { name: 'concept', type: 'string', required: true, description: 'Song concept or theme prompt' },
  { name: 'lyricsMode', type: 'select', required: false, description: 'Lyrics generation mode', defaultValue: 'generate', options: ['generate', 'custom', 'instrumental'] },
  { name: 'customLyrics', type: 'string', required: false, description: 'Custom lyrics when lyricsMode is custom' },
  { name: 'genres', type: 'array', required: false, description: 'Multi-genre selection' },
  { name: 'genreWeights', type: 'object', required: false, description: 'Genre weight distribution (e.g. {amapiano: 0.7, gospel: 0.3})' },
  { name: 'mood', type: 'select', required: false, description: 'Song mood', options: ['uplifting', 'melancholic', 'energetic', 'calm', 'dark', 'romantic', 'nostalgic'] },
  { name: 'bpm', type: 'number', required: false, description: 'Beats per minute / tempo' },
  { name: 'key', type: 'select', required: false, description: 'Musical key', options: ['c', 'g', 'd', 'a', 'e', 'am', 'auto'] },
  { name: 'language', type: 'string', required: false, description: 'Lyrics language', defaultValue: 'en' },
  { name: 'duration', type: 'number', required: false, description: 'Target duration in seconds', defaultValue: 180 },
  { name: 'vocals', type: 'boolean', required: false, description: 'Include vocals', defaultValue: true },
  { name: 'instrumental', type: 'boolean', required: false, description: 'Instrumental only', defaultValue: false },
  { name: 'vocalStyle', type: 'select', required: false, description: 'Vocal style', options: ['lead', 'harmony', 'rap', 'spoken_word', 'choir'] },
  { name: 'instruments', type: 'string', required: false, description: 'Instrument preferences' },
  { name: 'structure', type: 'object', required: false, description: 'Song structure (intro/verse/preChorus/chorus/bridge/outro)' },
  { name: 'coverArtPrompt', type: 'string', required: false, description: 'Cover art generation prompt' },
  { name: 'generateMusicVideoBrief', type: 'boolean', required: false, description: 'Generate music video brief', defaultValue: false },
]

const MUSIC_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'audioUrl', type: 'url', description: 'URL of the generated audio' },
  { name: 'lyrics', type: 'string', description: 'Generated or provided lyrics' },
  { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
  { name: 'jobId', type: 'string', description: 'Async job ID' },
  { name: 'coverArtUrl', type: 'url', description: 'Cover art image URL' },
  { name: 'musicVideoBrief', type: 'object', description: 'Music video brief object' },
]

const VOICE_INPUT_BASE: InputFieldSpec[] = [
  { name: 'text', type: 'string', required: false, description: 'Text to synthesize (TTS)' },
  { name: 'audioUrl', type: 'url', required: false, description: 'Audio URL for STT/dubbing' },
  { name: 'voice', type: 'string', required: false, description: 'Voice ID or preset' },
  { name: 'language', type: 'string', required: false, description: 'Language code', defaultValue: 'en' },
  { name: 'style', type: 'string', required: false, description: 'Speaking style or emotion' },
  { name: 'speed', type: 'number', required: false, description: 'Speech speed multiplier', defaultValue: 1.0 },
  { name: 'responseFormat', type: 'select', required: false, description: 'Output format', defaultValue: 'mp3', options: ['mp3', 'wav', 'ogg', 'raw'] },
  { name: 'diarization', type: 'boolean', required: false, description: 'Speaker diarization', defaultValue: false },
  { name: 'wordTimestamps', type: 'boolean', required: false, description: 'Include word-level timestamps', defaultValue: false },
  { name: 'subtitleExport', type: 'array', required: false, description: 'Subtitle formats to export', defaultValue: [] },
]

const VOICE_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'audioUrl', type: 'url', description: 'URL of the generated/processed audio' },
  { name: 'transcript', type: 'string', description: 'Transcribed text (STT)' },
  { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
  { name: 'subtitleUrl', type: 'url', description: 'Subtitle file URL' },
]

const AVATAR_INPUT_BASE: InputFieldSpec[] = [
  { name: 'avatarLibrary', type: 'string', required: false, description: 'Avatar library reference', defaultValue: 'default' },
  { name: 'avatarProfileId', type: 'string', required: false, description: 'Specific avatar profile ID' },
  { name: 'avatarStyle', type: 'select', required: false, description: 'Avatar style', options: ['realistic', 'anime', 'cartoon', '3d'] },
  { name: 'faceImageReference', type: 'url', required: false, description: 'Face/image reference URL' },
  { name: 'mode', type: 'select', required: false, description: 'Avatar mode', defaultValue: 'image', options: ['image', 'talking_head', 'presenter'] },
  { name: 'voiceBinding', type: 'string', required: false, description: 'Voice binding ID from Voice Studio' },
  { name: 'script', type: 'string', required: false, description: 'Script for talking head/presenter' },
  { name: 'sourceAudio', type: 'url', required: false, description: 'Source audio for lip-sync' },
  { name: 'language', type: 'string', required: false, description: 'Language code', defaultValue: 'en' },
  { name: 'emotion', type: 'select', required: false, description: 'Emotion state', options: ['neutral', 'happy', 'confident', 'serious', 'excited'] },
  { name: 'cameraFraming', type: 'select', required: false, description: 'Camera framing', options: ['talking_head', 'full_body', 'presenter'] },
  { name: 'background', type: 'string', required: false, description: 'Background style or URL' },
  { name: 'subtitles', type: 'boolean', required: false, description: 'Include subtitles', defaultValue: false },
  { name: 'approvalRequired', type: 'boolean', required: false, description: 'Require approval before delivery', defaultValue: false },
]

const AVATAR_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'avatarUrl', type: 'url', description: 'Avatar image or video URL' },
  { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
  { name: 'jobId', type: 'string', description: 'Async job ID' },
]

const BRAND_INPUT_BASE: InputFieldSpec[] = [
  { name: 'websiteUrl', type: 'url', required: true, description: 'Website URL to scrape' },
  { name: 'crawlDepth', type: 'number', required: false, description: 'Crawl depth', defaultValue: 2 },
  { name: 'maxPages', type: 'number', required: false, description: 'Maximum pages to crawl' },
  { name: 'includePatterns', type: 'array', required: false, description: 'URL patterns to include' },
  { name: 'excludePatterns', type: 'array', required: false, description: 'URL patterns to exclude' },
  { name: 'renderJs', type: 'boolean', required: false, description: 'Render JavaScript', defaultValue: false },
  { name: 'screenshotCapture', type: 'boolean', required: false, description: 'Capture screenshots', defaultValue: false },
  { name: 'extractionGoals', type: 'array', required: false, description: 'What to extract', defaultValue: ['logos', 'colors', 'products'] },
]

const BRAND_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'logos', type: 'array', description: 'Extracted logo URLs' },
  { name: 'colors', type: 'array', description: 'Color palette' },
  { name: 'fonts', type: 'array', description: 'Detected fonts' },
  { name: 'brandPack', type: 'object', description: 'Assembled brand pack' },
  { name: 'knowledgeSet', type: 'object', description: 'Knowledge set for RAG' },
]

const RAG_INPUT_BASE: InputFieldSpec[] = [
  { name: 'sourceUrls', type: 'array', required: false, description: 'Source URLs for ingestion' },
  { name: 'uploadedFiles', type: 'array', required: false, description: 'Uploaded file references' },
  { name: 'question', type: 'string', required: false, description: 'Question for RAG answer' },
  { name: 'chunkingPreset', type: 'select', required: false, description: 'Chunking strategy', defaultValue: 'standard', options: ['small', 'standard', 'large'] },
  { name: 'embeddingModel', type: 'string', required: false, description: 'Embedding model to use' },
  { name: 'collectionName', type: 'string', required: false, description: 'Knowledge collection name' },
  { name: 'topK', type: 'number', required: false, description: 'Number of results to retrieve', defaultValue: 6 },
  { name: 'rerank', type: 'boolean', required: false, description: 'Enable reranking', defaultValue: false },
  { name: 'citationsRequired', type: 'boolean', required: false, description: 'Require citations in answer', defaultValue: true },
]

const RAG_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'answer', type: 'string', description: 'Generated answer' },
  { name: 'citations', type: 'array', description: 'Source citations' },
  { name: 'confidence', type: 'number', description: 'Confidence score' },
  { name: 'ingestionStatus', type: 'string', description: 'Ingestion status' },
]

const _OPS_INPUT_BASE: InputFieldSpec[] = [
  { name: 'jobId', type: 'string', required: false, description: 'Job ID for status lookup' },
  { name: 'artifactId', type: 'string', required: false, description: 'Artifact ID' },
  { name: 'capability', type: 'string', required: false, description: 'Target capability' },
]

const _OPS_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'jobState', type: 'string', description: 'Current job state' },
  { name: 'artifactUrl', type: 'url', description: 'Artifact download URL' },
  { name: 'webhookDeliveryState', type: 'string', description: 'Webhook delivery state' },
]

const APP_INPUT_BASE: InputFieldSpec[] = [
  { name: 'appId', type: 'string', required: true, description: 'External app identifier' },
  { name: 'webhookUrl', type: 'url', required: false, description: 'Webhook callback URL' },
  { name: 'allowedCapabilities', type: 'array', required: false, description: 'Allowed capability IDs' },
  { name: 'budgetLimits', type: 'object', required: false, description: 'Budget limits per capability' },
  { name: 'rateLimits', type: 'object', required: false, description: 'Rate limits' },
]

const APP_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'connectionStatus', type: 'string', description: 'Connection status' },
  { name: 'apiKeyStatus', type: 'string', description: 'API key status' },
  { name: 'permissionContract', type: 'object', description: 'Capability permission contract' },
]

const AGENT_INPUT_BASE: InputFieldSpec[] = [
  { name: 'goal', type: 'string', required: true, description: 'Agent goal or task description' },
  { name: 'toolsAllowed', type: 'array', required: false, description: 'Allowed tools/capabilities' },
  { name: 'appScope', type: 'string', required: false, description: 'App scope boundary' },
  { name: 'memoryScope', type: 'string', required: false, description: 'Memory scope' },
  { name: 'approvalMode', type: 'select', required: false, description: 'Approval mode', defaultValue: 'manual', options: ['manual', 'auto'] },
  { name: 'spendCap', type: 'number', required: false, description: 'Maximum spend per run', defaultValue: 0 },
]

const AGENT_OUTPUT_BASE: OutputFieldSpec[] = [
  { name: 'runRecord', type: 'object', description: 'Agent run record' },
  { name: 'learningSummary', type: 'string', description: 'Learning summary' },
  { name: 'recommendation', type: 'string', description: 'Recommendation output' },
]

// ── Contract Builders ─────────────────────────────────────────────────────────

function textContract(
  id: string,
  displayName: string,
  description: string,
  extraInput: InputFieldSpec[] = [],
  extraOutput: OutputFieldSpec[] = [],
  extraValidation: string[] = [],
): CapabilityContract {
  return {
    capabilityId: id,
    displayName,
    studioId: 'text-chat',
    category: 'text',
    description,
    status: 'active',
    appFacing: true,
    mode: id === 'text.chat' ? 'sync_stream' : 'sync',
    inputSchema: [...TEXT_INPUT_BASE, ...extraInput],
    outputSchema: [...TEXT_OUTPUT_BASE, ...extraOutput],
    supportedAssetReferences: [
      { type: 'brand_guide', description: 'Brand guide PDF for voice/style lock', required: false },
      { type: 'source_document', description: 'Source document for summarization/extraction', required: false },
    ],
    providerPolicy: {
      allowedActiveProviders: [...ACTIVE_PROVIDERS],
      notes: 'Runtime selects provider. Apps never send provider or model.',
    },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { prompt: 'Write launch copy for this brand.', controls: { tone: 'premium' } },
    exampleAppRequest: {
      description: 'Marketing App daily caption request',
      payload: { capability: id, input: { prompt: 'Write a Facebook caption for today\'s product launch.' }, context: { appId: 'marketing-app', tenantId: 'tenant_demo' }, controls: { tone: 'exciting', language: 'en' } },
    },
    validationRules: ['prompt is required', 'prompt must be non-empty string', ...extraValidation],
    connectedAppExamples: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
  }
}

function imageContract(
  id: string,
  displayName: string,
  description: string,
  extraInput: InputFieldSpec[] = [],
  extraValidation: string[] = [],
): CapabilityContract {
  return {
    capabilityId: id,
    displayName,
    studioId: 'image',
    category: 'image',
    description,
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [...IMAGE_INPUT_BASE, ...extraInput],
    outputSchema: IMAGE_OUTPUT_BASE,
    supportedAssetReferences: [
      { type: 'reference_image', description: 'Reference image for style/content guidance', required: false },
      { type: 'logo', description: 'Logo URL for placement', required: false },
      { type: 'brand_guide', description: 'Brand guide for palette/typography lock', required: false },
      { type: 'product_image', description: 'Product image for mockup', required: false },
    ],
    providerPolicy: {
      allowedActiveProviders: ['together', 'genx'],
      primaryProvider: 'together',
      notes: 'Together image path is primary/proven where configured; GenX is fallback where wired.',
    },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { prompt: 'Premium product launch visual.', controls: { aspectRatio: '1:1', variations: 2, seed: 42 } },
    exampleAppRequest: {
      description: 'Marketing App campaign image',
      payload: { capability: id, input: { prompt: 'Create a campaign visual for summer sale.' }, assetReferences: [{ type: 'logo', url: 'signed-app-url' }], controls: { aspectRatio: '1:1', variations: 2, seed: 42 } },
    },
    validationRules: ['prompt is required', 'prompt must be non-empty string', ...extraValidation],
    connectedAppExamples: ['Marketing App', 'Music App', 'Religious App', 'Crypto App'],
  }
}

function videoContract(
  id: string,
  displayName: string,
  description: string,
  extraInput: InputFieldSpec[] = [],
  extraValidation: string[] = [],
): CapabilityContract {
  return {
    capabilityId: id,
    displayName,
    studioId: 'video',
    category: 'video',
    description,
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [...VIDEO_INPUT_BASE, ...extraInput],
    outputSchema: VIDEO_OUTPUT_BASE,
    supportedAssetReferences: [
      { type: 'reference_image', description: 'Reference image for image-to-video', required: id === 'video.image_to_video' },
      { type: 'source_video', description: 'Source video for edit mode', required: false },
      { type: 'audio', description: 'Audio input for video', required: false },
      { type: 'first_frame', description: 'First frame reference', required: false },
      { type: 'last_frame', description: 'Last frame reference', required: false },
    ],
    providerPolicy: {
      allowedActiveProviders: ['genx', 'together'],
      notes: 'GenX exposes model-family cards; Kling is a GenX model family. Together video is async and model-specific.',
    },
    proofRequirements: ['live_provider_call', 'artifact_persisted', 'job_completion'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { prompt: 'Animate this product image into a 6 second reel.', controls: { durationSeconds: 6, fps: 24, aspectRatio: '9:16', seed: 12 } },
    exampleAppRequest: {
      description: 'Marketing App reel',
      payload: { capability: id, input: { prompt: 'Create a 6-second product reel.' }, assetReferences: [{ type: 'image', url: 'signed-app-url' }], controls: { durationSeconds: 6, fps: 24, aspectRatio: '9:16' } },
    },
    validationRules: ['prompt is required', 'duration must be positive number', ...extraValidation],
    connectedAppExamples: ['Marketing App', 'Music App', 'Crypto App'],
  }
}

// ── Full Registry ─────────────────────────────────────────────────────────────

export const CAPABILITY_CONTRACTS: readonly CapabilityContract[] = [
  // ══ TEXT ════════════════════════════════════════════════════════════════════
  textContract('text.chat', 'Text Chat', 'Conversational AI with reasoning, drafting, planning, and summarization.', [
    { name: 'streaming', type: 'boolean', required: false, description: 'Enable streaming response', defaultValue: false },
    { name: 'schemaMode', type: 'string', required: false, description: 'JSON schema mode for structured output' },
    { name: 'strictJson', type: 'boolean', required: false, description: 'Force strict JSON output', defaultValue: false },
    { name: 'reasoningMode', type: 'select', required: false, description: 'Reasoning depth', options: ['fast', 'balanced', 'deep'] },
    { name: 'toolPermissions', type: 'array', required: false, description: 'Allowed tool names' },
  ]),

  textContract('text.generate', 'Text Generate', 'Generate text content from a prompt with optional style and format controls.'),

  textContract('text.summarize', 'Text Summarize', 'Summarize long-form text into concise output.', [
    { name: 'maxLength', type: 'number', required: false, description: 'Maximum summary length' },
    { name: 'sourceDocument', type: 'string', required: false, description: 'Source document content or reference' },
  ]),

  textContract('text.structured_output', 'Structured Output', 'Generate structured JSON output matching a provided schema.', [
    { name: 'schemaMode', type: 'string', required: true, description: 'JSON schema definition or reference' },
    { name: 'strictJson', type: 'boolean', required: false, description: 'Enforce strict JSON compliance', defaultValue: true },
  ], [{ name: 'structuredData', type: 'object', description: 'Structured JSON output matching schema' }], ['schemaMode is required']),

  textContract('text.scriptwrite', 'Script Write', 'Write scripts for video, voiceover, podcast, or presentation.', [
    { name: 'scriptType', type: 'select', required: false, description: 'Script type', options: ['video', 'voiceover', 'podcast', 'presentation', 'ad'] },
    { name: 'duration', type: 'number', required: false, description: 'Target duration in seconds' },
  ]),

  textContract('text.copywrite', 'Copywrite', 'Marketing copy generation with brand voice and audience targeting.', [
    { name: 'audience', type: 'string', required: false, description: 'Target audience' },
    { name: 'platform', type: 'string', required: false, description: 'Target platform (e.g. facebook, instagram, email)' },
    { name: 'variantCount', type: 'number', required: false, description: 'Number of copy variants', defaultValue: 1 },
  ]),

  // ══ IMAGE ══════════════════════════════════════════════════════════════════
  imageContract('image.generate', 'Image Generate', 'Generate images from text prompts with style, aspect, and seed controls.'),

  imageContract('image.edit', 'Image Edit', 'Edit an existing image with inpainting, outpainting, or style transfer.', [
    { name: 'sourceImageUrl', type: 'url', required: true, description: 'Source image to edit' },
    { name: 'maskUrl', type: 'url', required: false, description: 'Mask for inpainting' },
  ], ['sourceImageUrl is required']),

  imageContract('image.variation', 'Image Variation', 'Generate variations of an existing image.', [
    { name: 'sourceImageUrl', type: 'url', required: true, description: 'Source image for variations' },
    { name: 'variationStrength', type: 'number', required: false, description: 'Variation strength 0-1', defaultValue: 0.5 },
  ], ['sourceImageUrl is required']),

  imageContract('image.brand_creative', 'Brand Creative', 'Generate brand-aligned creative assets with logo, palette, and typography lock.', [
    { name: 'logoPlacement', type: 'select', required: false, description: 'Logo placement', options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'watermark'] },
    { name: 'paletteLock', type: 'boolean', required: false, description: 'Lock to brand palette', defaultValue: false },
    { name: 'typographyLock', type: 'boolean', required: false, description: 'Lock to brand typography', defaultValue: false },
    { name: 'brandImageVariantMode', type: 'string', required: false, description: 'Brand image variant mode' },
  ]),

  imageContract('image.thumbnail', 'Thumbnail', 'Generate thumbnails with safe-zone awareness.', [
    { name: 'thumbnailSafeZone', type: 'boolean', required: false, description: 'Respect thumbnail safe zones', defaultValue: true },
    { name: 'platform', type: 'select', required: false, description: 'Target platform', options: ['youtube', 'tiktok', 'instagram', 'general'] },
  ]),

  imageContract('image.cover_art', 'Cover Art', 'Generate album or podcast cover art.', [
    { name: 'title', type: 'string', required: false, description: 'Title text for cover' },
    { name: 'artist', type: 'string', required: false, description: 'Artist name' },
  ]),

  imageContract('image.product_mockup', 'Product Mockup', 'Generate product mockups with reference product images.', [
    { name: 'productImageUrl', type: 'url', required: true, description: 'Product image URL' },
    { name: 'mockupStyle', type: 'select', required: false, description: 'Mockup style', options: ['studio', 'lifestyle', 'flat_lay', 'packaging'] },
  ], ['productImageUrl is required']),

  // ══ VIDEO ══════════════════════════════════════════════════════════════════
  videoContract('video.generate', 'Video Generate', 'Generate short video clips from text prompts.'),

  videoContract('video.image_to_video', 'Image to Video', 'Animate a reference image into a video clip.', [
    { name: 'referenceImageUrl', type: 'url', required: true, description: 'Reference image to animate' },
  ], ['referenceImageUrl is required for image-to-video']),

  videoContract('video.reference_to_video', 'Reference to Video', 'Generate video using reference images for style/content guidance.', [
    { name: 'referenceImages', type: 'array', required: true, description: 'Reference images for guidance' },
  ], ['referenceImages is required']),

  videoContract('video.edit', 'Video Edit', 'Edit existing video with style transfer, cuts, or transformations.', [
    { name: 'sourceVideoUrl', type: 'url', required: true, description: 'Source video URL' },
  ], ['sourceVideoUrl is required']),

  videoContract('video.reel', 'Video Reel', 'Generate short-form reels optimized for social platforms.', [
    { name: 'platformPreset', type: 'select', required: false, description: 'Target platform', defaultValue: 'instagram', options: ['instagram', 'tiktok', 'youtube_shorts', 'facebook'] },
  ]),

  videoContract('video.ad', 'Video Ad', 'Generate advertising video clips with CTA support.', [
    { name: 'ctaText', type: 'string', required: false, description: 'Call-to-action text' },
    { name: 'brandName', type: 'string', required: false, description: 'Brand name for overlay' },
  ]),

  videoContract('video.music_clip', 'Music Video Clip', 'Generate music video clips from song and visual direction.', [
    { name: 'audioUrl', type: 'url', required: false, description: 'Audio track URL' },
    { name: 'visualStyle', type: 'string', required: false, description: 'Visual style direction' },
  ]),

  // ══ LONG-FORM VIDEO ═══════════════════════════════════════════════════════
  {
    capabilityId: 'video.longform',
    displayName: 'Long-form Video',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Orchestrate multi-scene long-form video with planning, scene generation, voice, music, and ffmpeg assembly.',
    status: 'active',
    appFacing: true,
    mode: 'orchestration',
    inputSchema: [
      { name: 'sourceMode', type: 'select', required: true, description: 'Source mode', options: ['outline', 'script', 'url', 'brand_pack', 'song'] },
      { name: 'outline', type: 'string', required: false, description: 'High-level outline or script' },
      { name: 'targetDuration', type: 'string', required: false, description: 'Target duration (e.g. 180s)', defaultValue: '180s' },
      { name: 'sceneCount', type: 'number', required: false, description: 'Number of scenes', defaultValue: 6 },
      { name: 'aspectTargets', type: 'array', required: false, description: 'Target aspect ratios', defaultValue: ['16:9'] },
      { name: 'cutdowns', type: 'array', required: false, description: 'Cutdown durations (e.g. ["15s", "30s"])' },
      { name: 'voiceoverPolicy', type: 'select', required: false, description: 'Voiceover policy', options: ['on', 'off', 'auto'] },
      { name: 'musicBedPolicy', type: 'select', required: false, description: 'Music bed policy', options: ['on', 'off', 'auto'] },
      { name: 'subtitleStyle', type: 'string', required: false, description: 'Subtitle style' },
      { name: 'avatarPresenterPolicy', type: 'string', required: false, description: 'Avatar presenter policy' },
    ],
    outputSchema: [
      { name: 'sceneManifest', type: 'object', description: 'Scene manifest with per-scene details' },
      { name: 'finalVideoUrl', type: 'url', description: 'Final assembled video URL' },
      { name: 'artifactId', type: 'string', description: 'Persisted artifact ID' },
      { name: 'jobId', type: 'string', description: 'Orchestration job ID' },
      { name: 'cutdownUrls', type: 'array', description: 'Cutdown video URLs' },
    ],
    supportedAssetReferences: [
      { type: 'brand_pack', description: 'Brand pack for styling', required: false },
      { type: 'knowledge_set', description: 'Knowledge set for content', required: false },
      { type: 'song_artifact', description: 'Song artifact for music bed', required: false },
      { type: 'voice_reference', description: 'Voice reference for voiceover', required: false },
    ],
    providerPolicy: {
      allowedActiveProviders: [...ACTIVE_PROVIDERS],
      notes: 'Orchestration capability using GenX, Together, Groq, and ffmpeg. Not one provider call.',
    },
    proofRequirements: ['job_completion', 'artifact_persisted', 'ffmpeg_assembly'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { input: { sourceMode: 'outline', outline: 'Three minute launch explainer.' }, controls: { targetDuration: '180s', sceneCount: 12, aspectTargets: ['16:9', '9:16'], cutdowns: ['15s', '30s', '60s'] } },
    exampleAppRequest: {
      description: 'Marketing App launch explainer',
      payload: { capability: 'video.longform', input: { sourceMode: 'outline', outline: 'Three minute product launch explainer.' }, controls: { targetDuration: '180s', sceneCount: 12, aspectTargets: ['16:9', '9:16'], cutdowns: ['15s', '30s', '60s'] } },
    },
    validationRules: ['sourceMode is required', 'targetDuration must be positive'],
    connectedAppExamples: ['Marketing App', 'Music App', 'Religious App', 'Crypto App'],
    nextActionIfBlocked: 'Prove scene artifact persistence and ffmpeg assembly.',
  },

  {
    capabilityId: 'video.scene_plan',
    displayName: 'Scene Plan',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Plan scenes for long-form video from outline or script.',
    status: 'active',
    appFacing: false,
    mode: 'sync',
    inputSchema: [
      { name: 'outline', type: 'string', required: true, description: 'Outline or script' },
      { name: 'sceneCount', type: 'number', required: false, description: 'Target scene count', defaultValue: 6 },
    ],
    outputSchema: [{ name: 'sceneManifest', type: 'object', description: 'Planned scene manifest' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { outline: 'Product launch video', sceneCount: 8 },
    exampleAppRequest: { description: 'Scene planning for long-form', payload: { capability: 'video.scene_plan', input: { outline: 'Product launch video', sceneCount: 8 } } },
    validationRules: ['outline is required'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  {
    capabilityId: 'video.scene_generate',
    displayName: 'Scene Generate',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Generate individual scene clips for long-form video assembly.',
    status: 'active',
    appFacing: false,
    mode: 'async',
    inputSchema: [
      { name: 'scenePrompt', type: 'string', required: true, description: 'Per-scene prompt' },
      { name: 'durationSeconds', type: 'number', required: false, description: 'Scene duration', defaultValue: 8 },
      { name: 'style', type: 'string', required: false, description: 'Visual style' },
    ],
    outputSchema: [{ name: 'sceneVideoUrl', type: 'url', description: 'Generated scene video URL' }, { name: 'artifactId', type: 'string', description: 'Scene artifact ID' }],
    supportedAssetReferences: [{ type: 'reference_image', description: 'Scene reference image', required: false }],
    providerPolicy: { allowedActiveProviders: ['genx', 'together'] },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: false,
    exampleDashboardRequest: { scenePrompt: 'Aerial city skyline at sunset', durationSeconds: 8 },
    exampleAppRequest: { description: 'Scene clip generation', payload: { capability: 'video.scene_generate', input: { scenePrompt: 'Aerial city skyline at sunset', durationSeconds: 8 } } },
    validationRules: ['scenePrompt is required'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  {
    capabilityId: 'video.assemble',
    displayName: 'Video Assemble',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Assemble scene clips into final long-form video using ffmpeg.',
    status: 'active',
    appFacing: false,
    mode: 'orchestration',
    inputSchema: [
      { name: 'sceneIds', type: 'array', required: true, description: 'Ordered scene artifact IDs' },
      { name: 'transitions', type: 'array', required: false, description: 'Transition presets between scenes' },
      { name: 'musicBedUrl', type: 'url', required: false, description: 'Music bed audio URL' },
      { name: 'voiceoverUrl', type: 'url', required: false, description: 'Voiceover audio URL' },
      { name: 'subtitleFile', type: 'file', required: false, description: 'Subtitle file (SRT/VTT)' },
    ],
    outputSchema: [{ name: 'finalVideoUrl', type: 'url', description: 'Assembled video URL' }, { name: 'artifactId', type: 'string', description: 'Final artifact ID' }],
    supportedAssetReferences: [{ type: 'scene_artifact', description: 'Scene clip artifacts', required: true }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'ffmpeg assembly is local infrastructure, not a provider call.' },
    proofRequirements: ['ffmpeg_assembly', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { sceneIds: ['scene_1', 'scene_2', 'scene_3'] },
    exampleAppRequest: { description: 'Assemble scenes into final video', payload: { capability: 'video.assemble', input: { sceneIds: ['scene_1', 'scene_2', 'scene_3'] } } },
    validationRules: ['sceneIds is required and must be non-empty array'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  {
    capabilityId: 'video.cutdown_pack',
    displayName: 'Cutdown Pack',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Generate cutdown versions of a long-form video for different platforms.',
    status: 'active',
    appFacing: false,
    mode: 'orchestration',
    inputSchema: [
      { name: 'sourceVideoId', type: 'string', required: true, description: 'Source video artifact ID' },
      { name: 'cutdownDurations', type: 'array', required: true, description: 'Target cutdown durations', defaultValue: ['15s', '30s', '60s'] },
      { name: 'aspectTargets', type: 'array', required: false, description: 'Target aspect ratios' },
    ],
    outputSchema: [{ name: 'cutdownUrls', type: 'array', description: 'Cutdown video URLs' }],
    supportedAssetReferences: [{ type: 'source_video', description: 'Source long-form video', required: true }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['ffmpeg_assembly', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { sourceVideoId: 'video_longform_1', cutdownDurations: ['15s', '30s', '60s'] },
    exampleAppRequest: { description: 'Generate cutdowns', payload: { capability: 'video.cutdown_pack', input: { sourceVideoId: 'video_longform_1', cutdownDurations: ['15s', '30s', '60s'] } } },
    validationRules: ['sourceVideoId is required', 'cutdownDurations is required'],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'video.marketing_reels_pack',
    displayName: 'Marketing Reels Pack',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Generate a pack of marketing reels from a long-form video or brand content.',
    status: 'active',
    appFacing: true,
    mode: 'orchestration',
    inputSchema: [
      { name: 'sourceVideoId', type: 'string', required: false, description: 'Source video artifact ID' },
      { name: 'reelCount', type: 'number', required: false, description: 'Number of reels', defaultValue: 3 },
      { name: 'platforms', type: 'array', required: false, description: 'Target platforms', defaultValue: ['instagram', 'tiktok'] },
      { name: 'brandPack', type: 'string', required: false, description: 'Brand pack reference' },
    ],
    outputSchema: [{ name: 'reelUrls', type: 'array', description: 'Generated reel URLs' }],
    supportedAssetReferences: [{ type: 'source_video', description: 'Source video', required: false }, { type: 'brand_pack', description: 'Brand pack', required: false }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['ffmpeg_assembly', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { sourceVideoId: 'video_longform_1', reelCount: 3, platforms: ['instagram', 'tiktok'] },
    exampleAppRequest: {
      description: 'Marketing App daily reels pack',
      payload: { capability: 'video.marketing_reels_pack', input: { reelCount: 3, platforms: ['instagram', 'tiktok'] }, context: { appId: 'marketing-app' } },
    },
    validationRules: [],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'video.music_video',
    displayName: 'Music Video',
    studioId: 'long-form-video',
    category: 'long_form_video',
    description: 'Generate a music video from song artifact and visual direction.',
    status: 'active',
    appFacing: true,
    mode: 'orchestration',
    inputSchema: [
      { name: 'songArtifactId', type: 'string', required: true, description: 'Song artifact ID' },
      { name: 'visualStyle', type: 'string', required: false, description: 'Visual style direction' },
      { name: 'storyConcept', type: 'string', required: false, description: 'Story concept' },
      { name: 'sceneCount', type: 'number', required: false, description: 'Scene count', defaultValue: 6 },
    ],
    outputSchema: [{ name: 'musicVideoUrl', type: 'url', description: 'Music video URL' }, { name: 'artifactId', type: 'string', description: 'Artifact ID' }],
    supportedAssetReferences: [{ type: 'song_artifact', description: 'Song audio artifact', required: true }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['job_completion', 'ffmpeg_assembly', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { songArtifactId: 'song_1', visualStyle: 'cinematic', sceneCount: 8 },
    exampleAppRequest: { description: 'Music App music video', payload: { capability: 'video.music_video', input: { songArtifactId: 'song_1', visualStyle: 'cinematic', sceneCount: 8 }, context: { appId: 'music-app' } } },
    validationRules: ['songArtifactId is required'],
    connectedAppExamples: ['Music App'],
  },

  // ══ MUSIC ══════════════════════════════════════════════════════════════════
  {
    capabilityId: 'music.lyrics',
    displayName: 'Lyrics Generation',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate lyrics from concept, genre, mood, and structure controls.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'concept', type: 'string', required: true, description: 'Song concept or theme' },
      { name: 'genres', type: 'array', required: false, description: 'Genre tags' },
      { name: 'genreWeights', type: 'object', required: false, description: 'Genre weight distribution' },
      { name: 'mood', type: 'string', required: false, description: 'Mood' },
      { name: 'language', type: 'string', required: false, description: 'Lyrics language', defaultValue: 'en' },
      { name: 'structure', type: 'object', required: false, description: 'Song structure sections' },
    ],
    outputSchema: [{ name: 'lyrics', type: 'string', description: 'Generated lyrics' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Text generation for lyrics. Any active provider can assist.' },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { concept: 'A hopeful amapiano gospel song.', controls: { genres: ['amapiano', 'gospel'], genreWeights: { amapiano: 0.7, gospel: 0.3 } } },
    exampleAppRequest: {
      description: 'Music App lyrics request',
      payload: { capability: 'music.lyrics', input: { concept: 'A hopeful amapiano gospel song.', genres: ['amapiano', 'gospel'], genreWeights: { amapiano: 0.7, gospel: 0.3 }, mood: 'uplifting', language: 'en', structure: { intro: '8 bars', verse: '16 bars', chorus: '8 bars', bridge: '8 bars', outro: 'fade' } }, context: { appId: 'music-app' } },
    },
    validationRules: ['concept is required'],
    connectedAppExamples: ['Music App', 'Marketing App'],
  },

  {
    capabilityId: 'music.song',
    displayName: 'Song Generation',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate a full song with vocals, instruments, structure, and production controls. Requires GENX_MUSIC_MODEL.',
    status: 'blocked',
    appFacing: true,
    mode: 'async',
    inputSchema: MUSIC_INPUT_BASE,
    outputSchema: MUSIC_OUTPUT_BASE,
    supportedAssetReferences: [
      { type: 'reference_track', description: 'Reference track for style', required: false },
      { type: 'lyrics_document', description: 'Lyrics document', required: false },
      { type: 'cover_image', description: 'Cover art reference', required: false },
    ],
    providerPolicy: {
      allowedActiveProviders: ['genx'],
      primaryProvider: 'genx',
      notes: 'GenX is primary for final song. Blocked if GENX_MUSIC_MODEL missing. Groq/Together may support lyrics/briefs, not fake final song output.',
    },
    blockedOrDeferredReason: 'GenX music audio requires GENX_MUSIC_MODEL with GenX credentials.',
    proofRequirements: ['live_provider_call', 'artifact_persisted', 'job_completion'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { capability: 'music.song', input: { concept: 'A hopeful amapiano gospel song.' }, controls: { genres: ['amapiano', 'gospel'], genreWeights: { amapiano: 0.7, gospel: 0.3 }, bpmRange: [108, 116], vocals: true, structure: ['intro', 'verse', 'chorus', 'bridge', 'outro'] } },
    exampleAppRequest: {
      description: 'Music App multi-genre song request',
      payload: {
        capability: 'music.song',
        input: { concept: 'A hopeful amapiano gospel song celebrating new beginnings.' },
        controls: {
          genres: ['amapiano', 'gospel'],
          genreWeights: { amapiano: 0.7, gospel: 0.3 },
          mood: 'uplifting',
          bpm: 112,
          key: 'am',
          language: 'en',
          duration: 210,
          vocals: true,
          vocalStyle: 'lead',
          instruments: 'piano, synth bass, percussion, strings',
          structure: { intro: '8 bars instrumental', verse: '16 bars', chorus: '8 bars hook', bridge: '8 bars breakdown', outro: '4 bars fade' },
          coverArtPrompt: 'Golden sunrise over African landscape, gospel and amapiano fusion vibes',
          generateMusicVideoBrief: true,
        },
        context: { appId: 'music-app', tenantId: 'tenant_demo' },
      },
    },
    validationRules: ['concept is required', 'GENX_MUSIC_MODEL must be configured'],
    connectedAppExamples: ['Music App'],
    nextActionIfBlocked: 'Set GENX_MUSIC_MODEL env var, then run Pack A music proof.',
  },

  {
    capabilityId: 'music.instrumental',
    displayName: 'Instrumental Generation',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate instrumental tracks without vocals.',
    status: 'blocked',
    appFacing: true,
    mode: 'async',
    inputSchema: MUSIC_INPUT_BASE.map((f) => f.name === 'instrumental' ? { ...f, defaultValue: true, required: false } : f),
    outputSchema: MUSIC_OUTPUT_BASE,
    supportedAssetReferences: [{ type: 'reference_track', description: 'Reference track', required: false }],
    providerPolicy: { allowedActiveProviders: ['genx'], primaryProvider: 'genx', notes: 'Same as music.song with instrumental=true.' },
    blockedOrDeferredReason: 'Requires GENX_MUSIC_MODEL.',
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: false,
    exampleDashboardRequest: { concept: 'Cinematic orchestral instrumental.', controls: { genres: ['cinematic', 'orchestral'], instrumental: true } },
    exampleAppRequest: { description: 'Instrumental track', payload: { capability: 'music.instrumental', input: { concept: 'Cinematic orchestral instrumental.' }, controls: { genres: ['cinematic', 'orchestral'], instrumental: true, bpm: 90 }, context: { appId: 'music-app' } } },
    validationRules: ['concept is required', 'GENX_MUSIC_MODEL must be configured'],
    connectedAppExamples: ['Music App', 'Marketing App'],
    nextActionIfBlocked: 'Set GENX_MUSIC_MODEL env var.',
  },

  {
    capabilityId: 'music.loop',
    displayName: 'Music Loop',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate short music loops for backgrounds, games, or content.',
    status: 'blocked',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'concept', type: 'string', required: true, description: 'Loop concept' },
      { name: 'genres', type: 'array', required: false, description: 'Genre tags' },
      { name: 'bpm', type: 'number', required: false, description: 'BPM' },
      { name: 'duration', type: 'number', required: false, description: 'Loop duration in seconds', defaultValue: 30 },
    ],
    outputSchema: [{ name: 'audioUrl', type: 'url', description: 'Loop audio URL' }, { name: 'artifactId', type: 'string', description: 'Artifact ID' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: ['genx'], primaryProvider: 'genx' },
    blockedOrDeferredReason: 'Requires GENX_MUSIC_MODEL.',
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: false,
    exampleDashboardRequest: { concept: 'Chill lo-fi loop', bpm: 85, duration: 30 },
    exampleAppRequest: { description: 'Background loop', payload: { capability: 'music.loop', input: { concept: 'Chill lo-fi loop', bpm: 85, duration: 30 }, context: { appId: 'marketing-app' } } },
    validationRules: ['concept is required'],
    connectedAppExamples: ['Marketing App', 'Music App'],
    nextActionIfBlocked: 'Set GENX_MUSIC_MODEL env var.',
  },

  {
    capabilityId: 'music.cover_art',
    displayName: 'Music Cover Art',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate album or single cover art for music releases.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'prompt', type: 'string', required: true, description: 'Cover art prompt' },
      { name: 'title', type: 'string', required: false, description: 'Song/album title' },
      { name: 'artist', type: 'string', required: false, description: 'Artist name' },
      { name: 'style', type: 'string', required: false, description: 'Visual style' },
    ],
    outputSchema: [{ name: 'imageUrl', type: 'url', description: 'Cover art URL' }, { name: 'artifactId', type: 'string', description: 'Artifact ID' }],
    supportedAssetReferences: [{ type: 'reference_image', description: 'Style reference', required: false }],
    providerPolicy: { allowedActiveProviders: ['together', 'genx'], notes: 'Uses image generation providers.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { prompt: 'Album cover for amapiano gospel song', title: 'New Dawn' },
    exampleAppRequest: { description: 'Music App cover art', payload: { capability: 'music.cover_art', input: { prompt: 'Album cover for amapiano gospel song', title: 'New Dawn', artist: 'Demo Artist' }, context: { appId: 'music-app' } } },
    validationRules: ['prompt is required'],
    connectedAppExamples: ['Music App'],
  },

  {
    capabilityId: 'music.video_brief',
    displayName: 'Music Video Brief',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate a music video production brief from song details.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'songTitle', type: 'string', required: true, description: 'Song title' },
      { name: 'lyrics', type: 'string', required: false, description: 'Song lyrics' },
      { name: 'visualStyle', type: 'string', required: false, description: 'Visual style preference' },
      { name: 'storyConcept', type: 'string', required: false, description: 'Story concept' },
    ],
    outputSchema: [{ name: 'videoBrief', type: 'object', description: 'Music video production brief' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Text generation for brief.' },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { songTitle: 'New Dawn', visualStyle: 'cinematic' },
    exampleAppRequest: { description: 'Music App video brief', payload: { capability: 'music.video_brief', input: { songTitle: 'New Dawn', visualStyle: 'cinematic', storyConcept: 'Sunrise over the city' }, context: { appId: 'music-app' } } },
    validationRules: ['songTitle is required'],
    connectedAppExamples: ['Music App'],
  },

  {
    capabilityId: 'music.promo_reels',
    displayName: 'Music Promo Reels',
    studioId: 'music-song',
    category: 'music',
    description: 'Generate promotional reels for music releases.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'songArtifactId', type: 'string', required: false, description: 'Song artifact ID' },
      { name: 'prompt', type: 'string', required: true, description: 'Promo reel concept' },
      { name: 'platforms', type: 'array', required: false, description: 'Target platforms', defaultValue: ['instagram', 'tiktok'] },
      { name: 'reelCount', type: 'number', required: false, description: 'Number of reels', defaultValue: 3 },
    ],
    outputSchema: [{ name: 'reelUrls', type: 'array', description: 'Promo reel URLs' }, { name: 'artifactIds', type: 'array', description: 'Artifact IDs' }],
    supportedAssetReferences: [{ type: 'song_artifact', description: 'Song artifact', required: false }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['job_completion', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { prompt: 'Promo reel for new single', platforms: ['instagram', 'tiktok'], reelCount: 3 },
    exampleAppRequest: { description: 'Music App promo reels', payload: { capability: 'music.promo_reels', input: { prompt: 'Promo reel for new single', platforms: ['instagram', 'tiktok'], reelCount: 3 }, context: { appId: 'music-app' } } },
    validationRules: ['prompt is required'],
    connectedAppExamples: ['Music App', 'Marketing App'],
  },

  // ══ VOICE ══════════════════════════════════════════════════════════════════
  {
    capabilityId: 'voice.tts',
    displayName: 'Text-to-Speech',
    studioId: 'voice',
    category: 'voice',
    description: 'Convert text to speech audio with voice, style, speed, and format controls.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: VOICE_INPUT_BASE.filter((f) => f.name !== 'audioUrl'),
    outputSchema: VOICE_OUTPUT_BASE,
    supportedAssetReferences: [{ type: 'voice_sample', description: 'Voice sample for cloning/style', required: false }],
    providerPolicy: { allowedActiveProviders: ['genx', 'groq'], notes: 'Groq and GenX support TTS where wired and proven.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { text: 'Welcome to the launch event.', controls: { voice: 'Arista-PlayAI', speed: 1.0, language: 'en' } },
    exampleAppRequest: {
      description: 'Religious App devotional voiceover',
      payload: { capability: 'voice.tts', input: { text: 'Today\'s devotional reminds us of grace.' }, controls: { voice: 'auto', language: 'en', style: 'calm', responseFormat: 'mp3' }, context: { appId: 'religious-app' } },
    },
    validationRules: ['text is required'],
    connectedAppExamples: ['Religious App', 'Marketing App', 'Music App'],
  },

  {
    capabilityId: 'voice.stt',
    displayName: 'Speech-to-Text',
    studioId: 'voice',
    category: 'voice',
    description: 'Transcribe audio to text with diarization, timestamps, and subtitle export.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'audioUrl', type: 'url', required: true, description: 'Audio URL to transcribe' },
      { name: 'language', type: 'string', required: false, description: 'Language code', defaultValue: 'auto' },
      { name: 'diarization', type: 'boolean', required: false, description: 'Speaker diarization', defaultValue: false },
      { name: 'wordTimestamps', type: 'boolean', required: false, description: 'Word-level timestamps', defaultValue: false },
      { name: 'subtitleExport', type: 'array', required: false, description: 'Subtitle formats', defaultValue: [] },
    ],
    outputSchema: [
      { name: 'transcript', type: 'string', description: 'Transcribed text' },
      { name: 'subtitleUrl', type: 'url', description: 'Subtitle file URL' },
      { name: 'artifactId', type: 'string', description: 'Artifact ID' },
    ],
    supportedAssetReferences: [{ type: 'audio_file', description: 'Audio file to transcribe', required: true }],
    providerPolicy: { allowedActiveProviders: ['groq', 'genx'], primaryProvider: 'groq', notes: 'Groq STT is active/proven path. GenX is fallback.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { audioUrl: 'signed-url', controls: { language: 'auto', diarization: true, wordTimestamps: true, subtitleExport: ['srt', 'vtt'] } },
    exampleAppRequest: {
      description: 'Horse App training video transcript',
      payload: { capability: 'voice.stt', input: { audioUrl: 'signed-app-url' }, controls: { language: 'en', diarization: true, wordTimestamps: true, subtitleExport: ['srt'] }, context: { appId: 'horse-app' } },
    },
    validationRules: ['audioUrl is required'],
    connectedAppExamples: ['Horse App', 'Religious App', 'Marketing App'],
  },

  {
    capabilityId: 'voice.voiceover',
    displayName: 'Voiceover',
    studioId: 'voice',
    category: 'voice',
    description: 'Generate voiceover from script with emotion and pacing controls.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'script', type: 'string', required: true, description: 'Voiceover script' },
      { name: 'voice', type: 'string', required: false, description: 'Voice preset' },
      { name: 'emotion', type: 'string', required: false, description: 'Emotion' },
      { name: 'speed', type: 'number', required: false, description: 'Speed', defaultValue: 1.0 },
      { name: 'language', type: 'string', required: false, description: 'Language', defaultValue: 'en' },
    ],
    outputSchema: [{ name: 'audioUrl', type: 'url', description: 'Voiceover audio URL' }, { name: 'artifactId', type: 'string', description: 'Artifact ID' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: ['genx', 'groq'] },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { script: 'Welcome to our platform.', controls: { voice: 'auto', emotion: 'confident' } },
    exampleAppRequest: { description: 'Marketing App voiceover', payload: { capability: 'voice.voiceover', input: { script: 'Welcome to our summer campaign.' }, controls: { voice: 'auto', emotion: 'excited', language: 'en' }, context: { appId: 'marketing-app' } } },
    validationRules: ['script is required'],
    connectedAppExamples: ['Marketing App', 'Religious App'],
  },

  {
    capabilityId: 'voice.dub',
    displayName: 'Dubbing',
    studioId: 'voice',
    category: 'voice',
    description: 'Dub audio/video into target languages.',
    status: 'deferred',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'sourceAudioUrl', type: 'url', required: true, description: 'Source audio URL' },
      { name: 'targetLanguage', type: 'string', required: true, description: 'Target language code' },
      { name: 'voice', type: 'string', required: false, description: 'Voice preset for dubbing' },
    ],
    outputSchema: [{ name: 'dubbedAudioUrl', type: 'url', description: 'Dubbed audio URL' }, { name: 'artifactId', type: 'string', description: 'Artifact ID' }],
    supportedAssetReferences: [{ type: 'source_audio', description: 'Source audio to dub', required: true }],
    providerPolicy: { allowedActiveProviders: ['genx', 'groq'], notes: 'Dubbing requires STT + translation + TTS pipeline.' },
    blockedOrDeferredReason: 'Dubbing pipeline requires proven STT + translation + TTS chain.',
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: false,
    exampleDashboardRequest: { sourceAudioUrl: 'signed-url', targetLanguage: 'es' },
    exampleAppRequest: { description: 'Dubbing request', payload: { capability: 'voice.dub', input: { sourceAudioUrl: 'signed-url', targetLanguage: 'es' }, context: { appId: 'marketing-app' } } },
    validationRules: ['sourceAudioUrl is required', 'targetLanguage is required'],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove STT + translation + TTS pipeline end-to-end.',
  },

  {
    capabilityId: 'voice.subtitle',
    displayName: 'Subtitle Generation',
    studioId: 'voice',
    category: 'voice',
    description: 'Generate SRT/VTT subtitles from audio or video.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'audioUrl', type: 'url', required: true, description: 'Audio/video URL' },
      { name: 'language', type: 'string', required: false, description: 'Language', defaultValue: 'auto' },
      { name: 'format', type: 'select', required: false, description: 'Subtitle format', defaultValue: 'srt', options: ['srt', 'vtt'] },
    ],
    outputSchema: [{ name: 'subtitleUrl', type: 'url', description: 'Subtitle file URL' }, { name: 'transcript', type: 'string', description: 'Full transcript' }],
    supportedAssetReferences: [{ type: 'audio_file', description: 'Audio/video source', required: true }],
    providerPolicy: { allowedActiveProviders: ['groq', 'genx'] },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { audioUrl: 'signed-url', controls: { format: 'srt' } },
    exampleAppRequest: { description: 'Subtitle generation', payload: { capability: 'voice.subtitle', input: { audioUrl: 'signed-url', format: 'srt' }, context: { appId: 'religious-app' } } },
    validationRules: ['audioUrl is required'],
    connectedAppExamples: ['Religious App', 'Horse App'],
  },

  {
    capabilityId: 'voice.library',
    displayName: 'Voice Library',
    studioId: 'voice',
    category: 'voice',
    description: 'Manage reusable voice presets and library entries.',
    status: 'deferred',
    appFacing: false,
    mode: 'sync',
    inputSchema: [
      { name: 'action', type: 'select', required: true, description: 'Library action', options: ['list', 'get', 'create', 'delete'] },
      { name: 'voiceId', type: 'string', required: false, description: 'Voice ID' },
      { name: 'voiceName', type: 'string', required: false, description: 'Voice name' },
    ],
    outputSchema: [{ name: 'voices', type: 'array', description: 'Voice library entries' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    blockedOrDeferredReason: 'Voice library requires proven voice cloning and storage pipeline.',
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { action: 'list' },
    exampleAppRequest: { description: 'List voice library', payload: { capability: 'voice.library', input: { action: 'list' } } },
    validationRules: ['action is required'],
    connectedAppExamples: [],
    nextActionIfBlocked: 'Prove voice cloning and library storage before enabling.',
  },

  // ══ AVATAR ═════════════════════════════════════════════════════════════════
  {
    capabilityId: 'avatar.generate',
    displayName: 'Avatar Generate',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Generate avatar images from prompts and reference faces.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: AVATAR_INPUT_BASE.filter((f) => f.name !== 'script' && f.name !== 'sourceAudio'),
    outputSchema: AVATAR_OUTPUT_BASE,
    supportedAssetReferences: [
      { type: 'face_image', description: 'Face reference image', required: false },
      { type: 'avatar_profile', description: 'Existing avatar profile', required: false },
    ],
    providerPolicy: { allowedActiveProviders: ['genx', 'together'], notes: 'GenX-backed first. Together image fallback.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { prompt: 'Professional female presenter', controls: { avatarStyle: 'realistic', mode: 'image' } },
    exampleAppRequest: { description: 'Avatar image generation', payload: { capability: 'avatar.generate', input: { prompt: 'Professional female presenter' }, controls: { avatarStyle: 'realistic', avatarLibrary: 'default' }, context: { appId: 'marketing-app' } } },
    validationRules: ['prompt or faceImageReference is required'],
    connectedAppExamples: ['Marketing App', 'Religious App'],
  },

  {
    capabilityId: 'avatar.talking_head',
    displayName: 'Talking Head',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Generate talking head video with lip-sync and voice binding.',
    status: 'needs_proof',
    appFacing: true,
    mode: 'async',
    inputSchema: AVATAR_INPUT_BASE,
    outputSchema: AVATAR_OUTPUT_BASE,
    supportedAssetReferences: [
      { type: 'face_image', description: 'Face reference', required: false },
      { type: 'source_audio', description: 'Source audio for lip-sync', required: false },
      { type: 'script_document', description: 'Script document', required: false },
    ],
    providerPolicy: { allowedActiveProviders: ['genx'], notes: 'GenX avatar/video backed. Requires proven lip-sync route.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted', 'job_completion'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { script: 'Welcome to the launch.', controls: { emotion: 'confident', cameraFraming: 'talking_head', subtitles: true } },
    exampleAppRequest: {
      description: 'Marketing App presenter video',
      payload: { capability: 'avatar.talking_head', input: { script: 'Welcome to today\'s update.' }, assetReferences: [{ type: 'avatar_profile', id: 'avatar_demo' }], controls: { emotion: 'confident', cameraFraming: 'talking_head', subtitles: true, voiceBinding: 'voice_arista' }, context: { appId: 'marketing-app' } },
    },
    validationRules: ['script or sourceAudio is required'],
    connectedAppExamples: ['Marketing App', 'Religious App'],
    nextActionIfBlocked: 'Prove lip-sync/talking-head video route and artifact persistence.',
  },

  {
    capabilityId: 'avatar.presenter',
    displayName: 'Avatar Presenter',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Generate presenter-style avatar video with lower-third and CTA.',
    status: 'needs_proof',
    appFacing: true,
    mode: 'async',
    inputSchema: [...AVATAR_INPUT_BASE, { name: 'lowerThirdBranding', type: 'string', required: false, description: 'Lower-third text' }, { name: 'ctaOutro', type: 'string', required: false, description: 'CTA outro text' }],
    outputSchema: AVATAR_OUTPUT_BASE,
    supportedAssetReferences: [{ type: 'avatar_profile', description: 'Avatar profile', required: false }, { type: 'brand_lower_third', description: 'Brand lower-third asset', required: false }],
    providerPolicy: { allowedActiveProviders: ['genx'] },
    proofRequirements: ['live_provider_call', 'artifact_persisted', 'job_completion'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { script: 'Today we launch our new product.', controls: { cameraFraming: 'presenter', lowerThirdBranding: 'AmarktAI News' } },
    exampleAppRequest: { description: 'Religious App sermon presenter', payload: { capability: 'avatar.presenter', input: { script: 'Today\'s message is about hope.' }, controls: { cameraFraming: 'presenter', lowerThirdBranding: 'Daily Devotional', emotion: 'serious' }, context: { appId: 'religious-app' } } },
    validationRules: ['script is required'],
    connectedAppExamples: ['Religious App', 'Marketing App'],
    nextActionIfBlocked: 'Prove presenter video route with lower-third overlay.',
  },

  {
    capabilityId: 'avatar.lipsync',
    displayName: 'Avatar Lip-sync',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Generate lip-sync video from avatar image and audio.',
    status: 'needs_proof',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'avatarImageUrl', type: 'url', required: true, description: 'Avatar image URL' },
      { name: 'audioUrl', type: 'url', required: true, description: 'Audio URL for lip-sync' },
      { name: 'duration', type: 'number', required: false, description: 'Target duration' },
    ],
    outputSchema: AVATAR_OUTPUT_BASE,
    supportedAssetReferences: [{ type: 'avatar_image', description: 'Avatar image', required: true }, { type: 'audio', description: 'Audio for lip-sync', required: true }],
    providerPolicy: { allowedActiveProviders: ['genx'] },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: false,
    exampleDashboardRequest: { avatarImageUrl: 'signed-url', audioUrl: 'signed-url' },
    exampleAppRequest: { description: 'Lip-sync video', payload: { capability: 'avatar.lipsync', input: { avatarImageUrl: 'signed-url', audioUrl: 'signed-url' }, context: { appId: 'music-app' } } },
    validationRules: ['avatarImageUrl is required', 'audioUrl is required'],
    connectedAppExamples: ['Music App'],
    nextActionIfBlocked: 'Prove lip-sync route with GenX avatar video model.',
  },

  {
    capabilityId: 'avatar.voice_bind',
    displayName: 'Voice Bind',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Bind a voice preset to an avatar profile.',
    status: 'deferred',
    appFacing: false,
    mode: 'sync',
    inputSchema: [
      { name: 'avatarProfileId', type: 'string', required: true, description: 'Avatar profile ID' },
      { name: 'voiceId', type: 'string', required: true, description: 'Voice ID from Voice Library' },
    ],
    outputSchema: [{ name: 'bindingStatus', type: 'string', description: 'Binding status' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    blockedOrDeferredReason: 'Voice binding requires proven avatar and voice library integration.',
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { avatarProfileId: 'avatar_1', voiceId: 'voice_arista' },
    exampleAppRequest: { description: 'Bind voice to avatar', payload: { capability: 'avatar.voice_bind', input: { avatarProfileId: 'avatar_1', voiceId: 'voice_arista' } } },
    validationRules: ['avatarProfileId is required', 'voiceId is required'],
    connectedAppExamples: [],
    nextActionIfBlocked: 'Prove avatar and voice library integration.',
  },

  {
    capabilityId: 'avatar.library',
    displayName: 'Avatar Library',
    studioId: 'avatar',
    category: 'avatar',
    description: 'Manage reusable avatar profiles and library entries.',
    status: 'deferred',
    appFacing: false,
    mode: 'sync',
    inputSchema: [
      { name: 'action', type: 'select', required: true, description: 'Library action', options: ['list', 'get', 'create', 'delete'] },
      { name: 'avatarProfileId', type: 'string', required: false, description: 'Avatar profile ID' },
    ],
    outputSchema: [{ name: 'avatars', type: 'array', description: 'Avatar library entries' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    blockedOrDeferredReason: 'Avatar library requires proven avatar generation and storage pipeline.',
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { action: 'list' },
    exampleAppRequest: { description: 'List avatar library', payload: { capability: 'avatar.library', input: { action: 'list' } } },
    validationRules: ['action is required'],
    connectedAppExamples: [],
    nextActionIfBlocked: 'Prove avatar generation and library storage.',
  },

  // ══ SCRAPE / BRAND ════════════════════════════════════════════════════════
  {
    capabilityId: 'brand.scrape',
    displayName: 'Brand Scrape',
    studioId: 'scrape-brand',
    category: 'scrape_brand',
    description: 'Scrape websites for brand data, logos, products, and content.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: BRAND_INPUT_BASE,
    outputSchema: BRAND_OUTPUT_BASE,
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: ['groq', 'together', 'genx'], notes: 'Local tools/orchestration. Playwright/Crawlee when wired. Provider only needed for AI summarization.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { websiteUrl: 'https://example.com', controls: { crawlDepth: 2, renderJs: true, screenshotCapture: true, extractionGoals: ['logos', 'colors', 'products'] } },
    exampleAppRequest: {
      description: 'Marketing App brand onboarding',
      payload: { capability: 'brand.scrape', input: { websiteUrl: 'https://example.com' }, controls: { crawlDepth: 2, renderJs: true, screenshotCapture: true, extractionGoals: ['logos', 'colors', 'products', 'brandVoiceSummary', 'competitors'] }, context: { appId: 'marketing-app' } },
    },
    validationRules: ['websiteUrl is required', 'websiteUrl must be a valid URL'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  {
    capabilityId: 'brand.extract',
    displayName: 'Brand Extract',
    studioId: 'scrape-brand',
    category: 'scrape_brand',
    description: 'Extract structured brand data from scraped content.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'scrapedData', type: 'object', required: true, description: 'Scraped content to extract from' },
      { name: 'extractionGoals', type: 'array', required: false, description: 'What to extract' },
    ],
    outputSchema: [{ name: 'brandData', type: 'object', description: 'Extracted brand data' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { scrapedData: { html: '...' }, extractionGoals: ['logos', 'colors'] },
    exampleAppRequest: { description: 'Extract brand data', payload: { capability: 'brand.extract', input: { scrapedData: { html: '...' }, extractionGoals: ['logos', 'colors'] }, context: { appId: 'marketing-app' } } },
    validationRules: ['scrapedData is required'],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'brand.pack_create',
    displayName: 'Brand Pack Create',
    studioId: 'scrape-brand',
    category: 'scrape_brand',
    description: 'Create a reusable brand pack from extracted brand data.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'brandData', type: 'object', required: true, description: 'Extracted brand data' },
      { name: 'brandName', type: 'string', required: true, description: 'Brand name' },
    ],
    outputSchema: [{ name: 'brandPack', type: 'object', description: 'Assembled brand pack' }, { name: 'brandPackId', type: 'string', description: 'Brand pack ID' }],
    supportedAssetReferences: [{ type: 'brand_guide', description: 'Brand guide PDF', required: false }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { brandName: 'Demo Brand', brandData: { colors: ['#FF0000'], fonts: ['Arial'] } },
    exampleAppRequest: { description: 'Create brand pack', payload: { capability: 'brand.pack_create', input: { brandName: 'Demo Brand', brandData: { colors: ['#FF0000'], fonts: ['Arial'] } }, context: { appId: 'marketing-app' } } },
    validationRules: ['brandData is required', 'brandName is required'],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'brand.asset_ingest',
    displayName: 'Brand Asset Ingest',
    studioId: 'scrape-brand',
    category: 'scrape_brand',
    description: 'Ingest brand assets (logos, images, documents) into the platform.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'assets', type: 'array', required: true, description: 'Asset URLs or references to ingest' },
      { name: 'brandPackId', type: 'string', required: false, description: 'Target brand pack ID' },
    ],
    outputSchema: [{ name: 'ingestionStatus', type: 'string', description: 'Ingestion status' }, { name: 'assetIds', type: 'array', description: 'Ingested asset IDs' }],
    supportedAssetReferences: [{ type: 'logo', description: 'Logo file', required: false }, { type: 'product_image', description: 'Product image', required: false }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { assets: ['signed-url-1', 'signed-url-2'] },
    exampleAppRequest: { description: 'Ingest brand assets', payload: { capability: 'brand.asset_ingest', input: { assets: ['signed-url-1', 'signed-url-2'] }, context: { appId: 'marketing-app' } } },
    validationRules: ['assets is required and must be non-empty array'],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'brand.knowledge_create',
    displayName: 'Knowledge Set Create',
    studioId: 'scrape-brand',
    category: 'scrape_brand',
    description: 'Create a knowledge set from brand data for RAG retrieval.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'brandPackId', type: 'string', required: false, description: 'Source brand pack ID' },
      { name: 'sourceUrls', type: 'array', required: false, description: 'Source URLs' },
      { name: 'collectionName', type: 'string', required: true, description: 'Knowledge collection name' },
    ],
    outputSchema: [{ name: 'knowledgeSetId', type: 'string', description: 'Knowledge set ID' }, { name: 'ingestionStatus', type: 'string', description: 'Ingestion status' }],
    supportedAssetReferences: [{ type: 'brand_pack', description: 'Brand pack', required: false }, { type: 'document', description: 'Source documents', required: false }],
    providerPolicy: { allowedActiveProviders: ['together', 'groq', 'genx'], notes: 'Embeddings via Together where wired. RAG/Qdrant backing.' },
    proofRequirements: ['artifact_persisted', 'live_provider_call'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { collectionName: 'brand_demo_knowledge', sourceUrls: ['https://example.com/about'] },
    exampleAppRequest: { description: 'Create knowledge set', payload: { capability: 'brand.knowledge_create', input: { collectionName: 'brand_demo_knowledge', sourceUrls: ['https://example.com/about'] }, context: { appId: 'marketing-app' } } },
    validationRules: ['collectionName is required'],
    connectedAppExamples: ['Marketing App', 'Religious App'],
  },

  // ══ RAG / KNOWLEDGE ═══════════════════════════════════════════════════════
  {
    capabilityId: 'rag.ingest',
    displayName: 'RAG Ingest',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Ingest documents and URLs into a knowledge collection for RAG.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'sourceUrls', type: 'array', required: false, description: 'Source URLs' },
      { name: 'uploadedFiles', type: 'array', required: false, description: 'Uploaded file references' },
      { name: 'collectionName', type: 'string', required: true, description: 'Target collection name' },
      { name: 'chunkingPreset', type: 'select', required: false, description: 'Chunking strategy', defaultValue: 'standard', options: ['small', 'standard', 'large'] },
      { name: 'embeddingModel', type: 'string', required: false, description: 'Embedding model' },
      { name: 'metadataSchema', type: 'object', required: false, description: 'Metadata schema' },
    ],
    outputSchema: [{ name: 'ingestionStatus', type: 'string', description: 'Ingestion status' }, { name: 'documentCount', type: 'number', description: 'Documents ingested' }],
    supportedAssetReferences: [{ type: 'pdf', description: 'PDF document', required: false }, { type: 'document', description: 'Text document', required: false }, { type: 'url', description: 'Web URL', required: false }],
    providerPolicy: { allowedActiveProviders: ['together', 'groq', 'genx'], notes: 'Together embeddings where wired. Qdrant vector store.' },
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { sourceUrls: ['https://example.com/guide.pdf'], collectionName: 'demo_knowledge', controls: { chunkingPreset: 'standard' } },
    exampleAppRequest: { description: 'Religious App knowledge ingestion', payload: { capability: 'rag.ingest', input: { sourceUrls: ['https://example.com/scripture-guide.pdf'], collectionName: 'religious_knowledge' }, controls: { chunkingPreset: 'standard' }, context: { appId: 'religious-app' } } },
    validationRules: ['collectionName is required', 'sourceUrls or uploadedFiles is required'],
    connectedAppExamples: ['Religious App', 'Crypto App', 'Horse App'],
  },

  {
    capabilityId: 'rag.answer',
    displayName: 'RAG Answer',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Answer questions using retrieval-augmented generation with citations.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: RAG_INPUT_BASE,
    outputSchema: RAG_OUTPUT_BASE,
    supportedAssetReferences: [{ type: 'knowledge_collection', description: 'Knowledge collection reference', required: false }],
    providerPolicy: { allowedActiveProviders: ['together', 'groq', 'genx'], notes: 'Together/Qdrant/Groq/GenX depending on wiring. Rerank optional.' },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { question: 'Summarize the latest uploaded guide.', controls: { topK: 6, rerank: true, citationsRequired: true } },
    exampleAppRequest: {
      description: 'Religious App devotional answer',
      payload: { capability: 'rag.answer', input: { question: 'What does this passage teach about forgiveness?' }, context: { knowledgeSet: 'religious_knowledge', appId: 'religious-app' }, controls: { topK: 6, rerank: true, citationsRequired: true } },
    },
    validationRules: ['question is required'],
    connectedAppExamples: ['Religious App', 'Crypto App', 'Horse App'],
  },

  {
    capabilityId: 'rag.search',
    displayName: 'RAG Search',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Search knowledge collections without generating an answer.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'collectionName', type: 'string', required: false, description: 'Collection to search' },
      { name: 'topK', type: 'number', required: false, description: 'Results to return', defaultValue: 10 },
      { name: 'rerank', type: 'boolean', required: false, description: 'Enable reranking', defaultValue: false },
    ],
    outputSchema: [{ name: 'results', type: 'array', description: 'Search results' }, { name: 'confidence', type: 'number', description: 'Top result confidence' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: ['together', 'groq', 'genx'] },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { query: 'latest crypto market analysis', controls: { topK: 10, rerank: true } },
    exampleAppRequest: { description: 'Crypto App research search', payload: { capability: 'rag.search', input: { query: 'latest crypto market analysis' }, controls: { topK: 10, rerank: true }, context: { appId: 'crypto-app' } } },
    validationRules: ['query is required'],
    connectedAppExamples: ['Crypto App', 'Horse App'],
  },

  {
    capabilityId: 'rag.extract',
    displayName: 'RAG Extract',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Extract structured data from knowledge collections.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'query', type: 'string', required: true, description: 'Extraction query' },
      { name: 'collectionName', type: 'string', required: false, description: 'Collection' },
      { name: 'schema', type: 'object', required: false, description: 'Extraction schema' },
    ],
    outputSchema: [{ name: 'extractedData', type: 'object', description: 'Extracted structured data' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { query: 'Extract all product names and prices', controls: { collectionName: 'product_docs' } },
    exampleAppRequest: { description: 'Extract structured data', payload: { capability: 'rag.extract', input: { query: 'Extract all product names and prices' }, context: { collectionName: 'product_docs', appId: 'marketing-app' } } },
    validationRules: ['query is required'],
    connectedAppExamples: ['Marketing App', 'Crypto App'],
  },

  {
    capabilityId: 'rag.rerank',
    displayName: 'Rerank',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Rerank search results for improved relevance.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'query', type: 'string', required: true, description: 'Original query' },
      { name: 'documents', type: 'array', required: true, description: 'Documents to rerank' },
      { name: 'topK', type: 'number', required: false, description: 'Top results after reranking', defaultValue: 5 },
    ],
    outputSchema: [{ name: 'rerankedDocuments', type: 'array', description: 'Reranked documents with scores' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: ['together'], primaryProvider: 'together', notes: 'Together rerank is primary. Optional if not wired.' },
    proofRequirements: ['live_provider_call'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { query: 'best practices for content marketing', documents: ['doc1', 'doc2', 'doc3'] },
    exampleAppRequest: { description: 'Rerank search results', payload: { capability: 'rag.rerank', input: { query: 'best practices for content marketing', documents: ['doc1', 'doc2', 'doc3'] }, context: { appId: 'marketing-app' } } },
    validationRules: ['query is required', 'documents is required and must be non-empty array'],
    connectedAppExamples: ['Marketing App'],
  },

  {
    capabilityId: 'knowledge.collection',
    displayName: 'Knowledge Collection',
    studioId: 'rag-knowledge',
    category: 'rag_knowledge',
    description: 'Manage knowledge collections (list, create, delete, inspect).',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'action', type: 'select', required: true, description: 'Collection action', options: ['list', 'get', 'create', 'delete'] },
      { name: 'collectionName', type: 'string', required: false, description: 'Collection name' },
    ],
    outputSchema: [{ name: 'collections', type: 'array', description: 'Collection list or details' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['artifact_persisted'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { action: 'list' },
    exampleAppRequest: { description: 'List knowledge collections', payload: { capability: 'knowledge.collection', input: { action: 'list' }, context: { appId: 'religious-app' } } },
    validationRules: ['action is required'],
    connectedAppExamples: ['Religious App', 'Crypto App'],
  },

  // ══ JOBS / ARTIFACTS ══════════════════════════════════════════════════════
  {
    capabilityId: 'ops.job.create',
    displayName: 'Create Job',
    studioId: 'jobs-artifacts',
    category: 'ops',
    description: 'Create a tracked job for async capability execution.',
    status: 'active',
    appFacing: false,
    mode: 'async',
    inputSchema: [
      { name: 'capability', type: 'string', required: true, description: 'Target capability' },
      { name: 'input', type: 'object', required: true, description: 'Capability input' },
    ],
    outputSchema: [{ name: 'jobId', type: 'string', description: 'Created job ID' }, { name: 'jobState', type: 'string', description: 'Initial job state' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['job_completion'],
    artifactRequired: false,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { capability: 'image.generate', input: { prompt: 'Test image' } },
    exampleAppRequest: { description: 'Create a job', payload: { capability: 'ops.job.create', input: { capability: 'image.generate', input: { prompt: 'Test image' } } } },
    validationRules: ['capability is required', 'input is required'],
    connectedAppExamples: [],
  },

  {
    capabilityId: 'ops.artifact.persist',
    displayName: 'Persist Artifact',
    studioId: 'jobs-artifacts',
    category: 'ops',
    description: 'Persist an artifact from a completed job or external source.',
    status: 'active',
    appFacing: false,
    mode: 'sync',
    inputSchema: [
      { name: 'jobId', type: 'string', required: false, description: 'Source job ID' },
      { name: 'artifactType', type: 'string', required: true, description: 'Artifact type' },
      { name: 'contentUrl', type: 'url', required: false, description: 'Content URL' },
      { name: 'metadata', type: 'object', required: false, description: 'Artifact metadata' },
    ],
    outputSchema: [{ name: 'artifactId', type: 'string', description: 'Persisted artifact ID' }, { name: 'storageUrl', type: 'url', description: 'Storage URL' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['artifact_persisted', 'storage_writable'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { artifactType: 'image', contentUrl: 'signed-url' },
    exampleAppRequest: { description: 'Persist artifact', payload: { capability: 'ops.artifact.persist', input: { artifactType: 'image', contentUrl: 'signed-url' } } },
    validationRules: ['artifactType is required'],
    connectedAppExamples: [],
  },

  {
    capabilityId: 'ops.webhook.deliver',
    displayName: 'Deliver Webhook',
    studioId: 'jobs-artifacts',
    category: 'ops',
    description: 'Deliver webhook notification to app callback URL.',
    status: 'active',
    appFacing: false,
    mode: 'async',
    inputSchema: [
      { name: 'appId', type: 'string', required: true, description: 'Target app ID' },
      { name: 'event', type: 'string', required: true, description: 'Event type' },
      { name: 'payload', type: 'object', required: true, description: 'Webhook payload' },
    ],
    outputSchema: [{ name: 'deliveryState', type: 'string', description: 'Delivery state' }, { name: 'attempts', type: 'number', description: 'Delivery attempts' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['webhook_delivery'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: true,
    exampleDashboardRequest: { appId: 'marketing-app', event: 'job.completed', payload: { jobId: 'job_1' } },
    exampleAppRequest: { description: 'Deliver webhook', payload: { capability: 'ops.webhook.deliver', input: { appId: 'marketing-app', event: 'job.completed', payload: { jobId: 'job_1' } } } },
    validationRules: ['appId is required', 'event is required', 'payload is required'],
    connectedAppExamples: [],
  },

  {
    capabilityId: 'ops.artifact.handoff',
    displayName: 'Artifact Handoff',
    studioId: 'jobs-artifacts',
    category: 'ops',
    description: 'Hand off artifact to external app with signed URL and webhook.',
    status: 'active',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      { name: 'artifactId', type: 'string', required: true, description: 'Artifact ID' },
      { name: 'appId', type: 'string', required: true, description: 'Target app ID' },
      { name: 'signedUrlExpiry', type: 'number', required: false, description: 'Signed URL expiry in seconds', defaultValue: 3600 },
    ],
    outputSchema: [{ name: 'signedUrl', type: 'url', description: 'Signed download URL' }, { name: 'deliveryState', type: 'string', description: 'Handoff state' }],
    supportedAssetReferences: [{ type: 'artifact', description: 'Artifact to hand off', required: true }],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['artifact_persisted', 'webhook_delivery'],
    artifactRequired: true,
    jobRequired: false,
    webhookSupport: true,
    exampleDashboardRequest: { artifactId: 'artifact_1', appId: 'marketing-app' },
    exampleAppRequest: { description: 'Hand off artifact to Marketing App', payload: { capability: 'ops.artifact.handoff', input: { artifactId: 'artifact_1', appId: 'marketing-app', signedUrlExpiry: 3600 }, context: { appId: 'marketing-app' } } },
    validationRules: ['artifactId is required', 'appId is required'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  // ══ APP CONNECTIONS ════════════════════════════════════════════════════════
  {
    capabilityId: 'app.connect',
    displayName: 'App Connect',
    studioId: 'app-connections',
    category: 'app',
    description: 'Register or update an external app connection with API key and webhook.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: APP_INPUT_BASE,
    outputSchema: APP_OUTPUT_BASE,
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Apps request capabilities only. Provider/model overrides are rejected.' },
    proofRequirements: ['app_handoff'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: true,
    exampleDashboardRequest: { appId: 'marketing-app', webhookUrl: 'https://app.example.com/webhook', allowedCapabilities: ['text.chat', 'image.generate'] },
    exampleAppRequest: {
      description: 'Marketing App connection',
      payload: { capability: 'app.connect', input: { appId: 'marketing-app', webhookUrl: 'https://marketing.example.com/webhook', allowedCapabilities: ['text.chat', 'text.copywrite', 'image.generate', 'video.reel', 'brand.scrape'], budgetLimits: { daily: 10 }, rateLimits: { perMinute: 30 } } },
    },
    validationRules: ['appId is required'],
    connectedAppExamples: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
  },

  {
    capabilityId: 'app.capabilities',
    displayName: 'App Capabilities',
    studioId: 'app-connections',
    category: 'app',
    description: 'List available capabilities for an external app.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [{ name: 'appId', type: 'string', required: true, description: 'App ID' }],
    outputSchema: [{ name: 'capabilities', type: 'array', description: 'Available capabilities with status' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    proofRequirements: ['app_handoff'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { appId: 'marketing-app' },
    exampleAppRequest: { description: 'List capabilities for Marketing App', payload: { capability: 'app.capabilities', input: { appId: 'marketing-app' } } },
    validationRules: ['appId is required'],
    connectedAppExamples: ['Marketing App', 'Music App'],
  },

  {
    capabilityId: 'app.simulate_request',
    displayName: 'Simulate App Request',
    studioId: 'app-connections',
    category: 'app',
    description: 'Simulate an app capability request for testing without execution.',
    status: 'active',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'appId', type: 'string', required: true, description: 'App ID' },
      { name: 'capability', type: 'string', required: true, description: 'Capability to simulate' },
      { name: 'input', type: 'object', required: true, description: 'Simulated input' },
    ],
    outputSchema: [{ name: 'simulationResult', type: 'object', description: 'Simulation result with validation and routing preview' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Simulation only. No live provider calls.' },
    proofRequirements: [],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { appId: 'marketing-app', capability: 'image.generate', input: { prompt: 'Test' } },
    exampleAppRequest: { description: 'Simulate image request', payload: { capability: 'app.simulate_request', input: { appId: 'marketing-app', capability: 'image.generate', input: { prompt: 'Test image' } } } },
    validationRules: ['appId is required', 'capability is required', 'input is required'],
    connectedAppExamples: ['Marketing App'],
  },

  // ══ AGENTS / LEARNING ═════════════════════════════════════════════════════
  {
    capabilityId: 'agent.run',
    displayName: 'Agent Run',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Run a controlled agent with goal, tools, and approval mode.',
    status: 'deferred',
    appFacing: true,
    mode: 'async',
    inputSchema: AGENT_INPUT_BASE,
    outputSchema: AGENT_OUTPUT_BASE,
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Controlled learning only. No uncontrolled self-learning.' },
    blockedOrDeferredReason: 'Agent autonomy is a future controlled foundation; not live-ready until execution and evaluation proof exist.',
    proofRequirements: ['live_provider_call', 'artifact_persisted'],
    artifactRequired: true,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { goal: 'Review failed campaign jobs and recommend next actions.', controls: { approvalMode: 'manual', spendCap: 0, shadowTesting: true } },
    exampleAppRequest: {
      description: 'Marketing App campaign review agent',
      payload: { capability: 'agent.run', input: { goal: 'Review failed campaign jobs and recommend next actions.' }, controls: { approvalMode: 'manual', spendCap: 0, shadowTesting: true }, context: { appId: 'marketing-app' } },
    },
    validationRules: ['goal is required'],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove agent execution, evaluation, and rollback before enabling.',
  },

  {
    capabilityId: 'agent.schedule',
    displayName: 'Agent Schedule',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Schedule recurring agent runs with triggers and approval gates.',
    status: 'deferred',
    appFacing: true,
    mode: 'async',
    inputSchema: [
      ...AGENT_INPUT_BASE,
      { name: 'schedule', type: 'string', required: true, description: 'Schedule (cron or interval)' },
      { name: 'triggers', type: 'array', required: false, description: 'Event triggers' },
    ],
    outputSchema: [{ name: 'scheduleId', type: 'string', description: 'Schedule ID' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Controlled scheduling only.' },
    blockedOrDeferredReason: 'Scheduled agent runs require proven agent execution foundation.',
    proofRequirements: ['job_completion'],
    artifactRequired: false,
    jobRequired: true,
    webhookSupport: true,
    exampleDashboardRequest: { goal: 'Daily campaign performance review', schedule: '0 9 * * *', controls: { approvalMode: 'manual' } },
    exampleAppRequest: { description: 'Schedule daily agent', payload: { capability: 'agent.schedule', input: { goal: 'Daily campaign performance review', schedule: '0 9 * * *' }, controls: { approvalMode: 'manual' }, context: { appId: 'marketing-app' } } },
    validationRules: ['goal is required', 'schedule is required'],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove agent execution before enabling scheduling.',
  },

  {
    capabilityId: 'agent.review',
    displayName: 'Agent Review',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Review agent run results and approve/reject next actions.',
    status: 'deferred',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'runId', type: 'string', required: true, description: 'Agent run ID' },
      { name: 'action', type: 'select', required: true, description: 'Review action', options: ['approve', 'reject', 'modify'] },
      { name: 'feedback', type: 'string', required: false, description: 'Review feedback' },
    ],
    outputSchema: [{ name: 'reviewStatus', type: 'string', description: 'Review status' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS] },
    blockedOrDeferredReason: 'Agent review requires proven agent execution foundation.',
    proofRequirements: ['artifact_persisted'],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { runId: 'run_1', action: 'approve' },
    exampleAppRequest: { description: 'Review agent run', payload: { capability: 'agent.review', input: { runId: 'run_1', action: 'approve', feedback: 'Looks good.' }, context: { appId: 'marketing-app' } } },
    validationRules: ['runId is required', 'action is required'],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove agent execution and evaluation pipeline.',
  },

  {
    capabilityId: 'learning.summary',
    displayName: 'Learning Summary',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Get learning summary for an app or capability.',
    status: 'deferred',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'appId', type: 'string', required: false, description: 'App ID' },
      { name: 'capability', type: 'string', required: false, description: 'Capability' },
    ],
    outputSchema: [{ name: 'summary', type: 'object', description: 'Learning summary' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Controlled learning summaries only.' },
    blockedOrDeferredReason: 'Learning summaries require proven evaluation and metrics pipeline.',
    proofRequirements: [],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { appId: 'marketing-app' },
    exampleAppRequest: { description: 'Get learning summary', payload: { capability: 'learning.summary', input: { appId: 'marketing-app' }, context: { appId: 'marketing-app' } } },
    validationRules: [],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove provider performance learning and evaluation metrics.',
  },

  {
    capabilityId: 'learning.recommendation',
    displayName: 'Learning Recommendation',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Get capability or provider recommendations based on learning.',
    status: 'deferred',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'appId', type: 'string', required: false, description: 'App ID' },
      { name: 'goal', type: 'string', required: false, description: 'Goal for recommendation' },
    ],
    outputSchema: [{ name: 'recommendations', type: 'array', description: 'Recommendations' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Controlled recommendations only.' },
    blockedOrDeferredReason: 'Recommendations require proven learning and evaluation foundation.',
    proofRequirements: [],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { appId: 'marketing-app', goal: 'Improve image generation quality' },
    exampleAppRequest: { description: 'Get recommendations', payload: { capability: 'learning.recommendation', input: { appId: 'marketing-app', goal: 'Improve image generation quality' }, context: { appId: 'marketing-app' } } },
    validationRules: [],
    connectedAppExamples: ['Marketing App'],
    nextActionIfBlocked: 'Prove learning evaluation and recommendation pipeline.',
  },

  {
    capabilityId: 'learning.provider_performance',
    displayName: 'Provider Performance',
    studioId: 'agents-learning',
    category: 'agent_learning',
    description: 'Get provider performance insights and metrics.',
    status: 'deferred',
    appFacing: true,
    mode: 'sync',
    inputSchema: [
      { name: 'provider', type: 'string', required: false, description: 'Provider ID' },
      { name: 'capability', type: 'string', required: false, description: 'Capability' },
      { name: 'timeRange', type: 'string', required: false, description: 'Time range' },
    ],
    outputSchema: [{ name: 'performance', type: 'object', description: 'Performance metrics' }],
    supportedAssetReferences: [],
    providerPolicy: { allowedActiveProviders: [...ACTIVE_PROVIDERS], notes: 'Read-only performance metrics.' },
    blockedOrDeferredReason: 'Provider performance metrics require proven metrics collection pipeline.',
    proofRequirements: [],
    artifactRequired: false,
    jobRequired: false,
    webhookSupport: false,
    exampleDashboardRequest: { provider: 'genx', capability: 'image.generate' },
    exampleAppRequest: { description: 'Get provider performance', payload: { capability: 'learning.provider_performance', input: { provider: 'genx', capability: 'image.generate' }, context: { appId: 'marketing-app' } } },
    validationRules: [],
    connectedAppExamples: [],
    nextActionIfBlocked: 'Prove metrics collection and performance tracking pipeline.',
  },
]

// ── Lookup Map ────────────────────────────────────────────────────────────────

const CONTRACT_MAP = new Map<string, CapabilityContract>(
  CAPABILITY_CONTRACTS.map((c) => [c.capabilityId, c]),
)

// ── Public API ────────────────────────────────────────────────────────────────

export function getCapabilityContract(capabilityId: string): CapabilityContract | undefined {
  return CONTRACT_MAP.get(capabilityId)
}

export function listCapabilityContracts(): readonly CapabilityContract[] {
  return CAPABILITY_CONTRACTS
}

export function listContractsByStudio(studioId: string): CapabilityContract[] {
  return CAPABILITY_CONTRACTS.filter((c) => c.studioId === studioId)
}

export function listAppFacingCapabilities(): CapabilityContract[] {
  return CAPABILITY_CONTRACTS.filter((c) => c.appFacing)
}

export function getCapabilityBlocker(capabilityId: string): string | null {
  const contract = CONTRACT_MAP.get(capabilityId)
  if (!contract) return `Unknown capability: ${capabilityId}`
  if (contract.status === 'blocked') return contract.blockedOrDeferredReason ?? 'Capability is blocked.'
  if (contract.status === 'deferred') return contract.blockedOrDeferredReason ?? 'Capability is deferred.'
  if (contract.status === 'future') return contract.blockedOrDeferredReason ?? 'Capability is reserved for future release.'
  if (contract.status === 'needs_proof') return contract.blockedOrDeferredReason ?? 'Capability needs proof before ready status.'
  return null
}

export function getCapabilityProofRequirement(capabilityId: string): ProofRequirement[] {
  const contract = CONTRACT_MAP.get(capabilityId)
  return contract?.proofRequirements ?? []
}

export function getCapabilityExampleAppRequest(capabilityId: string): ExampleAppRequest | undefined {
  return CONTRACT_MAP.get(capabilityId)?.exampleAppRequest
}

export function getCapabilityAllowedProviders(capabilityId: string): ActiveV1Provider[] {
  return CONTRACT_MAP.get(capabilityId)?.providerPolicy.allowedActiveProviders ?? []
}

export function validateCapabilityInput(
  capabilityId: string,
  input: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const contract = CONTRACT_MAP.get(capabilityId)
  if (!contract) {
    return { valid: false, errors: [`Unknown capability: ${capabilityId}`] }
  }

  const errors: string[] = []

  if (contract.status === 'blocked') {
    errors.push(contract.blockedOrDeferredReason ?? 'Capability is blocked.')
  }
  if (contract.status === 'deferred') {
    errors.push(contract.blockedOrDeferredReason ?? 'Capability is deferred.')
  }

  for (const field of contract.inputSchema) {
    if (field.required) {
      const value = input[field.name]
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field.name} is required`)
      }
    }
  }

  if (input && typeof input === 'object') {
    if ('providerOverride' in input) {
      errors.push('providerOverride is not allowed. Runtime selects the provider.')
    }
    if ('modelOverride' in input) {
      errors.push('modelOverride is not allowed. Runtime selects the model.')
    }
  }

  return { valid: errors.length === 0, errors }
}

export function isCapabilityAppFacing(capabilityId: string): boolean {
  return CONTRACT_MAP.get(capabilityId)?.appFacing ?? false
}

export function isCapabilityExecutable(capabilityId: string): boolean {
  const contract = CONTRACT_MAP.get(capabilityId)
  if (!contract) return false
  return contract.status === 'active' || contract.status === 'needs_proof'
}

export function getCapabilityStudioId(capabilityId: string): string | undefined {
  return CONTRACT_MAP.get(capabilityId)?.studioId
}

export function listCapabilityIds(): string[] {
  return CAPABILITY_CONTRACTS.map((c) => c.capabilityId)
}

export function getContractsByCategory(category: CapabilityCategory): CapabilityContract[] {
  return CAPABILITY_CONTRACTS.filter((c) => c.category === category)
}
