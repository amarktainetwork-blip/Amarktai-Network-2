import {
  ACTIVE_V1_RUNTIME_PROVIDERS,
  FUTURE_WORKBENCH_PROVIDERS,
  type ActiveV1RuntimeProviderKey,
  type FutureWorkbenchProviderKey,
} from '@/lib/provider-runtime'

export type DashboardLayerId = 'operate' | 'create' | 'connect'
export type CapabilityStudioStatus = 'working' | 'needs_proof' | 'blocked' | 'deferred' | 'not_configured'

export interface DashboardControlRoomSection {
  id: string
  label: string
  layer: DashboardLayerId
  href: string
  purpose: string
}

export interface CapabilityStudioSpec {
  id: string
  displayName: string
  capabilityIds: string[]
  purpose: string
  connectedAppUseCases: string[]
  supportedInputs: string[]
  supportedAssetReferences: string[]
  supportedOutputs: string[]
  providerPolicy: string
  activeProviderIds: ActiveV1RuntimeProviderKey[]
  modelFamilies: string[]
  proofStatus: CapabilityStudioStatus
  currentBlocker: string
  recentJobsSource: string
  appsCanUse: string[]
  exampleAppRequestPayload: Record<string, unknown>
  nextActions: string[]
  controls: string[]
}

export interface ProviderModelSurface {
  providerId: ActiveV1RuntimeProviderKey | FutureWorkbenchProviderKey
  displayName: string
  role: string
  runtimeStatus: 'active_v1' | 'future_workbench'
  supportedCapabilities: string[]
  modelFamilies: string[]
  liveProofStatus: string
  blocker: string
}

export const DASHBOARD_CONTROL_ROOM_SECTIONS: readonly DashboardControlRoomSection[] = [
  { id: 'command-center', label: 'Command Center', layer: 'operate', href: '/admin/dashboard', purpose: 'Readiness, blockers, live proof, storage, queue, and provider summaries.' },
  { id: 'studio', label: 'Studio', layer: 'create', href: '/admin/dashboard/studio', purpose: 'Capability workbench for honest tests, previews, artifacts, and proof notes.' },
  { id: 'app-connections', label: 'App Connections', layer: 'connect', href: '/admin/dashboard/app-runtime', purpose: 'External app API keys, webhooks, capability permissions, budgets, and request contract.' },
  { id: 'capabilities', label: 'Capabilities', layer: 'connect', href: '/admin/dashboard/capabilities', purpose: 'Capability map, provider candidates, routes, proof status, blockers, and next actions.' },
  { id: 'providers-models', label: 'Providers & Models', layer: 'connect', href: '/admin/dashboard/providers', purpose: 'Active provider policy, model families, proof status, and configuration blockers.' },
  { id: 'jobs-artifacts', label: 'Jobs & Artifacts', layer: 'operate', href: '/admin/dashboard/assets', purpose: 'Job lifecycle, artifact lineage, downloads, signed references, and delivery state.' },
  { id: 'webhooks-handoff', label: 'Webhooks / Handoff', layer: 'operate', href: '/admin/dashboard/automation', purpose: 'Callback delivery, retries, approvals, app destinations, and handoff state.' },
  { id: 'agents-learning', label: 'Agents / Learning', layer: 'connect', href: '/admin/dashboard/memory', purpose: 'Controlled agent foundations, learning summaries, versioned presets, and tenant-safe patterns.' },
  { id: 'system-settings', label: 'System / Settings', layer: 'operate', href: '/admin/dashboard/system', purpose: 'Database, storage, worker, VPS, queue, Redis, Qdrant, and Settings handoff.' },
] as const

export const DASHBOARD_MENTAL_LAYERS = [
  { id: 'operate', label: 'Operate', sections: ['Command Center', 'Jobs & Artifacts', 'Webhooks / Handoff', 'System / Settings'] },
  { id: 'create', label: 'Create', sections: ['Studio', 'Text & Chat Studio', 'Image Studio', 'Video Studio', 'Long-form Video Studio', 'Music / Song Studio', 'Voice Studio', 'Avatar Studio', 'Scrape / Brand Studio', 'RAG / Knowledge Studio'] },
  { id: 'connect', label: 'Connect', sections: ['App Connections', 'Capabilities', 'Providers & Models', 'Agents / Learning'] },
] as const

export const JOB_LIFECYCLE_STATES = [
  'draft',
  'validating',
  'queued',
  'running',
  'awaiting_review',
  'completed',
  'artifact_persisted',
  'webhook_sent',
  'delivered',
  'failed',
  'cancelled',
  'retrying',
] as const

