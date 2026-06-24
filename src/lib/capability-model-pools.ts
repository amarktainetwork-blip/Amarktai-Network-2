import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export type CapabilityQualityStatus =
  | 'production_ready'
  | 'technical_proof_only'
  | 'source_wired_unproven'
  | 'provider_endpoint_required'
  | 'needs_quality_gate'
  | 'blocked'

export type CapabilityCandidateDisposition =
  | 'production_allowed'
  | 'proof_only'
  | 'admin_only'
  | 'adult_only'
  | 'blocked_low_quality'
  | 'blocked_missing_contract'
  | 'blocked_endpoint_required'

export interface CapabilityModelCandidate {
  provider: ApprovedDirectProviderId
  model: string
  disposition: CapabilityCandidateDisposition
  reason: string
}

export interface CapabilityModelPool {
  capabilityId: string
  workflow: string
  primaryCandidates: CapabilityModelCandidate[]
  fallbackCandidates: CapabilityModelCandidate[]
  proofOnlyCandidates: CapabilityModelCandidate[]
  blockedLowQualityCandidates: CapabilityModelCandidate[]
  adultOnlyCandidates: CapabilityModelCandidate[]
  requiredEnv: string[]
  requiresArtifact: boolean
  requiresJobPolling: boolean
  productionReady: boolean
  qualityStatus: CapabilityQualityStatus
  notes: string
  nextAction: string
}

export type CapabilityPoolExecutionMode = 'production' | 'proof'

export interface CapabilityModelPoolDecision {
  allowed: boolean
  candidate: CapabilityModelCandidate | null
  pool: CapabilityModelPool | null
  reason: string | null
}

function candidate(
  provider: ApprovedDirectProviderId,
  model: string,
  disposition: CapabilityCandidateDisposition,
  reason: string,
): CapabilityModelCandidate {
  return { provider, model, disposition, reason }
}