export const PLANNED_CONNECTED_APPS = [
  { appId: 'marketing-app', displayName: 'Marketing App', environment: 'planned', defaultCapabilities: ['brand.scrape', 'text.copywrite', 'image.brand_creative', 'video.reel', 'music.promo_reels'] },
  { appId: 'music-app', displayName: 'Music App', environment: 'planned', defaultCapabilities: ['music.lyrics', 'music.song', 'music.cover_art', 'music.video_brief', 'video.music_clip'] },
  { appId: 'religious-app', displayName: 'Religious App', environment: 'planned', defaultCapabilities: ['rag.answer', 'text.scriptwrite', 'voice.tts', 'video.generate'] },
  { appId: 'crypto-app', displayName: 'Crypto App', environment: 'planned', defaultCapabilities: ['rag.search', 'text.summarize', 'text.copywrite', 'video.ad'] },
  { appId: 'horse-app', displayName: 'Horse App', environment: 'planned', defaultCapabilities: ['voice.stt', 'text.summarize', 'rag.answer', 'document.artifact'] },
] as const

export const PROVIDER_MODEL_SURFACE: readonly ProviderModelSurface[] = [
  {
    providerId: 'genx',
    displayName: 'GenX',
    role: 'Premium router, media execution, model catalog, and GenX-hosted model families.',
    runtimeStatus: 'active_v1',
    supportedCapabilities: ['chat', 'image', 'video', 'long_form_video', 'music', 'voice', 'avatar'],
    modelFamilies: ['text', 'image', 'video', 'voice', 'audio', 'Kling family through GenX catalog when present'],
    liveProofStatus: 'Configured proof is shown by provider runtime truth and proof commands only.',
    blocker: 'Music requires GENX_MUSIC_MODEL before Pack A music proof can pass.',
  },
  {
    providerId: 'together',
    displayName: 'Together',
    role: 'Balanced multimodal provider for chat, image, embeddings, rerank, and model-specific video where wired.',
    runtimeStatus: 'active_v1',
    supportedCapabilities: ['chat', 'image', 'embeddings', 'rerank', 'video_requires_model_specific_proof'],
    modelFamilies: ['chat', 'FLUX image', 'embeddings', 'rerank', 'dedicated or account-enabled video'],
    liveProofStatus: 'Execution must be proven per capability; route existence is not proof.',
    blocker: 'Video requires account/model support and live async job proof.',
  },
  {
    providerId: 'groq',
    displayName: 'Groq',
    role: 'Fast text, reasoning, structured output, streaming text, STT, and voice paths where wired.',
    runtimeStatus: 'active_v1',
    supportedCapabilities: ['chat', 'structured_output', 'reasoning', 'streaming_text', 'stt', 'tts_requires_verification'],
    modelFamilies: ['Llama text', 'reasoning models', 'whisper-large-v3 STT', 'Orpheus TTS where account supports it'],
    liveProofStatus: 'Groq STT remains an active proven path where configured.',
    blocker: 'TTS remains account/model dependent until proof passes.',
  },
  {
    providerId: 'mimo',
    displayName: 'MiMo',
    role: 'Future coding, workbench, reasoning, and V2 agent support only.',
    runtimeStatus: 'future_workbench',
    supportedCapabilities: ['workbench_future', 'coding_future', 'reasoning_agents_future'],
    modelFamilies: ['Xiaomi MiMo workbench text models when verified later'],
    liveProofStatus: 'Not active V1 app runtime.',
    blocker: 'Reserved for future/workbench; not available to connected app runtime in V1.',
  },
] as const

export const CAPABILITY_STUDIOS: readonly CapabilityStudioSpec[] = [
  {
    id: 'text-chat',
    displayName: 'Text & Chat Studio',
    capabilityIds: ['text.chat', 'text.generate', 'text.summarize', 'text.classify', 'text.structured_output', 'text.scriptwrite', 'text.copywrite'],
    purpose: 'Draft, reason, classify, summarize, script, and produce structured text for connected apps.',
    connectedAppUseCases: ['marketing copy', 'music lyrics brief', 'religious study answers', 'crypto commentary', 'support responses'],
    supportedInputs: ['prompt', 'system instruction', 'persona preset', 'audience', 'tone', 'language', 'output length', 'JSON/schema mode', 'strict JSON toggle', 'citation-required toggle', 'reasoning mode', 'stream mode', 'tool permissions', 'brand voice lock', 'forbidden phrase list', 'memory scope', 'app simulation'],
    supportedAssetReferences: ['brand guide PDF', 'source documents', 'transcripts', 'knowledge set references'],
    supportedOutputs: ['text', 'JSON', 'summary', 'classification', 'script', 'copy'],
    providerPolicy: 'Runtime selects GenX, Together, or Groq. Apps never send provider or model.',
    activeProviderIds: ['genx', 'together', 'groq'],
    modelFamilies: ['Groq fast text/reasoning', 'Together chat/function calling/structured outputs', 'GenX sessions/files/tools/catalog where wired'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Provider key/test status determines live availability.',
    recentJobsSource: 'command jobs and artifact records',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'text.chat', input: { prompt: 'Write launch copy for this brand.' }, context: { appId: 'marketing-app', tenantId: 'tenant_demo' }, controls: { tone: 'premium', strictJson: false } },
    nextActions: ['Prove connected provider chat path', 'Record artifact/proof for structured output'],
    controls: ['prompt', 'systemInstruction', 'personaPreset', 'audience', 'tone', 'language', 'outputLength', 'jsonSchemaMode', 'strictJson', 'citationsRequired', 'reasoningMode', 'streamMode', 'toolPermissions', 'brandVoiceLock', 'forbiddenPhrases', 'memoryScope'],
  },
  {
    id: 'image',
    displayName: 'Image Studio',
    capabilityIds: ['image.generate', 'image.edit', 'image.variation', 'image.brand_creative', 'image.thumbnail', 'image.cover_art', 'image.product_mockup'],
    purpose: 'Generate and inspect image artifacts, brand creatives, thumbnails, covers, and product mockups.',
    connectedAppUseCases: ['campaign images', 'music cover art', 'religious post art', 'crypto explainer thumbnails', 'horse training visuals'],
    supportedInputs: ['prompt', 'negative prompt', 'purpose preset', 'style preset', 'model family', 'aspect ratio', 'width', 'height', 'variations', 'seed', 'steps', 'guidance scale', 'response format'],
    supportedAssetReferences: ['reference images', 'logo URL', 'product image URL', 'brand guide PDF', 'palette reference', 'typography reference'],
    supportedOutputs: ['image artifact', 'thumbnail', 'cover art', 'mockup', 'download/reference link'],
    providerPolicy: 'Together image path is important/proven where configured; GenX is premium/fallback where wired.',
    activeProviderIds: ['together', 'genx'],
    modelFamilies: ['Together FLUX-style models', 'GenX image families'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Live image generation and artifact persistence must pass for connected provider.',
    recentJobsSource: 'generated assets and canonical artifacts',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'image.generate', input: { prompt: 'Premium product launch visual.' }, assetReferences: [{ type: 'logo', url: 'signed-app-url' }], controls: { aspectRatio: '1:1', variations: 2, seed: 42 } },
    nextActions: ['Prove base64/bytes or downloaded artifact persistence', 'Add image edit proof when executable'],
    controls: ['prompt', 'negativePrompt', 'purposePreset', 'stylePreset', 'modelFamily', 'aspectRatio', 'width', 'height', 'variationCount', 'seed', 'steps', 'guidanceScale', 'responseFormat', 'referenceImages', 'logoPlacement', 'paletteLock', 'typographyLock', 'thumbnailSafeZone', 'productMockupMode', 'brandImageVariantMode', 'compareGrid', 'artifactPersistenceStatus'],
  },
  {
    id: 'video',
    displayName: 'Video Studio',
    capabilityIds: ['video.generate', 'video.image_to_video', 'video.reference_to_video', 'video.edit', 'video.reel', 'video.ad', 'video.music_clip'],
    purpose: 'Run and inspect short-form video, image-to-video, reference-to-video, and platform clip jobs.',
    connectedAppUseCases: ['reels', 'ads', 'music clips', 'avatar scene clips', 'product videos'],
    supportedInputs: ['prompt', 'negative prompt', 'model family', 'standard video mode', 'Kling/keyframe mode', 'Wan-style mode if Together path exists', 'text-to-video', 'image-to-video', 'reference-to-video', 'video-edit mode', 'first frame', 'last frame', 'seconds/duration', 'fps', 'aspect ratio', 'resolution', 'output format', 'output quality', 'steps', 'guidance scale', 'seed', 'camera movement preset', 'motion strength', 'style preset', 'platform preset'],
    supportedAssetReferences: ['reference images', 'source video', 'audio inputs', 'first frame', 'last frame'],
    supportedOutputs: ['video artifact', 'async job state', 'provider attempts', 'download/reference link'],
    providerPolicy: 'GenX exposes model-family cards from catalog where possible; Kling is a GenX model family if accessed through GenX. Together video is async and model-specific.',
    activeProviderIds: ['genx', 'together'],
    modelFamilies: ['GenX video families', 'GenX Kling family if present', 'Together account-enabled video models'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Video requires live async job and artifact persistence proof.',
    recentJobsSource: 'videoGenerationJob and artifacts',
    appsCanUse: ['Marketing App', 'Music App', 'Crypto App'],
    exampleAppRequestPayload: { capability: 'video.image_to_video', input: { prompt: 'Animate this product image into a 6 second reel.' }, assetReferences: [{ type: 'image', url: 'signed-app-url' }], controls: { durationSeconds: 6, fps: 24, aspectRatio: '9:16', seed: 12 } },
    nextActions: ['Prove Together video only with supported model/account', 'Prove GenX video job polling and artifact ingestion'],
    controls: ['prompt', 'negativePrompt', 'modelFamily', 'standardVideoMode', 'klingKeyframeMode', 'wanStyleMode', 'textToVideo', 'imageToVideo', 'referenceToVideo', 'videoEditMode', 'firstFrame', 'lastFrame', 'referenceImages', 'sourceVideo', 'audioInputs', 'durationSeconds', 'fps', 'aspectRatio', 'resolution', 'outputFormat', 'outputQuality', 'steps', 'guidanceScale', 'seed', 'cameraMovementPreset', 'motionStrength', 'stylePreset', 'platformPreset', 'asyncJobState', 'artifactPersistence', 'providerAttempts'],
  },
  {
    id: 'long-form-video',
    displayName: 'Long-form Video Studio',
    capabilityIds: ['video.longform', 'video.scene_plan', 'video.scene_generate', 'video.assemble', 'video.cutdown_pack', 'video.marketing_reels_pack', 'video.music_video'],
    purpose: 'Orchestrate scripts, scenes, clips, voice, subtitles, music beds, ffmpeg assembly, thumbnails, and cutdowns.',
    connectedAppUseCases: ['marketing explainers', 'music videos', 'religious lessons', 'crypto education', 'training videos'],
    supportedInputs: ['source mode', 'script', 'outline', 'URL', 'brand pack', 'song', 'knowledge set', 'target duration', 'scene count', 'scene planner', 'storyboard editor', 'per-scene prompt', 'B-roll policy', 'voiceover policy', 'subtitle style', 'music bed policy', 'avatar presenter policy', 'transition preset', 'aspect targets', 'cutdown pack', 'chapter markers', 'CTA insertion'],
    supportedAssetReferences: ['brand pack', 'knowledge set', 'song artifact', 'voice reference', 'image references', 'video references'],
    supportedOutputs: ['scene manifest', 'intermediate clips', 'final MP4 artifact', 'thumbnail pack', 'subtitle files', 'cutdown pack'],
    providerPolicy: 'Long-form is orchestration using GenX, Together, Groq, and ffmpeg; it is not one provider call.',
    activeProviderIds: ['genx', 'together', 'groq'],
    modelFamilies: ['text planning', 'short video generation', 'voice', 'music', 'ffmpeg assembly'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Must persist intermediate clips before ffmpeg assembly and final MP4 artifact proof.',
    recentJobsSource: 'long-form video jobs and artifacts',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'video.longform', input: { sourceMode: 'outline', outline: 'Three minute launch explainer.' }, controls: { targetDuration: '180s', sceneCount: 12, aspectTargets: ['16:9', '9:16'], cutdowns: ['15s', '30s', '60s'] } },
    nextActions: ['Prove scene artifact persistence', 'Prove ffmpeg final assembly', 'Prove webhook delivery after completion'],
    controls: ['sourceMode', 'targetDuration', 'sceneCount', 'scenePlanner', 'storyboardEditor', 'perScenePrompt', 'brollPolicy', 'voiceoverPolicy', 'subtitleStyle', 'musicBedPolicy', 'avatarPresenterPolicy', 'transitionPreset', 'aspectTargets', 'cutdownPack', 'chapterMarkers', 'ctaInsertion', 'ffmpegAssemblyStatus', 'intermediateArtifactPersistence', 'finalMp4Artifact', 'thumbnailPack', 'subtitleFiles', 'sceneManifest'],
  },
  {
    id: 'music-song',
    displayName: 'Music / Song Studio',
    capabilityIds: ['music.lyrics', 'music.song', 'music.instrumental', 'music.loop', 'music.cover_art', 'music.video_brief', 'music.promo_reels'],
    purpose: 'Prepare lyrics, song structure, genre, vocals, instrumentals, cover art, and music video handoff.',
    connectedAppUseCases: ['full songs', 'instrumentals', 'campaign jingles', 'music cover art', 'promo reels'],
    supportedInputs: ['concept prompt', 'lyric mode', 'custom lyrics', 'genre multi-select', 'genre weights', 'mood', 'BPM / tempo range', 'key', 'language', 'duration', 'vocals yes/no', 'vocal style', 'voice/gender/style', 'instruments', 'song structure', 'hook-first toggle', 'chorus repeat count', 'bridge intensity', 'pronunciation guide', 'reference track assets', 'cover art prompt', 'cover art lock', 'stems requested toggle', 'lyric timestamping', 'generate music video brief', 'output format'],
    supportedAssetReferences: ['reference track', 'lyrics document', 'brand guide', 'cover image reference'],
    supportedOutputs: ['audio artifact', 'lyrics', 'timestamped lyrics', 'cover art request', 'music video brief', 'promo reels request'],
    providerPolicy: 'Final song generation is an internal adapter. GenX is primary for V1 when GENX_MUSIC_MODEL is configured. Groq/Together may assist with lyrics, briefs, transcription, and cover art, not fake final song output.',
    activeProviderIds: ['genx', 'groq', 'together'],
    modelFamilies: ['GenX music/audio model', 'Groq/Together text assist', 'Together/GenX cover art image'],
    proofStatus: 'blocked',
    currentBlocker: 'GenX music audio requires GENX_MUSIC_MODEL with GenX credentials.',
    recentJobsSource: 'music artifacts and proof status',
    appsCanUse: ['Music App', 'Marketing App'],
    exampleAppRequestPayload: { capability: 'music.song', input: { concept: 'A hopeful amapiano gospel song.' }, controls: { lyricMode: 'generate', genres: ['amapiano', 'gospel'], genreWeights: { amapiano: 0.7, gospel: 0.3 }, bpmRange: [108, 116], vocals: true, structure: ['intro', 'verse', 'chorus', 'bridge', 'outro'] } },
    nextActions: ['Set GENX_MUSIC_MODEL', 'Run Pack A music proof', 'Persist real audio artifact'],
    controls: ['conceptPrompt', 'lyricMode', 'customLyrics', 'genreMultiSelect', 'genreWeights', 'mood', 'bpmTempoRange', 'key', 'language', 'duration', 'vocals', 'instrumental', 'vocalStyle', 'voiceGenderStyle', 'instruments', 'intro', 'verse', 'preChorus', 'chorus', 'bridge', 'breakdown', 'outro', 'hookFirst', 'chorusRepeatCount', 'bridgeIntensity', 'pronunciationGuide', 'referenceTrackAssets', 'coverArtPrompt', 'coverArtLock', 'stemsRequested', 'lyricTimestamping', 'generateMusicVideoBrief', 'outputFormat', 'artifactPersistence', 'providerBlockerStatus'],
  },
  {
    id: 'voice',
    displayName: 'Voice Studio',
    capabilityIds: ['voice.tts', 'voice.stt', 'voice.voiceover', 'voice.dub', 'voice.subtitle', 'voice.library'],
    purpose: 'Handle TTS, STT, dubbing, voiceover, subtitles, and reusable voice library foundations.',
    connectedAppUseCases: ['voiceovers', 'transcripts', 'subtitles', 'support voice notes', 'training narration'],
    supportedInputs: ['TTS text', 'voice', 'voice preset', 'language', 'speaking style', 'emotion', 'speed', 'pitch', 'response format', 'sample rate', 'streaming mode', 'WebSocket mode', 'pronunciation dictionary', 'chunking mode', 'telephony mode', 'STT file or signed URL', 'translation mode', 'verbose JSON', 'diarization', 'speaker counts', 'word timestamps', 'segment timestamps', 'SRT/VTT export'],
    supportedAssetReferences: ['audio file', 'signed audio URL', 'voice sample', 'subtitle file'],
    supportedOutputs: ['mp3', 'wav', 'raw audio', 'transcript', 'verbose JSON', 'SRT', 'VTT', 'voice library reference'],
    providerPolicy: 'Groq STT is active/proven where configured. Together and GenX support voice/audio where wired and proven.',
    activeProviderIds: ['groq', 'genx', 'together'],
    modelFamilies: ['Groq whisper-large-v3 STT', 'Groq speech where enabled', 'GenX voice/audio', 'Together voice where wired'],
    proofStatus: 'needs_proof',
    currentBlocker: 'TTS provider/model and artifact proof remain account dependent; STT path uses connected Groq/GenX truth.',
    recentJobsSource: 'voice artifacts and transcript artifacts',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'voice.stt', input: { audioUrl: 'signed-app-url' }, controls: { language: 'auto', diarization: true, wordTimestamps: true, subtitleExport: ['srt', 'vtt'] } },
    nextActions: ['Keep Groq STT proof intact', 'Prove TTS artifact persistence', 'Add voice library proof before ready status'],
    controls: ['tabs:TTS/STT/Dubbing/VoiceLibrary', 'text', 'voice', 'voicePreset', 'language', 'speakingStyle', 'emotion', 'speed', 'pitch', 'responseFormat', 'sampleRate', 'streamingMode', 'websocketMode', 'pronunciationDictionary', 'chunkingMode', 'telephonyMode', 'artifactPersistence', 'fileOrSignedUrl', 'directUploadReference', 'translationMode', 'verboseJson', 'diarization', 'minSpeakers', 'maxSpeakers', 'wordTimestamps', 'segmentTimestamps', 'subtitleExport', 'speakerRemapping', 'trimSilenceRemoval', 'largeFileWarning', 'providerLimits'],
  },
  {
    id: 'avatar',
    displayName: 'Avatar Studio',
    capabilityIds: ['avatar.generate', 'avatar.talking_head', 'avatar.presenter', 'avatar.lipsync', 'avatar.voice_bind', 'avatar.library'],
    purpose: 'Manage avatar library, profile references, presenter scripts, voice binding, talking head, and lip-sync jobs.',
    connectedAppUseCases: ['presenter videos', 'music performers', 'support avatars', 'education hosts'],
    supportedInputs: ['avatar library', 'prebuilt avatar cards', 'avatar profile ID', 'avatar style', 'face/image reference', 'full body mode', 'talking head mode', 'presenter mode', 'voice binding', 'voice preset', 'script', 'source audio', 'language', 'emotion', 'gesture intensity', 'camera framing', 'background style', 'clothing/style notes', 'subtitles', 'lower-third branding', 'CTA outro', 'silence padding', 'approval required'],
    supportedAssetReferences: ['face image', 'avatar image', 'source audio', 'script document', 'brand lower-third'],
    supportedOutputs: ['avatar image', 'talking head video', 'presenter video', 'lip-sync video', 'library entry'],
    providerPolicy: 'Avatar is orchestrated and likely GenX-backed first. Do not show ready until route and artifact proof exist.',
    activeProviderIds: ['genx', 'together'],
    modelFamilies: ['GenX avatar/video', 'Together image where wired', 'voice binding from Voice Studio'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Talking video/lip-sync requires route, model, and artifact proof.',
    recentJobsSource: 'avatar library and video jobs',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App'],
    exampleAppRequestPayload: { capability: 'avatar.talking_head', input: { script: 'Welcome to the launch.' }, assetReferences: [{ type: 'avatar_profile', id: 'avatar_demo' }, { type: 'audio', url: 'signed-app-url' }], controls: { emotion: 'confident', cameraFraming: 'talking_head', subtitles: true } },
    nextActions: ['Prove avatar image artifact', 'Prove lip-sync/talking-head video route', 'Persist reusable avatar library entries'],
    controls: ['avatarLibrary', 'prebuiltAvatarCards', 'avatarProfileId', 'avatarStyle', 'faceImageReference', 'fullBodyMode', 'talkingHeadMode', 'presenterMode', 'voiceBinding', 'voicePreset', 'script', 'sourceAudio', 'language', 'emotion', 'gestureIntensity', 'cameraFraming', 'backgroundStyle', 'clothingStyleNotes', 'subtitles', 'lowerThirdBranding', 'ctaOutro', 'silencePadding', 'approvalRequired', 'videoOutput', 'artifactPersistence'],
  },
  {
    id: 'scrape-brand',
    displayName: 'Scrape / Brand Studio',
    capabilityIds: ['brand.scrape', 'brand.extract', 'brand.pack_create', 'brand.asset_ingest', 'brand.knowledge_create'],
    purpose: 'Capture websites, logos, product data, brand voice, content pillars, screenshots, and brand packs.',
    connectedAppUseCases: ['marketing onboarding', 'brand memory', 'product taxonomy', 'competitor capture', 'knowledge set creation'],
    supportedInputs: ['website URL', 'crawl depth', 'max pages', 'include patterns', 'exclude patterns', 'render JS toggle', 'screenshot capture', 'sitemap mode', 'extraction goals', 'create brand pack', 'create knowledge set', 'app handoff'],
    supportedAssetReferences: ['logo URL', 'product image URL', 'brand guide PDF', 'screenshots', 'reference videos', 'signed app asset URLs'],
    supportedOutputs: ['logos', 'colors', 'fonts', 'hero copy', 'products', 'services', 'testimonials', 'FAQs', 'social links', 'contact details', 'CTAs', 'offers', 'competitors', 'brand voice summary', 'audience inference', 'do-not-say list', 'content pillars', 'logo normalization', 'palette extraction', 'product taxonomy', 'brand pack', 'knowledge set'],
    providerPolicy: 'Playwright/Crawlee render and capture where wired. Sharp normalizes images when installed. RAG/Qdrant backs knowledge sets where wired.',
    activeProviderIds: ['groq', 'together', 'genx'],
    modelFamilies: ['local crawler tools', 'text extraction', 'RAG/Qdrant ingestion', 'image/logo processing'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Scraper and brand pack proof depends on local tool availability and storage.',
    recentJobsSource: 'research records, memory records, and artifacts',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'brand.scrape', input: { websiteUrl: 'https://example.com' }, controls: { crawlDepth: 2, renderJs: true, screenshotCapture: true, extractionGoals: ['logos', 'colors', 'products', 'brandVoiceSummary'] } },
    nextActions: ['Prove Playwright/Crawlee availability', 'Persist brand pack artifacts', 'Wire brand pack to app capability permissions'],
    controls: ['websiteUrl', 'crawlDepth', 'maxPages', 'includePatterns', 'excludePatterns', 'renderJs', 'screenshotCapture', 'sitemapMode', 'logos', 'colors', 'fonts', 'heroCopy', 'products', 'services', 'testimonials', 'faqs', 'socialLinks', 'contactDetails', 'ctas', 'offers', 'competitors', 'brandVoiceSummary', 'audienceInference', 'doNotSayList', 'contentPillars', 'logoNormalization', 'paletteExtraction', 'productTaxonomy', 'createBrandPack', 'createKnowledgeSet', 'appHandoff'],
  },
  {
    id: 'rag-knowledge',
    displayName: 'RAG / Knowledge Studio',
    capabilityIds: ['rag.ingest', 'rag.answer', 'rag.search', 'rag.extract', 'rag.rerank', 'knowledge.collection'],
    purpose: 'Ingest files and URLs, build knowledge sets, test retrieval, require citations, and preview grounded answers.',
    connectedAppUseCases: ['religious source answers', 'crypto research', 'horse documents', 'support knowledge', 'brand memory'],
    supportedInputs: ['knowledge set', 'source URLs', 'uploaded files', 'PDFs', 'app-provided documents', 'chunking preset', 'metadata schema', 'embedding model', 'collection name', 'top-k', 'rerank toggle', 'citation required', 'answer style', 'confidence band', 'freshness filter', 'source filtering', 'versioned knowledge sets', 'app access scope'],
    supportedAssetReferences: ['PDF', 'document', 'URL', 'knowledge collection', 'signed app file'],
    supportedOutputs: ['ingestion status', 'retrieval preview', 'answer preview', 'citations', 'collection metadata'],
    providerPolicy: 'Together embeddings/rerank where wired, Qdrant local vector store where wired, and Groq/GenX/Together for final answers.',
    activeProviderIds: ['together', 'groq', 'genx'],
    modelFamilies: ['Together embeddings', 'Together rerank', 'Qdrant collections', 'Groq/GenX/Together answers'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Ingestion, collection storage, retrieval, and citation proof must pass before ready status.',
    recentJobsSource: 'research records and knowledge artifacts',
    appsCanUse: ['Religious App', 'Crypto App', 'Horse App', 'Marketing App'],
    exampleAppRequestPayload: { capability: 'rag.answer', input: { question: 'Summarize the latest uploaded guide.' }, context: { knowledgeSet: 'tenant_knowledge_demo' }, controls: { topK: 6, rerank: true, citationsRequired: true } },
    nextActions: ['Prove Qdrant/vector storage path', 'Prove cited retrieval preview', 'Prove app-scoped access boundaries'],
    controls: ['knowledgeSet', 'sourceUrls', 'uploadedFiles', 'pdfs', 'appProvidedDocuments', 'chunkingPreset', 'metadataSchema', 'embeddingModel', 'collectionName', 'topK', 'rerank', 'citationRequired', 'answerStyle', 'confidenceBand', 'freshnessFilter', 'sourceFiltering', 'versionedKnowledgeSets', 'appAccessScope', 'ingestionStatus', 'retrievalPreview', 'answerPreview'],
  },
  {
    id: 'jobs-artifacts',
    displayName: 'Jobs / Artifacts Studio',
    capabilityIds: ['job.list', 'job.timeline', 'artifact.lineage', 'artifact.download', 'webhook.delivery'],
    purpose: 'Inspect job timelines, retries, artifacts, lineage, signed URLs, delivery state, cost, and timing.',
    connectedAppUseCases: ['job polling', 'artifact handoff', 'webhook delivery', 'retry from failure', 'approval workflows'],
    supportedInputs: ['job list', 'job timeline', 'queue state', 'provider attempts', 'retry count', 'retry from failed step', 'duplicate with same inputs', 'cancel job', 'artifact lineage', 'artifact preview', 'download link', 'signed URL expiry', 'artifact metadata', 'artifact validation', 'parent/child jobs', 'cost by run', 'duration by stage', 'webhook delivery state', 'app destination', 'retention policy'],
    supportedAssetReferences: ['artifact id', 'storage path', 'signed URL', 'parent job id', 'webhook attempt id'],
    supportedOutputs: ['job state', 'artifact preview', 'artifact metadata', 'delivery receipt', 'retry result'],
    providerPolicy: 'Job and artifact controls do not choose providers. They report runtime-selected provider attempts after execution.',
    activeProviderIds: ['genx', 'together', 'groq'],
    modelFamilies: ['runtime-selected provider attempts after execution'],
    proofStatus: 'needs_proof',
    currentBlocker: 'Live job lifecycle and webhook delivery proof remain capability-specific.',
    recentJobsSource: 'jobs, artifacts, webhook attempts',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'job.status', input: { jobId: 'job_demo' }, controls: { includeArtifacts: true, includeWebhookAttempts: true } },
    nextActions: ['Prove retry from failed step', 'Prove signed artifact delivery', 'Prove webhook sent/delivered states'],
    controls: ['jobList', 'jobTimeline', 'queueState', 'providerAttempts', 'retryCount', 'retryFromFailedStep', 'duplicateWithSameInputs', 'cancelJob', 'artifactLineage', 'artifactPreview', 'downloadLink', 'signedUrlExpiry', 'artifactMetadata', 'artifactValidation', 'parentChildJobs', 'costByRun', 'durationByStage', 'webhookDeliveryState', 'appDestination', 'retentionPolicy'],
  },
  {
    id: 'app-connections',
    displayName: 'App Connections Studio',
    capabilityIds: ['app.connection', 'app.api_key', 'app.webhook', 'app.capability_permissions', 'app.budget_limits'],
    purpose: 'Model external apps, API key status, webhook contract, capability permissions, budgets, rate limits, and handoff policy.',
    connectedAppUseCases: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    supportedInputs: ['app list', 'app ID', 'display name', 'environment', 'API key status', 'webhook URL', 'webhook secret status', 'callback domain allowlist', 'allowed capabilities', 'disabled capabilities', 'budget limits', 'rate limits', 'default brand pack', 'default knowledge set', 'app-specific presets', 'test webhook', 'simulate app request', 'artifact delivery policy', 'app logs', 'usage'],
    supportedAssetReferences: ['app logo', 'brand pack id', 'knowledge set id', 'webhook destination'],
    supportedOutputs: ['app permission contract', 'webhook test result', 'usage summary', 'artifact delivery policy'],
    providerPolicy: 'Apps request capabilities only. Provider/model overrides are rejected by app-facing routes.',
    activeProviderIds: ['genx', 'together', 'groq'],
    modelFamilies: ['runtime-selected only'],
    proofStatus: 'needs_proof',
    currentBlocker: 'External app gateway and webhook proof need final hardening before beta.',
    recentJobsSource: 'app logs and local app records',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'image.generate', input: { prompt: 'Create a campaign visual.' }, context: { appId: 'marketing-app', environment: 'staging', tenantId: 'tenant_demo' }, controls: { budgetTier: 'balanced' } },
    nextActions: ['Prove API key auth contract', 'Prove capability permission checks', 'Prove webhook retry and signed artifact handoff'],
    controls: ['appList', 'appId', 'displayName', 'environment', 'apiKeyStatus', 'webhookUrl', 'webhookSecretStatus', 'callbackDomainAllowlist', 'allowedCapabilities', 'disabledCapabilities', 'budgetLimits', 'rateLimits', 'defaultBrandPack', 'defaultKnowledgeSet', 'appSpecificPresets', 'testWebhook', 'simulateAppRequest', 'artifactDeliveryPolicy', 'appLogs', 'usage'],
  },
  {
    id: 'agents-learning',
    displayName: 'Agents / Learning Studio',
    capabilityIds: ['agent.run', 'agent.schedule', 'agent.review', 'learning.summary', 'learning.recommendation', 'learning.provider_performance'],
    purpose: 'Show controlled agent foundations, schedules, tools, scopes, approvals, evaluation, learning summaries, and rollback.',
    connectedAppUseCases: ['campaign operator', 'music assistant', 'research assistant', 'customer service assistant', 'automation assistant'],
    supportedInputs: ['agent list', 'app-specific agents', 'goal', 'tools/capabilities allowed', 'app scope', 'memory scope', 'schedule', 'triggers', 'evaluation rubric', 'success metric', 'spend cap', 'approval mode', 'learning status', 'versioned memory', 'versioned presets', 'shadow testing', 'rollback', 'daily improvement summary'],
    supportedAssetReferences: ['memory version', 'preset version', 'evaluation record', 'job history'],
    supportedOutputs: ['agent run record', 'learning summary', 'recommendation', 'provider performance insight', 'versioned preset'],
    providerPolicy: 'Controlled learning only. No uncontrolled self-learning and no cross-tenant data leakage.',
    activeProviderIds: ['genx', 'together', 'groq'],
    modelFamilies: ['provider performance learning', 'creative performance learning', 'retry/failure learning', 'app capability recommendations'],
    proofStatus: 'deferred',
    currentBlocker: 'Agent autonomy is a future controlled foundation; it is not live-ready until execution and evaluation proof exist.',
    recentJobsSource: 'memory, agents, and job history records',
    appsCanUse: ['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'],
    exampleAppRequestPayload: { capability: 'agent.review', input: { goal: 'Review failed campaign jobs and recommend next actions.' }, controls: { approvalMode: 'manual', spendCap: 0, shadowTesting: true } },
    nextActions: ['Keep learning tenant-safe', 'Prove provider performance summary', 'Add evaluation/rollback proof before autonomy claims'],
    controls: ['agentList', 'appSpecificAgents', 'goal', 'toolsCapabilitiesAllowed', 'appScope', 'memoryScope', 'schedule', 'triggers', 'evaluationRubric', 'successMetric', 'spendCap', 'approvalMode', 'learningStatus', 'versionedMemory', 'versionedPresets', 'shadowTesting', 'rollback', 'dailyImprovementSummary'],
  },
] as const

export const ACTIVE_DASHBOARD_PROVIDER_IDS = ACTIVE_V1_RUNTIME_PROVIDERS
export const FUTURE_DASHBOARD_PROVIDER_IDS = FUTURE_WORKBENCH_PROVIDERS