export const CAPABILITY_MODEL_POOLS: readonly CapabilityModelPool[] = [
  {
    capabilityId: 'chat_text_generation',
    workflow: 'Chat text generation',
    primaryCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'Current live-proven low-latency chat route.'),
      candidate('genx', 'gpt-5.4-mini', 'production_allowed', 'Strong fallback for high-quality chat.'),
    ],
    fallbackCandidates: [
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'production_allowed', 'Open-model text fallback.'),
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'production_allowed', 'Task/model API fallback for text.'),
      candidate('mimo', 'mimo-v2.5', 'proof_only', 'MiMo text remains capability-valid but not a preferred production chat owner.'),
    ],
    proofOnlyCandidates: [candidate('mimo', 'mimo-v2.5', 'proof_only', 'MiMo text proof may remain technical until broader runtime proof exists.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Production chat should prefer proven low-latency routes and keep MiMo as non-primary text fallback.',
    nextAction: 'Keep Groq/GenX/Together/HF text lanes stable and audited.',
  },
  {
    capabilityId: 'reasoning',
    workflow: 'Deep reasoning',
    primaryCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'Current live-proven reasoning route.'),
      candidate('genx', 'gpt-5.4-mini', 'production_allowed', 'Higher-quality reasoning fallback.'),
    ],
    fallbackCandidates: [
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'production_allowed', 'Open-model reasoning fallback.'),
      candidate('mimo', 'mimo-v2.5-pro', 'proof_only', 'MiMo reasoning remains text-capable but not proven as a top production reasoning owner.'),
    ],
    proofOnlyCandidates: [candidate('mimo', 'mimo-v2.5-pro', 'proof_only', 'Technical proof only until broader runtime confidence exists.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Reasoning is technically stable; quality routing should bias Groq/GenX/Together before MiMo.',
    nextAction: 'Keep reasoning pool disciplined and avoid weak/general text defaults.',
  },
  {
    capabilityId: 'coding_assistant',
    workflow: 'Coding assistant',
    primaryCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'Current live-proven coding route.'),
      candidate('genx', 'gpt-5.3-codex', 'production_allowed', 'High-quality coding fallback.'),
    ],
    fallbackCandidates: [
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'production_allowed', 'Open-model coding fallback.'),
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Task text route exists but is not the preferred coding production lane.'),
      candidate('mimo', 'mimo-v2.5-pro', 'proof_only', 'Text-capable but not a proven coding-agent owner.'),
    ],
    proofOnlyCandidates: [
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Text fallback only.'),
      candidate('mimo', 'mimo-v2.5-pro', 'proof_only', 'Not a genuine coding-agent executor.'),
    ],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Coding should avoid weak text defaults and keep agent-quality discipline.',
    nextAction: 'Later phase: formalize repo-workbench/coding-agent ownership on the same pool truth.',
  },
  {
    capabilityId: 'web_research',
    workflow: 'Web research and RAG summary',
    primaryCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'Current live-proven summary route after retrieval.'),
      candidate('huggingface', 'BAAI/bge-small-en-v1.5', 'production_allowed', 'Current live-proven embedding route.'),
    ],
    fallbackCandidates: [candidate('genx', 'gpt-5.4-mini', 'production_allowed', 'Text fallback if Groq is unavailable.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['QDRANT_URL or equivalent runtime vector store readiness'],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Technical research proof exists; this does not imply polished analyst-quality reporting by itself.',
    nextAction: 'Keep RAG diagnostics/artifact path stable.',
  },
  {
    capabilityId: 'embeddings',
    workflow: 'Embeddings',
    primaryCandidates: [
      candidate('huggingface', 'BAAI/bge-small-en-v1.5', 'production_allowed', 'Current live-proven embeddings route.'),
      candidate('genx', 'text-embedding-3-large', 'production_allowed', 'Fallback embeddings route.'),
    ],
    fallbackCandidates: [],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Embeddings are covered after Qwen removal.',
    nextAction: 'Keep HF as primary embedding owner unless live proof changes.',
  },
  {
    capabilityId: 'summarization',
    workflow: 'Summarization',
    primaryCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'Fast text route with current live chat/reasoning proof family.'),
      candidate('genx', 'gpt-5.4-mini', 'production_allowed', 'Higher-quality text fallback.'),
    ],
    fallbackCandidates: [
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'production_allowed', 'Open text fallback.'),
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Admin/text-capability route only.'),
      candidate('mimo', 'mimo-v2.5', 'proof_only', 'Text-capable but not a preferred production owner.'),
    ],
    proofOnlyCandidates: [
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Connected-app summarization contract incomplete.'),
      candidate('mimo', 'mimo-v2.5', 'proof_only', 'No production summarization contract yet.'),
    ],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'The route family exists, but the product contract is not complete.',
    nextAction: 'Finish dedicated summarization contract and proof.',
  },
  {
    capabilityId: 'translation',
    workflow: 'Translation',
    primaryCandidates: [
      candidate('genx', 'gpt-5.4-mini', 'production_allowed', 'Primary translation fallback after Qwen removal.'),
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Admin/text route only until dedicated contract exists.'),
    ],
    fallbackCandidates: [
      candidate('groq', 'llama-3.3-70b-versatile', 'production_allowed', 'General multilingual text fallback.'),
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'production_allowed', 'Open text fallback.'),
      candidate('mimo', 'mimo-v2.5', 'proof_only', 'Text-capable only.'),
    ],
    proofOnlyCandidates: [candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'No dedicated connected-app translation contract yet.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Translation remains source-wired but not product-complete.',
    nextAction: 'Finish dedicated translation contract and proof.',
  },
  {
    capabilityId: 'text_to_image',
    workflow: 'Text to image',
    primaryCandidates: [
      candidate('together', 'black-forest-labs/FLUX.1-schnell', 'production_allowed', 'Current live-proven image route.'),
      candidate('genx', 'gpt-image-1', 'production_allowed', 'Production fallback for higher-quality image needs.'),
    ],
    fallbackCandidates: [candidate('huggingface', 'stabilityai/stable-diffusion-xl-base-1.0', 'proof_only', 'Task model fallback, but not the current preferred production Studio owner.')],
    proofOnlyCandidates: [candidate('huggingface', 'stabilityai/stable-diffusion-xl-base-1.0', 'proof_only', 'Usable for technical/image task proof, not the primary Studio default.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [candidate('huggingface', 'runwayml/stable-diffusion-v1-5', 'adult_only', 'Adult-gated candidate only.')],
    requiredEnv: [],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Technical proof exists; Studio should still avoid weak generic image defaults.',
    nextAction: 'Keep Together/GenX as production image owners until quality audit says otherwise.',
  },
  {
    capabilityId: 'image_editing_source_transform',
    workflow: 'Source-image editing / transform',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('genx', 'gpt-image-1', 'proof_only', 'Candidate exists but no live image-edit proof yet.'),
      candidate('huggingface', 'timbrooks/instruct-pix2pix', 'blocked_endpoint_required', 'HF image edit remains specialist-endpoint gated in active truth.'),
      candidate('together', 'black-forest-labs/FLUX.1-schnell', 'blocked_missing_contract', 'Text-to-image route is proven, but source-image edit contract is not proven or provider-safe for production.'),
    ],
    proofOnlyCandidates: [candidate('genx', 'gpt-image-1', 'proof_only', 'Technical candidate only until VPS route proof exists.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON for HF specialist route if private specialist routing is needed'],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Qwen arrearage is gone from active truth; no replacement route is live-proven yet.',
    nextAction: 'Prove a remaining provider-safe image-edit route or keep blocked/source-wired truth exact.',
  },
  {
    capabilityId: 'image_to_video',
    workflow: 'Image to video',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('genx', 'seedance-2-i2v', 'blocked_missing_contract', 'Discovered candidate, but no provider-safe i2v contract is defined.'),
      candidate('together', 'Wan-AI/Wan2.1-T2V-14B', 'blocked_endpoint_required', 'Together video remains endpoint/runtime gated.'),
      candidate('huggingface', 'Wan-AI/Wan2.1-I2V-14B-480P', 'blocked_endpoint_required', 'HF i2v is specialist-endpoint gated.'),
    ],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [candidate('huggingface', 'NSFW-API/NSFW_Wan_14b', 'adult_only', 'Adult-gated video candidate only.')],
    requiredEnv: ['TOGETHER_VIDEO_RUNTIME_ENABLED and TOGETHER_VIDEO_BASE_URL for Together', 'HF_SPECIALIST_ENDPOINTS_JSON for HF'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'blocked',
    notes: 'No remaining provider has a live-proven provider-safe production i2v contract.',
    nextAction: 'Add a provider-safe GenX i2v contract or prove Together/HF endpoint routes truthfully.',
  },
  {
    capabilityId: 'text_to_video_short_clip',
    workflow: 'Short text-to-video clip',
    primaryCandidates: [candidate('genx', 'veo-3.1', 'production_allowed', 'Provider-safe short-video route for production selection while grok-imagine-video remains quality-gated proof.')],
    fallbackCandidates: [
      candidate('together', 'Wan-AI/Wan2.1-T2V-14B', 'blocked_endpoint_required', 'Endpoint/runtime flag required.'),
      candidate('huggingface', 'Wan-AI/Wan2.1-T2V-14B', 'blocked_endpoint_required', 'Specialist endpoint required.'),
    ],
    proofOnlyCandidates: [candidate('genx', 'grok-imagine-video', 'proof_only', 'Current proof model is technically live but not automatically production-quality for marketing output.')],
    blockedLowQualityCandidates: [
      candidate('genx', 'grok-imagine-video', 'blocked_low_quality', 'Do not treat current technical proof model as production-quality long-form/reel default without a quality gate.'),
    ],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'needs_quality_gate',
    notes: 'Keep the technical proof, but separate proof model from production creative default.',
    nextAction: 'Add quality gate and production video pool selection before calling short-video output launch-ready.',
  },
  {
    capabilityId: 'long_form_multi_scene_video_assembly',
    workflow: 'Long-form multi-scene video assembly',
    primaryCandidates: [],
    fallbackCandidates: [candidate('genx', 'ffmpeg/local_assembly', 'proof_only', 'Technical local assembly proof only.')],
    proofOnlyCandidates: [candidate('genx', 'ffmpeg/local_assembly', 'proof_only', 'Technical assembly is not equivalent to coherent advert generation.')],
    blockedLowQualityCandidates: [candidate('genx', 'grok-imagine-video', 'blocked_low_quality', 'Short technical clip model must not imply production long-form quality.')],
    adultOnlyCandidates: [],
    requiredEnv: ['ffmpeg', 'ffprobe', 'local storage'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'technical_proof_only',
    notes: 'Long-form video is technical assembly proof only, not production-quality advert generation.',
    nextAction: 'Require quality gate, script, shot plan, voice selection, and coherent provider-native clip quality before launch-ready classification.',
  },
  {
    capabilityId: 'music_song_generation',
    workflow: 'Provider-native song generation',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('genx', 'lyria-2', 'proof_only', 'Candidate exists for music generation but no live song-generation proof is recorded.'),
      candidate('huggingface', 'facebook/musicgen-small', 'blocked_endpoint_required', 'HF music remains specialist-endpoint gated.'),
    ],
    proofOnlyCandidates: [candidate('genx', 'lyria-2', 'proof_only', 'Technical candidate only, not proven full-song workflow.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON for HF'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'blocked',
    notes: 'This is distinct from local audio-bed assembly and from lyrics-only generation. 20s/60s/120s full-song flows remain unproven.',
    nextAction: 'Define and prove provider-native song generation by duration and vocal mode.',
  },
  {
    capabilityId: 'music_audio_bed_generation',
    workflow: 'Audio-bed assembly',
    primaryCandidates: [candidate('genx', 'ffmpeg/local_audio_bed', 'proof_only', 'Current technical proof is local audio-bed assembly only.')],
    fallbackCandidates: [],
    proofOnlyCandidates: [candidate('genx', 'ffmpeg/local_audio_bed', 'proof_only', 'Not provider-native full song generation.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['ffmpeg', 'ffprobe', 'local storage'],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'technical_proof_only',
    notes: 'music_audio_bed_generation is not provider-native full song generation yet.',
    nextAction: 'Keep separate from provider-native song workflow and expose it truthfully as audio-bed only.',
  },
  {
    capabilityId: 'text_to_speech',
    workflow: 'Text to speech',
    primaryCandidates: [candidate('groq', 'canopylabs/orpheus-v1-english', 'production_allowed', 'Current live-proven TTS route.')],
    fallbackCandidates: [
      candidate('genx', 'gpt-4o-mini-tts', 'production_allowed', 'Production voice fallback.'),
      candidate('huggingface', 'facebook/mms-tts-eng', 'blocked_endpoint_required', 'HF specialist endpoint required in active truth.'),
      candidate('together', 'provider-discovery', 'proof_only', 'Available as a route family but not a preferred primary voice owner.'),
      candidate('mimo', 'mimo-tts-1', 'proof_only', 'Do not use outside runtime-proven MiMo voice phase.'),
    ],
    proofOnlyCandidates: [
      candidate('together', 'provider-discovery', 'proof_only', 'Technical route family only.'),
      candidate('mimo', 'mimo-tts-1', 'proof_only', 'MiMo runtime voice remains unproven.'),
    ],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON only for private HF TTS specialist routing'],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Groq is the current proven primary TTS owner.',
    nextAction: 'Later phase: add voice library/selection and quality gates.',
  },
  {
    capabilityId: 'speech_to_text',
    workflow: 'Speech to text',
    primaryCandidates: [candidate('genx', 'gpt-4o-transcribe', 'production_allowed', 'Current live-proven STT route.')],
    fallbackCandidates: [
      candidate('groq', 'whisper-large-v3-turbo', 'production_allowed', 'Fast STT fallback.'),
      candidate('huggingface', 'openai/whisper-large-v3', 'blocked_endpoint_required', 'HF specialist endpoint required in active truth.'),
      candidate('together', 'provider-discovery', 'proof_only', 'Route family only.'),
      candidate('mimo', 'mimo-v2.5-asr', 'proof_only', 'MiMo ASR remains runtime-gated.'),
    ],
    proofOnlyCandidates: [candidate('mimo', 'mimo-v2.5-asr', 'proof_only', 'Do not treat MiMo STT as production-ready while runtime proof is incomplete.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON only for private HF STT specialist routing'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Current STT proof is technical route proof only, not full caption-workflow quality proof.',
    nextAction: 'Later phase: align captions/subtitles workflow with quality requirements.',
  },
  {
    capabilityId: 'captions_subtitles_pipeline',
    workflow: 'Captions and subtitles pipeline',
    primaryCandidates: [candidate('genx', 'ffmpeg/subtitle_formatter', 'proof_only', 'Technical subtitle assembly proof exists locally.')],
    fallbackCandidates: [candidate('groq', 'whisper-large-v3-turbo', 'production_allowed', 'Transcript source fallback before subtitle formatting.')],
    proofOnlyCandidates: [candidate('genx', 'ffmpeg/subtitle_formatter', 'proof_only', 'Technical VTT/SRT pipeline is proven; product polish is not.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['local storage'],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'technical_proof_only',
    notes: 'Technical subtitle generation is not the same as polished launch caption workflows.',
    nextAction: 'Add caption-editing/product UX later.',
  },
  {
    capabilityId: 'avatar_library_avatar_image_generation',
    workflow: 'Avatar image generation',
    primaryCandidates: [candidate('genx', 'gpt-image-2', 'production_allowed', 'Current live-proven avatar image route.')],
    fallbackCandidates: [
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'proof_only', 'Text-based fallback in taxonomy, not a preferred avatar-image owner.'),
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'proof_only', 'Text-based fallback in taxonomy only.'),
    ],
    proofOnlyCandidates: [candidate('genx', 'gpt-image-2', 'proof_only', 'Current proof shows execution, but character-library/product quality still needs later work.')],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: true,
    qualityStatus: 'production_ready',
    notes: 'Live technical route exists; reusable character/system quality remains a later phase.',
    nextAction: 'Later phase: avatar library, profiles, and memory.',
  },
  {
    capabilityId: 'talking_avatar_video',
    workflow: 'Talking avatar video',
    primaryCandidates: [],
    fallbackCandidates: [candidate('genx', 'avatar_video', 'blocked_missing_contract', 'No approved lip-sync execution boundary exists.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['RHUBARB_PATH or LIPSYNC_SERVICE_URL'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'blocked',
    notes: 'Talking avatar remains blocked on lip-sync boundary, not on provider discovery.',
    nextAction: 'Install/configure lip-sync adapter and prove artifact output.',
  },
  {
    capabilityId: 'adult_image_generation',
    workflow: 'Adult image generation',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('huggingface', 'runwayml/stable-diffusion-v1-5', 'adult_only', 'Adult-gated HF candidate only.'),
      candidate('together', 'black-forest-labs/FLUX.1-schnell', 'adult_only', 'Adult-gated candidate only under policy and provider approval.'),
      candidate('genx', 'gpt-image-1', 'adult_only', 'Adult-gated candidate only when policy/app/provider approval exists.'),
    ],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [
      candidate('huggingface', 'runwayml/stable-diffusion-v1-5', 'adult_only', 'Policy-gated candidate only.'),
      candidate('together', 'black-forest-labs/FLUX.1.1-pro', 'adult_only', 'Policy-gated candidate only.'),
    ],
    requiredEnv: [],
    requiresArtifact: true,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'blocked',
    notes: 'Adult image generation requires adult mode, app permission, provider/model approval, safety classification, dashboard visibility, and audit logging.',
    nextAction: 'Adult/HF layer phase later.',
  },
  {
    capabilityId: 'adult_video_generation',
    workflow: 'Adult video generation',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('together', 'Wan-AI/Wan2.1-T2V-14B', 'adult_only', 'Adult-gated and endpoint-gated candidate only.'),
      candidate('huggingface', 'Wan-AI/Wan2.1-T2V-14B', 'adult_only', 'Adult-gated and specialist-endpoint-gated candidate only.'),
    ],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [
      candidate('huggingface', 'NSFW-API/NSFW_Wan_14b', 'adult_only', 'Experimental adult-gated candidate.'),
    ],
    requiredEnv: ['TOGETHER_VIDEO_RUNTIME_ENABLED and TOGETHER_VIDEO_BASE_URL for Together', 'HF_SPECIALIST_ENDPOINTS_JSON for HF'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'blocked',
    notes: 'Adult video remains policy- and endpoint-blocked.',
    nextAction: 'Adult/HF layer phase later.',
  },
  {
    capabilityId: 'adult_text_chat',
    workflow: 'Adult text / chat',
    primaryCandidates: [],
    fallbackCandidates: [
      candidate('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'adult_only', 'Only under adult policy and provider approval.'),
      candidate('mimo', 'mimo-v2.5', 'adult_only', 'Only under adult policy; MiMo remains text-capable but not a generally approved adult owner.'),
      candidate('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'adult_only', 'Policy-gated only.'),
    ],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [candidate('huggingface', 'DavidAU/Gemma-The-Writer-N-Restless-Quill-10B-Uncensored-GGUF', 'adult_only', 'Policy-gated adult text candidate only.')],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Adult text/chat exists only under explicit adult gating and later approval work.',
    nextAction: 'Adult/HF layer phase later.',
  },
  {
    capabilityId: 'connected_app_capability_execution',
    workflow: 'Connected app capability execution',
    primaryCandidates: [candidate('genx', 'capability_only_runtime', 'production_allowed', 'Apps still request capabilities only; provider/model remain internal.')],
    fallbackCandidates: [candidate('groq', 'capability_only_runtime', 'production_allowed', 'Fallback remains internal to canonical runtime.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['app signing secret and active app registry entry'],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Apps must never choose provider/model/endpoint.',
    nextAction: 'Connected apps phase later.',
  },
  {
    capabilityId: 'agent_request_execution',
    workflow: 'Agent request execution',
    primaryCandidates: [candidate('genx', 'capability_only_runtime', 'production_allowed', 'Agent request remains capability-owned.')],
    fallbackCandidates: [candidate('groq', 'capability_only_runtime', 'production_allowed', 'Fallback remains internal.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['AMARKTAI_CONNECTED_APP_SECRET or AMARKTAI_APP_SECRET_AMARKTAI_NETWORK'],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Agent runtime remains source-wired pending signed proof.',
    nextAction: 'Agents phase later.',
  },
  {
    capabilityId: 'provider_fallback',
    workflow: 'Provider fallback',
    primaryCandidates: [candidate('genx', 'runtime_route_plan', 'production_allowed', 'Fallback is a runtime behavior, not a single model owner.')],
    fallbackCandidates: [candidate('groq', 'runtime_route_plan', 'production_allowed', 'Keep proven text fallback routes in the chain.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: [],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Fallback is implemented, but live proof still requires controlled failure and recovery.',
    nextAction: 'Add explicit live fallback proof later.',
  },
  {
    capabilityId: 'route_outcome_logging',
    workflow: 'Route outcome logging',
    primaryCandidates: [candidate('genx', 'capability_tracing', 'production_allowed', 'Route logging is central-runtime behavior.')],
    fallbackCandidates: [],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['database-backed trace storage for live proof'],
    requiresArtifact: false,
    requiresJobPolling: false,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Source wiring exists, but live DB proof remains pending.',
    nextAction: 'Add DB-backed trace inspection proof later.',
  },
  {
    capabilityId: 'worker_job_retry_and_polling_completion',
    workflow: 'Worker retry and polling completion',
    primaryCandidates: [candidate('genx', 'control_plane_jobs', 'production_allowed', 'Async provider polling pipeline owner.')],
    fallbackCandidates: [candidate('together', 'control_plane_jobs', 'production_allowed', 'Async polling path where provider contract exists.')],
    proofOnlyCandidates: [],
    blockedLowQualityCandidates: [],
    adultOnlyCandidates: [],
    requiredEnv: ['REDIS_URL', 'worker service', 'local storage'],
    requiresArtifact: true,
    requiresJobPolling: true,
    productionReady: false,
    qualityStatus: 'source_wired_unproven',
    notes: 'Ops/runtime proof still requires a real queued async provider job.',
    nextAction: 'Run worker/control-plane proof later.',
  },
] as const

const CAPABILITY_MODEL_POOL_ALIASES: Record<string, string> = {
  chat: 'chat_text_generation',
  text_generation: 'chat_text_generation',
  reasoning: 'reasoning',
  code: 'coding_assistant',
  coding: 'coding_assistant',
  repo_edit: 'coding_assistant',
  app_build: 'coding_assistant',
  research: 'web_research',
  embeddings: 'embeddings',
  summarization: 'summarization',
  translation: 'translation',
  image_generation: 'text_to_image',
  text_to_image: 'text_to_image',
  image_edit: 'image_editing_source_transform',
  image_text_to_image: 'image_editing_source_transform',
  image_to_image: 'image_editing_source_transform',
  image_to_video: 'image_to_video',
  video_generation: 'text_to_video_short_clip',
  text_to_video: 'text_to_video_short_clip',
  long_form_video_assembly: 'long_form_multi_scene_video_assembly',
  text_to_speech: 'text_to_speech',
  tts: 'text_to_speech',
  automatic_speech_recognition: 'speech_to_text',
  stt: 'speech_to_text',
  avatar_generation: 'avatar_library_avatar_image_generation',
  avatar_video: 'talking_avatar_video',
  music_generation: 'music_song_generation',
  adult_image: 'adult_image_generation',
  adult_video: 'adult_video_generation',
  adult_text: 'adult_text_chat',
  agents: 'agent_request_execution',
}

function normalizeCapabilityId(capabilityId: string): string {
  return CAPABILITY_MODEL_POOL_ALIASES[capabilityId] ?? capabilityId
}

function allPoolCandidates(pool: CapabilityModelPool): CapabilityModelCandidate[] {
  return [
    ...pool.primaryCandidates,
    ...pool.fallbackCandidates,
    ...pool.proofOnlyCandidates,
    ...pool.blockedLowQualityCandidates,
    ...pool.adultOnlyCandidates,
  ]
}

function candidateReason(candidate: CapabilityModelCandidate | null, capabilityId: string): string {
  if (candidate?.disposition === 'blocked_endpoint_required') return 'endpoint required'
  if (candidate?.disposition === 'blocked_missing_contract') return 'contract missing'
  if (candidate?.disposition === 'blocked_low_quality') return 'needs quality gate'
  if (candidate?.disposition === 'proof_only' || candidate?.disposition === 'admin_only') {
    return 'technical proof only'
  }
  if (candidate?.disposition === 'adult_only') return 'no production-approved model pool candidate'
  return productionPoolRejectionReason(capabilityId)
}

export function productionPoolRejectionReason(capabilityId: string): string {
  const pool = getCapabilityModelPool(capabilityId)
  if (!pool) return 'no production-approved model pool candidate'
  const candidates = allPoolCandidates(pool)
  if (candidates.some((candidate) => candidate.disposition === 'blocked_missing_contract')) return 'contract missing'
  if (pool.qualityStatus === 'provider_endpoint_required' || candidates.some((candidate) => candidate.disposition === 'blocked_endpoint_required')) {
    return 'endpoint required'
  }
  if (pool.qualityStatus === 'needs_quality_gate' || candidates.some((candidate) => candidate.disposition === 'blocked_low_quality')) {
    return 'needs quality gate'
  }
  if (pool.qualityStatus === 'technical_proof_only' || candidates.some((candidate) => candidate.disposition === 'proof_only' || candidate.disposition === 'admin_only')) {
    return 'technical proof only'
  }
  return 'no production-approved model pool candidate'
}

export function getCapabilityModelPool(capabilityId: string): CapabilityModelPool | null {
  const normalized = normalizeCapabilityId(capabilityId)
  return CAPABILITY_MODEL_POOLS.find((pool) => pool.capabilityId === normalized) ?? null
}

export function getAllCapabilityModelPools(): readonly CapabilityModelPool[] {
  return CAPABILITY_MODEL_POOLS
}

export function modelPoolCandidateFor(capabilityId: string, provider: string, model: string): CapabilityModelCandidate | null {
  const pool = getCapabilityModelPool(capabilityId)
  if (!pool) return null
  return allPoolCandidates(pool).find((candidate) => candidate.provider === provider && candidate.model === model) ?? null
}

export function evaluateCapabilityModelCandidate(input: {
  capabilityId: string
  provider: string
  model: string
  executionMode?: CapabilityPoolExecutionMode
  adultGate?: boolean
}): CapabilityModelPoolDecision {
  const executionMode = input.executionMode ?? 'production'
  const pool = getCapabilityModelPool(input.capabilityId)
  if (!pool) {
    return { allowed: true, candidate: null, pool: null, reason: null }
  }

  const candidate = modelPoolCandidateFor(input.capabilityId, input.provider, input.model)
  if (!candidate) {
    return {
      allowed: false,
      candidate: null,
      pool,
      reason: executionMode === 'proof'
        ? 'no model pool candidate'
        : 'no production-approved model pool candidate',
    }
  }

  if (candidate.disposition === 'adult_only') {
    return {
      allowed: input.adultGate === true,
      candidate,
      pool,
      reason: input.adultGate === true ? null : 'no production-approved model pool candidate',
    }
  }

  if (candidate.disposition === 'production_allowed') {
    return { allowed: true, candidate, pool, reason: null }
  }

  if (executionMode === 'proof' && (candidate.disposition === 'proof_only' || candidate.disposition === 'admin_only')) {
    return { allowed: true, candidate, pool, reason: null }
  }

  return {
    allowed: false,
    candidate,
    pool,
    reason: candidateReason(candidate, input.capabilityId),
  }
}

export function allowedPoolModelsFor(input: {
  capabilityId: string
  provider: string
  executionMode?: CapabilityPoolExecutionMode
  adultGate?: boolean
}): string[] {
  const pool = getCapabilityModelPool(input.capabilityId)
  if (!pool) return []
  return allPoolCandidates(pool)
    .filter((candidate) => candidate.provider === input.provider)
    .filter((candidate) => evaluateCapabilityModelCandidate({
      capabilityId: input.capabilityId,
      provider: candidate.provider,
      model: candidate.model,
      executionMode: input.executionMode,
      adultGate: input.adultGate,
    }).allowed)
    .map((candidate) => candidate.model)
}

export function capabilityPoolStatus(capabilityId: string) {
  const pool = getCapabilityModelPool(capabilityId)
  return {
    productionReady: pool?.productionReady ?? false,
    qualityStatus: pool?.qualityStatus ?? 'source_wired_unproven' as CapabilityQualityStatus,
    productionReason: pool ? productionPoolRejectionReason(capabilityId) : 'no production-approved model pool candidate',
  }
}

export function productionAllowedModelsFor(capabilityId: string) {
  const pool = getCapabilityModelPool(capabilityId)
  if (!pool) return []
  return [...pool.primaryCandidates, ...pool.fallbackCandidates]
    .filter((candidate) => candidate.disposition === 'production_allowed')
}

export function blockedOrProofOnlyModelsFor(capabilityId: string) {
  const pool = getCapabilityModelPool(capabilityId)
  if (!pool) return []
  return [
    ...pool.proofOnlyCandidates,
    ...pool.blockedLowQualityCandidates,
    ...pool.adultOnlyCandidates,
    ...pool.fallbackCandidates.filter((candidate) => candidate.disposition !== 'production_allowed'),
  ]
}
