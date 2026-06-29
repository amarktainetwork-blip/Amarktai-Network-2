/**
 * @module model-registry
 * @description Centralised model registry for the AmarktAI Network AI operating system.
 *
 * Every provider and model known to the system is declared here.
 * Routing, orchestration, and validation logic MUST read from this
 * registry instead of hard-coding model decisions elsewhere.
 *
 * Server-side only – no browser APIs or external imports.
 */

// ── Type definitions ────────────────────────────────────────────────────────

/**
 * Provider tier classification.
 *
 * - `backbone`   – HuggingFace, Groq, Together
 * - `retrieval`  – Retrieval / Rerank specialist providers
 * - `multimodal` – Layer 4: Vision, image-generation, video-planning
 */
export type ProviderTier = 'premium' | 'backbone' | 'retrieval' | 'multimodal';

/**
 * Normalised cost classification.
 *
 * Based on approximate per-million-token pricing at time of registry creation.
 */
export type CostTier = 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium';

/**
 * Normalised latency classification (time-to-first-token).
 *
 * - `ultra_low` – < 100 ms (e.g. Groq hardware-accelerated inference)
 * - `low`       – 100 – 300 ms
 * - `medium`    – 300 – 800 ms
 * - `high`      – > 800 ms
 */
export type LatencyTier = 'ultra_low' | 'low' | 'medium' | 'high';

/**
 * Standard role that a model can fill within the orchestration pipeline.
 */
export type ModelRole =
  | 'reasoning'
  | 'chat'
  | 'coding'
  | 'embeddings'
  | 'reranking'
  | 'creative'
  | 'validation'
  | 'agent_planning'
  | 'multilingual'
  | 'vision'
  | 'image_generation'
  | 'video_generation'
  | 'tts'
  | 'voice_interaction'
  | 'moderation';

// ── ModelEntry interface ────────────────────────────────────────────────────

/** Full description of a model known to the AmarktAI system. */
export interface ModelEntry {
  /** Provider key, matching the keys used in vault / health-check subsystems. */
  provider: string;

  /** Provider tier classification. */
  provider_tier: ProviderTier;

  /** Model identifier sent to the provider API (e.g. `gpt-4o`). */
  model_id: string;

  /** Human-readable display name. */
  model_name: string;

  /** Model family grouping (e.g. `GPT-4`, `Llama-3`, `Mixtral`). */
  family: string;

  /** The primary role this model is best suited for. */
  primary_role: ModelRole;

  /** Additional roles the model can fill. */
  secondary_roles: ModelRole[];

  // ── Capability flags ────────────────────────────────────────────────────

  /** Supports conversational chat completions. */
  supports_chat: boolean;

  /** Supports chain-of-thought / step-by-step reasoning. */
  supports_reasoning: boolean;

  /** Specifically tuned or strong at code generation / editing. */
  supports_code: boolean;

  /** Can invoke external tools / function-calling. */
  supports_tool_use: boolean;

  /** Trained on or strong across multiple natural languages. */
  supports_multilingual: boolean;

  /** Supports JSON-mode or structured (schema-constrained) output. */
  supports_structured_output: boolean;

  /** Produces vector embeddings. */
  supports_embeddings: boolean;

  /** Can rerank a list of passages by relevance. */
  supports_reranking: boolean;

  /** Can accept and reason about image inputs. */
  supports_vision: boolean;

  /** Can generate images from text prompts. */
  supports_image_generation: boolean;

  /** Can plan or decompose video-production workflows. */
  supports_video_planning: boolean;

  /** Can render / generate actual video files from prompts or scenes. */
  supports_video_generation?: boolean;

  /** Can transcribe speech / audio to text (STT). */
  supports_stt?: boolean;

  /** Can generate speech / audio from text (TTS). */
  supports_tts?: boolean;

  /** Can engage in real-time speech interaction (STT+TTS). */
  supports_voice_interaction?: boolean;

  /** Can perform content moderation / safety classification. */
  supports_moderation?: boolean;

  /** Suitable for multi-step agent / tool-orchestration planning. */
  supports_agent_planning: boolean;

  /** Can generate music / audio compositions from text prompts (e.g. Suno, MusicGen). */
  supports_music_generation?: boolean;

  // ── Operational metadata ──────────────────────────────────────────────

  /** Maximum context window in tokens. */
  context_window: number;

  /** Normalised latency classification. */
  latency_tier: LatencyTier;

  /** Normalised cost classification. */
  cost_tier: CostTier;

  /** Whether this model is currently enabled for routing. */
  enabled: boolean;

  /** Current operational health status. */
  health_status: 'healthy' | 'configured' | 'degraded' | 'error' | 'unconfigured' | 'disabled';

  /** Lower number = preferred fallback (1 = first choice). */
  fallback_priority: number;

  /** Whether the model may be used as a validator / second-opinion. */
  validator_eligible: boolean;

  /** Specialist knowledge domains this model excels at. */
  specialist_domains: string[];

  /**
   * High-level model category for dashboard grouping.
   *
   * - `text`       – Chat, reasoning, coding, summarisation
   * - `image`      – Image generation / editing
   * - `video`      – Video generation / planning
   * - `voice`      – TTS, STT, real-time voice
   * - `code`       – Code-specialist models
   * - `multimodal` – Vision + generation across modalities
   * - `music`      – Music / audio generation (Suno, MusicGen, etc.)
   */
  category: 'text' | 'image' | 'video' | 'voice' | 'code' | 'multimodal' | 'moderation' | 'embeddings' | 'music';
}

// ── Registry data ───────────────────────────────────────────────────────────

/**
 * Canonical model registry.
 *
 * **Do NOT hard-code model decisions elsewhere** – always query this registry
 * via the helper functions exported below.
 */
const LEGACY_MODEL_REGISTRY: readonly ModelEntry[] = [

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Llama-3-8b-chat-hf',
    model_name: 'Llama 3 8B Chat',
    family: 'Llama-3',
    primary_role: 'chat',
    secondary_roles: ['multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 7,
    validator_eligible: false,
    specialist_domains: ['chat', 'general', 'lightweight'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'mistralai/Mistral-7B-Instruct-v0.3',
    model_name: 'Mistral 7B Instruct v0.3',
    family: 'Mistral',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 8,
    validator_eligible: false,
    specialist_domains: ['chat', 'code', 'instruction-following'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.3-70b-versatile',
    model_name: 'Llama 3.3 70B Versatile (Groq)',
    family: 'Llama-3.3',
    primary_role: 'chat',
    secondary_roles: ['reasoning', 'coding', 'creative', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 128_000,
    latency_tier: 'ultra_low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['general', 'chat', 'quick-tasks', 'real-time'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'mixtral-8x7b-32768',
    model_name: 'Mixtral 8x7B (Groq)',
    family: 'Mixtral',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'ultra_low',
    cost_tier: 'low',
    // Deprecated by Groq June 2024 — disabled to prevent 404 routing errors
    enabled: false,
    health_status: 'configured',
    fallback_priority: 5,
    validator_eligible: false,
    specialist_domains: ['chat', 'multilingual', 'code'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Llama-3-70b-chat-hf',
    model_name: 'Llama 3 70B Chat (Together)',
    family: 'Llama-3',
    primary_role: 'chat',
    secondary_roles: ['reasoning', 'coding', 'creative', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['general', 'open-source', 'chat'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'whisper-large-v3',
    model_name: 'Whisper Large v3 (Groq)',
    family: 'Whisper',
    primary_role: 'voice_interaction',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_stt: true,
    supports_voice_interaction: true,
    supports_agent_planning: false,
    context_window: 25_000, // ~30 min audio at whisper rates
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['voice', 'stt', 'transcription', 'multilingual'],
    category: 'voice',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'distil-whisper-large-v3-en',
    model_name: 'Distil-Whisper Large v3 EN (Groq)',
    family: 'Whisper',
    primary_role: 'voice_interaction',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_stt: true,
    supports_voice_interaction: true,
    supports_agent_planning: false,
    context_window: 25_000, // ~30 min audio at whisper rates
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['voice', 'stt', 'transcription', 'english'],
    category: 'voice',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'whisper-large-v3-turbo',
    model_name: 'Whisper Large v3 Turbo (Groq)',
    family: 'Whisper',
    primary_role: 'voice_interaction',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_stt: true,
    supports_voice_interaction: true,
    supports_agent_planning: false,
    context_window: 25_000, // ~30 min audio at whisper rates
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['voice', 'stt', 'transcription', 'multilingual', 'fast_stt'],
    category: 'voice',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'playai-tts',
    model_name: 'PlayAI TTS (Groq)',
    family: 'PlayAI',
    primary_role: 'tts',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: true,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['voice', 'tts', 'fast_tts'],
    category: 'voice',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'playai-tts-arabic',
    model_name: 'PlayAI TTS Arabic (Groq)',
    family: 'PlayAI',
    primary_role: 'tts',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: true,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['voice', 'tts', 'arabic', 'fast_tts'],
    category: 'voice',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.1-8b-instant',
    model_name: 'Llama 3.1 8B Instant (Groq)',
    family: 'Llama-3.1',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 131_072,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['chat', 'quick-tasks', 'real-time', 'lightweight'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'gemma2-9b-it',
    model_name: 'Gemma 2 9B IT (Groq)',
    family: 'Gemma-2',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['chat', 'multilingual', 'general'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Llama-3-8b-chat-hf',
    model_name: 'Llama 3 8B Chat (Together)',
    family: 'Llama-3',
    primary_role: 'chat',
    secondary_roles: ['multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 7,
    validator_eligible: false,
    specialist_domains: ['chat', 'lightweight', 'multilingual'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    model_name: 'Mixtral 8x22B Instruct (Together)',
    family: 'Mixtral',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 65_536,
    latency_tier: 'medium',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 5,
    validator_eligible: false,
    specialist_domains: ['reasoning', 'coding', 'multilingual', 'general'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'togethercomputer/RedPajama-INCITE-7B-Instruct',
    model_name: 'RedPajama 7B Instruct (Together)',
    family: 'RedPajama',
    primary_role: 'chat',
    secondary_roles: ['multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    // Deprecated by TogetherAI — disabled to prevent 404 routing errors
    enabled: false,
    health_status: 'configured',
    fallback_priority: 8,
    validator_eligible: false,
    specialist_domains: ['chat', 'lightweight', 'multilingual', 'general'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'microsoft/phi-3-mini-4k-instruct',
    model_name: 'Phi-3 Mini 4K Instruct',
    family: 'Phi-3',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 9,
    validator_eligible: false,
    specialist_domains: ['chat', 'lightweight', 'coding', 'edge'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'sentence-transformers/all-MiniLM-L6-v2',
    model_name: 'All-MiniLM-L6-v2 (Sentence Embeddings)',
    family: 'Sentence-Transformers',
    primary_role: 'embeddings',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: true,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['retrieval', 'semantic-search', 'rag'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'retrieval',
    model_id: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    model_name: 'MS-MARCO MiniLM Reranker',
    family: 'Cross-Encoder',
    primary_role: 'reranking',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: true,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['retrieval', 'reranking', 'rag'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-guard-3-8b',
    model_name: 'Llama Guard 3 8B (Groq)',
    family: 'Llama-Guard-3',
    primary_role: 'validation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: true,
    specialist_domains: ['safety', 'guardrails', 'content-moderation'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'deepseek-r1-distill-llama-70b',
    model_name: 'DeepSeek R1 Distill Llama 70B (Groq)',
    family: 'DeepSeek-R1',
    primary_role: 'reasoning',
    secondary_roles: ['coding', 'validation', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'ultra_low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 4,
    validator_eligible: true,
    specialist_domains: ['reasoning', 'math', 'coding', 'science'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    model_name: 'Llama 3.1 70B Instruct',
    family: 'Llama-3.1',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'medium',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 5,
    validator_eligible: true,
    specialist_domains: ['reasoning', 'general', 'open-source', 'multilingual'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    model_name: 'Llama 3.1 70B Instruct Turbo (Together)',
    family: 'Llama-3.1',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 4,
    validator_eligible: true,
    specialist_domains: ['reasoning', 'general', 'open-source', 'multilingual'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    model_name: 'Qwen 2.5 72B Instruct Turbo (Together)',
    family: 'Qwen-2.5',
    primary_role: 'multilingual',
    secondary_roles: ['reasoning', 'chat', 'coding', 'creative'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 5,
    validator_eligible: false,
    specialist_domains: ['multilingual', 'coding', 'reasoning', 'general', 'cjk'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'mistralai/Mistral-7B-Instruct-v0.3',
    model_name: 'Mistral 7B Instruct v0.3 (Together)',
    family: 'Mistral',
    primary_role: 'chat',
    secondary_roles: ['coding', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 7,
    validator_eligible: false,
    specialist_domains: ['chat', 'code', 'multilingual', 'lightweight'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'multimodal',
    model_id: 'stabilityai/stable-diffusion-xl-base-1.0',
    model_name: 'Stable Diffusion XL (Together)',
    family: 'Stable Diffusion',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 77,
    latency_tier: 'medium',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'art', 'creative'],
    category: 'image',
  },

  {
    provider: 'together',
    provider_tier: 'multimodal',
    model_id: 'black-forest-labs/FLUX.1-schnell',
    model_name: 'FLUX.1 Schnell (Together)',
    family: 'FLUX',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 77,
    latency_tier: 'low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'art', 'fast_generation'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'openai/whisper-large-v3',
    model_name: 'Whisper Large v3 (HuggingFace)',
    family: 'Whisper',
    primary_role: 'voice_interaction',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_stt: true,
    supports_voice_interaction: true,
    supports_agent_planning: false,
    context_window: 25_000,
    latency_tier: 'medium',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 8,
    validator_eligible: false,
    specialist_domains: ['voice', 'stt', 'transcription', 'multilingual', 'fallback'],
    category: 'voice',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'facebook/mms-tts-eng',
    model_name: 'MMS TTS English (HuggingFace)',
    family: 'MMS',
    primary_role: 'tts',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: true,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 8,
    validator_eligible: false,
    specialist_domains: ['voice', 'tts', 'english', 'fallback'],
    category: 'voice',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'openai/whisper-small',
    model_name: 'Whisper Small (HuggingFace)',
    family: 'Whisper',
    primary_role: 'voice_interaction',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_stt: true,
    supports_voice_interaction: true,
    supports_agent_planning: false,
    context_window: 25_000,
    latency_tier: 'low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 9,
    validator_eligible: false,
    specialist_domains: ['voice', 'stt', 'transcription', 'multilingual', 'fallback', 'lightweight'],
    category: 'voice',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'facebook/mms-tts-fra',
    model_name: 'MMS TTS French (HuggingFace)',
    family: 'MMS',
    primary_role: 'tts',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: true,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 9,
    validator_eligible: false,
    specialist_domains: ['voice', 'tts', 'french', 'fallback'],
    category: 'voice',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'cerspense/zeroscope_v2_576w',
    model_name: 'ZeroScope V2 576w (HuggingFace)',
    family: 'ZeroScope',
    primary_role: 'video_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_video_generation: true,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'high',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['video', 'video_generation', 'text-to-video', 'suggestive', 'fashion', 'lifestyle'],
    category: 'video',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'damo-vilab/text-to-video-ms-1.7b',
    model_name: 'Text-to-Video MS 1.7B (HuggingFace)',
    family: 'ModelScope',
    primary_role: 'video_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_video_generation: true,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'high',
    cost_tier: 'free',
    enabled: true,
    health_status: 'configured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['video', 'video_generation', 'text-to-video', 'fallback'],
    category: 'video',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.2-1b',
    model_name: 'Llama 3.2 1B (Groq)',
    family: 'Llama-3.2',
    primary_role: 'chat',
    secondary_roles: [],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 131_072,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['lightweight', 'chat', 'fast_inference'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.2-3b',
    model_name: 'Llama 3.2 3B (Groq)',
    family: 'Llama-3.2',
    primary_role: 'chat',
    secondary_roles: ['multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 131_072,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 5,
    validator_eligible: false,
    specialist_domains: ['lightweight', 'chat', 'fast_inference'],
    category: 'text',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.2-11b-vision-preview',
    model_name: 'Llama 3.2 11B Vision Preview (Groq)',
    family: 'Llama-3.2',
    primary_role: 'vision',
    secondary_roles: ['chat', 'multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: true,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 128_000,
    latency_tier: 'ultra_low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['vision', 'image_understanding', 'fast_inference'],
    category: 'multimodal',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'llama-3.2-90b-vision-preview',
    model_name: 'Llama 3.2 90B Vision Preview (Groq)',
    family: 'Llama-3.2',
    primary_role: 'vision',
    secondary_roles: ['chat', 'reasoning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: true,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 128_000,
    latency_tier: 'low',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['vision', 'image_understanding', 'reasoning'],
    category: 'multimodal',
  },

  {
    provider: 'huggingface',
    provider_tier: 'multimodal',
    model_id: 'stabilityai/stable-diffusion-3.5-large',
    model_name: 'Stable Diffusion 3.5 Large (HuggingFace)',
    family: 'Stable-Diffusion',
    primary_role: 'image_generation',
    secondary_roles: ['creative'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'high',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'creative', 'art'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'multimodal',
    model_id: 'stabilityai/stable-diffusion-xl-base-1.0',
    model_name: 'Stable Diffusion XL Base 1.0 (HuggingFace)',
    family: 'Stable-Diffusion',
    primary_role: 'image_generation',
    secondary_roles: ['creative'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'high',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'creative', 'art'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'multimodal',
    model_id: 'black-forest-labs/FLUX.1-dev',
    model_name: 'FLUX.1 Dev (HuggingFace)',
    family: 'FLUX',
    primary_role: 'image_generation',
    secondary_roles: ['creative'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'creative', 'art', 'photorealism'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'multimodal',
    model_id: 'black-forest-labs/FLUX.1-schnell',
    model_name: 'FLUX.1 Schnell (HuggingFace)',
    family: 'FLUX',
    primary_role: 'image_generation',
    secondary_roles: ['creative'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'creative', 'fast_inference'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'microsoft/phi-3-medium-14b-instruct',
    model_name: 'Phi-3 Medium 14B Instruct (HuggingFace)',
    family: 'Phi-3',
    primary_role: 'chat',
    secondary_roles: ['coding', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 4_096,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['general', 'coding', 'reasoning'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'google/flan-t5-xxl',
    model_name: 'Flan-T5 XXL (HuggingFace)',
    family: 'Flan-T5',
    primary_role: 'chat',
    secondary_roles: ['multilingual'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['summarization', 'classification', 'translation'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'coqui/XTTS-v2',
    model_name: 'XTTS v2 (HuggingFace)',
    family: 'XTTS',
    primary_role: 'tts',
    secondary_roles: ['multilingual'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: true,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 8,
    validator_eligible: false,
    specialist_domains: ['text_to_speech', 'voice_cloning', 'multilingual', 'fallback'],
    category: 'voice',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    model_name: 'Llama 3.1 405B Instruct Turbo (Together)',
    family: 'Llama-3.1',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'agent_planning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 130_815,
    latency_tier: 'medium',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: true,
    specialist_domains: ['general', 'reasoning', 'coding', 'analysis'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    model_name: 'Llama 3.1 8B Instruct Turbo (Together)',
    family: 'Llama-3.1',
    primary_role: 'chat',
    secondary_roles: ['coding'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 130_815,
    latency_tier: 'low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['general', 'chat', 'fast_inference'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    model_name: 'Qwen 2.5 Coder 32B Instruct (Together)',
    family: 'Qwen-2.5',
    primary_role: 'coding',
    secondary_roles: ['chat', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['coding', 'programming', 'code_review'],
    category: 'code',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'deepseek-ai/DeepSeek-R1',
    model_name: 'DeepSeek R1 (Together)',
    family: 'DeepSeek',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'agent_planning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 163_840,
    latency_tier: 'high',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: true,
    specialist_domains: ['reasoning', 'math', 'science', 'coding'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'deepseek-ai/DeepSeek-V3',
    model_name: 'DeepSeek V3 (Together)',
    family: 'DeepSeek',
    primary_role: 'chat',
    secondary_roles: ['coding', 'reasoning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 163_840,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: true,
    specialist_domains: ['general', 'coding', 'reasoning'],
    category: 'text',
  },

  {
    provider: 'together',
    provider_tier: 'multimodal',
    model_id: 'black-forest-labs/FLUX.2-dev',
    model_name: 'FLUX.1 Schnell Free (Together)',
    family: 'FLUX',
    primary_role: 'image_generation',
    secondary_roles: ['creative'],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'creative', 'fast_inference'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'Qwen/Qwen2-7B-Instruct',
    model_name: 'Qwen2 7B Instruct',
    family: 'Qwen',
    primary_role: 'chat',
    secondary_roles: ['coding', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['general', 'chat', 'multilingual'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'meta-llama/Llama-3-8B-Instruct',
    model_name: 'Llama 3 8B Instruct (HF)',
    family: 'Llama',
    primary_role: 'chat',
    secondary_roles: ['coding', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: false,
    supports_agent_planning: false,
    context_window: 8192,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['general', 'chat', 'coding'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'SG161222/RealVisXL_V5.0',
    model_name: 'RealVisXL V5',
    family: 'SDXL',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_tts: false,
    supports_agent_planning: false,
    context_window: 77,
    latency_tier: 'high',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 5,
    validator_eligible: false,
    specialist_domains: ['photorealistic', 'image_generation'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
    model_name: 'Qwen2.5 Coder 7B',
    family: 'Qwen',
    primary_role: 'coding',
    secondary_roles: ['chat'],
    supports_chat: true,
    supports_reasoning: false,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_tts: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 6,
    validator_eligible: false,
    specialist_domains: ['code_generation', 'debugging', 'code_review'],
    category: 'code',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    model_name: 'Llama 4 Scout 17B (Groq)',
    family: 'Llama-4',
    primary_role: 'chat',
    secondary_roles: ['coding', 'vision', 'multilingual', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: true,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['chat', 'vision', 'multilingual', 'general', 'fast_inference'],
    category: 'multimodal',
  },

  {
    provider: 'groq',
    provider_tier: 'backbone',
    model_id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    model_name: 'Llama 4 Maverick 17B (Groq)',
    family: 'Llama-4',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'vision', 'multilingual', 'agent_planning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: true,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: true,
    specialist_domains: ['chat', 'reasoning', 'vision', 'coding', 'multilingual', 'general'],
    category: 'multimodal',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
    model_name: 'Nous Hermes 2 Mixtral 8x7B DPO',
    family: 'Nous-Hermes-2',
    primary_role: 'chat',
    secondary_roles: ['creative', 'reasoning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['companion', 'creative_writing', 'roleplay', 'adult_companion', 'chat'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'teknium/OpenHermes-2.5-Mistral-7B',
    model_name: 'OpenHermes 2.5 Mistral 7B',
    family: 'OpenHermes-2.5',
    primary_role: 'chat',
    secondary_roles: ['creative', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['companion', 'creative_writing', 'roleplay', 'instruction_following'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    model_name: 'Mixtral 8x7B Instruct v0.1',
    family: 'Mixtral-8x7B',
    primary_role: 'chat',
    secondary_roles: ['creative', 'coding', 'multilingual', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['chat', 'creative_writing', 'multilingual', 'coding', 'general'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'google/gemma-2-9b-it',
    model_name: 'Gemma 2 9B Instruct',
    family: 'Gemma-2',
    primary_role: 'chat',
    secondary_roles: ['reasoning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 8_192,
    latency_tier: 'low',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['chat', 'general', 'multilingual', 'fast_inference'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'Qwen/Qwen2.5-72B-Instruct',
    model_name: 'Qwen 2.5 72B Instruct',
    family: 'Qwen-2.5',
    primary_role: 'reasoning',
    secondary_roles: ['chat', 'coding', 'multilingual', 'creative'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: true,
    supports_multilingual: true,
    supports_structured_output: true,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: true,
    context_window: 128_000,
    latency_tier: 'medium',
    cost_tier: 'medium',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: true,
    specialist_domains: ['chat', 'reasoning', 'coding', 'multilingual', 'general', 'creative_writing'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'RunDiffusion/Juggernaut-XL-v9',
    model_name: 'Juggernaut XL v9 (Photorealistic)',
    family: 'Juggernaut-XL',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'adult_companion', 'photorealistic', 'high_quality'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'Lykon/dreamshaper-xl-1-0',
    model_name: 'DreamShaper XL 1.0',
    family: 'DreamShaper-XL',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'medium',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'adult_companion', 'artistic', 'stylized'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'dreamlike-art/dreamlike-photoreal-2.0',
    model_name: 'Dreamlike Photoreal 2.0',
    family: 'Dreamlike',
    primary_role: 'image_generation',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: true,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'medium',
    cost_tier: 'very_low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['image_generation', 'adult_companion', 'photorealistic', 'portrait'],
    category: 'image',
  },

  {
    provider: 'huggingface',
    provider_tier: 'retrieval',
    model_id: 'BAAI/bge-large-en-v1.5',
    model_name: 'BGE Large EN v1.5 (BAAI)',
    family: 'BGE',
    primary_role: 'embeddings',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: true,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 1,
    validator_eligible: false,
    specialist_domains: ['embeddings', 'semantic_search', 'rag', 'retrieval'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'retrieval',
    model_id: 'thenlper/gte-large',
    model_name: 'GTE Large (thenlper)',
    family: 'GTE',
    primary_role: 'embeddings',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: true,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 512,
    latency_tier: 'ultra_low',
    cost_tier: 'free',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['embeddings', 'semantic_search', 'rag'],
    category: 'text',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'bigcode/starcoder2-15b',
    model_name: 'StarCoder2 15B',
    family: 'StarCoder2',
    primary_role: 'coding',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 16_384,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 2,
    validator_eligible: false,
    specialist_domains: ['coding', 'code_completion', 'software_development', 'debugging'],
    category: 'code',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'codellama/CodeLlama-13b-Instruct-hf',
    model_name: 'CodeLlama 13B Instruct',
    family: 'CodeLlama',
    primary_role: 'coding',
    secondary_roles: ['chat', 'reasoning'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: false,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 16_384,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['coding', 'instruction_following', 'debugging', 'code_review'],
    category: 'code',
  },

  {
    provider: 'huggingface',
    provider_tier: 'backbone',
    model_id: 'suno/bark',
    model_name: 'Bark (Suno AI)',
    family: 'Bark',
    primary_role: 'tts',
    secondary_roles: [],
    supports_chat: false,
    supports_reasoning: false,
    supports_code: false,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 256,
    latency_tier: 'high',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 3,
    validator_eligible: false,
    specialist_domains: ['tts', 'expressive_speech', 'multilingual', 'sound_effects'],
    category: 'voice',
  },

  {
    provider: 'together',
    provider_tier: 'backbone',
    model_id: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
    model_name: 'Nous Hermes 2 Mixtral 8x7B DPO (Together)',
    family: 'Nous-Hermes-2',
    primary_role: 'chat',
    secondary_roles: ['creative', 'reasoning', 'multilingual'],
    supports_chat: true,
    supports_reasoning: true,
    supports_code: true,
    supports_tool_use: false,
    supports_multilingual: true,
    supports_structured_output: false,
    supports_embeddings: false,
    supports_reranking: false,
    supports_vision: false,
    supports_image_generation: false,
    supports_video_planning: false,
    supports_agent_planning: false,
    context_window: 32_768,
    latency_tier: 'medium',
    cost_tier: 'low',
    enabled: true,
    health_status: 'unconfigured',
    fallback_priority: 4,
    validator_eligible: false,
    specialist_domains: ['companion', 'creative_writing', 'roleplay', 'adult_companion', 'chat'],
    category: 'text',
  },

] as const satisfies readonly ModelEntry[];

const ACTIVE_MODEL_PROVIDERS = new Set([
  'huggingface',
  'groq',
  'together',
])

export const MODEL_REGISTRY: readonly ModelEntry[] = LEGACY_MODEL_REGISTRY.filter(
  (model) => ACTIVE_MODEL_PROVIDERS.has(model.provider),
)

// ── Boolean capability keys (used for type-safe filtering) ──────────────

/** Keys of `ModelEntry` that hold boolean capability flags. */
type BooleanCapabilityKey = {
  [K in keyof ModelEntry]-?: NonNullable<ModelEntry[K]> extends boolean ? K : never;
}[keyof ModelEntry];

// ── Provider health cache ───────────────────────────────────────────────
//
// The static MODEL_REGISTRY marks every model as enabled/configured because
// these are *known* models. At runtime the provider health cache overlays
// truthful health information derived from the database and live health
// checks. When the cache is populated, helper functions like
// `getUsableModels()` and `getModelEffectiveHealth()` reflect real state.
// When the cache is empty (e.g. during tests or before first health check),
// all enabled models are assumed usable for backwards compatibility.
// ────────────────────────────────────────────────────────────────────────

/** Health status values that can be stored in the provider health cache. */
export type ProviderHealthStatus = ModelEntry['health_status'];

interface ProviderHealthEntry {
  status: ProviderHealthStatus;
  lastChecked: Date;
}

const providerHealthCache = new Map<string, ProviderHealthEntry>();

/**
 * Update the cached health state for a provider.
 *
 * Call this after running `runProviderHealthCheck()` or after querying
 * the `AiProvider` table so that model-selection helpers reflect real
 * provider health.
 */
export function setProviderHealth(
  providerKey: string,
  status: ProviderHealthStatus,
): void {
  providerHealthCache.set(providerKey, { status, lastChecked: new Date() });
}

/**
 * Retrieve the cached health status for a provider.
 *
 * Returns `'unconfigured'` when no health data has been recorded yet.
 */
export function getProviderHealth(providerKey: string): ProviderHealthStatus {
  return providerHealthCache.get(providerKey)?.status ?? 'unconfigured';
}

/** Returns the full provider health cache snapshot (for diagnostics / dashboards). */
export function getProviderHealthSnapshot(): ReadonlyMap<string, Readonly<ProviderHealthEntry>> {
  return providerHealthCache;
}

/** Clear all cached provider health data (useful in tests). */
export function clearProviderHealthCache(): void {
  providerHealthCache.clear();
}

/**
 * Whether a provider is usable for routing.
 *
 * A provider is usable when its health status is `healthy` or `configured`.
 * When the health cache is **empty** (no health data recorded yet) or a
 * provider has no entry in the cache, it is considered **unconfigured** and
 * therefore NOT usable.  This prevents false availability before the first
 * health-check run.
 */
export function isProviderUsable(providerKey: string): boolean {
  const status = getProviderHealth(providerKey);
  return status === 'healthy' || status === 'configured';
}

/**
 * Whether a provider is degraded.
 *
 * Degraded providers are **not** considered usable by `isProviderUsable()`
 * and are excluded from eligible models. However, the routing engine may
 * still include degraded providers at the end of the fallback list when
 * building fallback chains, giving them lower priority than healthy ones.
 */
export function isProviderDegraded(providerKey: string): boolean {
  return getProviderHealth(providerKey) === 'degraded';
}

/**
 * Returns the effective health status for a model, considering the
 * provider health cache.
 *
 * When the cache has no entry for the model's provider, returns
 * `'unconfigured'` so that unchecked providers are not silently
 * treated as healthy.
 */
export function getModelEffectiveHealth(model: ModelEntry): ProviderHealthStatus {
  return getProviderHealth(model.provider);
}

/**
 * Returns models that are registered as enabled **and** whose provider
 * is currently usable (healthy / configured).
 *
 * This is the health-aware replacement for `getEnabledModels()` and
 * should be preferred by the routing engine and orchestrator.
 */
export function getUsableModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.enabled && isProviderUsable(m.provider));
}

// ── Helper functions ────────────────────────────────────────────────────────

/** Returns the full, immutable model registry. */
export function getModelRegistry(): readonly ModelEntry[] {
  return MODEL_REGISTRY;
}

/** Returns all models registered under `provider`. */
export function getModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

/**
 * Returns all models where a given boolean capability flag is `true`.
 *
 * @example
 * ```ts
 * const visionModels = getModelsByCapability('supports_vision');
 * ```
 */
export function getModelsByCapability(capability: BooleanCapabilityKey): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m[capability] === true);
}

/**
 * Returns models whose `primary_role` or `secondary_roles` include `role`.
 */
export function getModelsByRole(role: ModelRole): ModelEntry[] {
  return MODEL_REGISTRY.filter(
    (m) => m.primary_role === role || m.secondary_roles.includes(role),
  );
}

/**
 * Looks up a single model by provider key and model identifier.
 *
 * @returns The matching `ModelEntry`, or `undefined` if not found.
 */
export function getModelById(provider: string, modelId: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.provider === provider && m.model_id === modelId);
}

/** Returns only models that are currently enabled. */
export function getEnabledModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.enabled);
}

/** Returns models eligible to act as validators / second-opinion providers. */
export function getValidatorEligibleModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.enabled && m.validator_eligible);
}

/**
 * Returns enabled models whose `specialist_domains` include `domain`.
 *
 * @param domain - Domain string to match (e.g. `'crypto'`, `'finance'`, `'math'`, `'coding'`).
 *
 * @example
 * ```ts
 * const cryptoModels = getModelsForDomain('crypto');
 * ```
 */
export function getModelsForDomain(domain: string): ModelEntry[] {
  return MODEL_REGISTRY.filter(
    (m) => m.enabled && m.specialist_domains.includes(domain),
  );
}

/** Model category type for filtering. */
export type ModelCategory = 'text' | 'image' | 'video' | 'voice' | 'code' | 'multimodal' | 'music' | 'moderation' | 'embeddings';

/** Returns all models in a given category. */
export function getModelsByCategory(category: ModelCategory): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.category === category);
}

/** Returns a summary count of models per category. */
export function getCategorySummary(): Record<ModelCategory, number> {
  const cats: ModelCategory[] = ['text', 'image', 'video', 'voice', 'code', 'multimodal', 'music', 'moderation', 'embeddings'];
  const summary = {} as Record<ModelCategory, number>;
  for (const c of cats) {
    summary[c] = MODEL_REGISTRY.filter((m) => m.category === c).length;
  }
  return summary;
}

// ── Cost-tier ordering (ascending) ──────────────────────────────────────

const COST_TIER_ORDER: Record<CostTier, number> = {
  free: 0,
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  premium: 5,
};

/**
 * Returns the cheapest enabled model that has `capability` set to `true`.
 *
 * Ties are broken by `fallback_priority` (lower = preferred).
 *
 * @returns A `ModelEntry` or `undefined` if no model matches.
 */
export function getCheapestModelForCapability(
  capability: BooleanCapabilityKey,
): ModelEntry | undefined {
  return getModelsByCapability(capability)
    .filter((m) => m.enabled)
    .sort(
      (a, b) =>
        COST_TIER_ORDER[a.cost_tier] - COST_TIER_ORDER[b.cost_tier] ||
        a.fallback_priority - b.fallback_priority,
    )[0];
}

/**
 * Returns the highest-quality enabled model that has `capability` set to `true`.
 *
 * "Highest quality" is determined by the most expensive cost tier first,
 * then lowest fallback priority (i.e. most preferred) as a tie-breaker.
 *
 * @returns A `ModelEntry` or `undefined` if no model matches.
 */
export function getPremiumModelForCapability(
  capability: BooleanCapabilityKey,
): ModelEntry | undefined {
  return getModelsByCapability(capability)
    .filter((m) => m.enabled)
    .sort(
      (a, b) =>
        COST_TIER_ORDER[b.cost_tier] - COST_TIER_ORDER[a.cost_tier] ||
        a.fallback_priority - b.fallback_priority,
    )[0];
}

// ── Default-model mapping (replaces scattered defaultModelFor()) ────────

/**
 * Maps each provider key to the model that should be used as the default
 * when no specific model is requested.
 *
 * This replaces the duplicated `defaultModelFor()` functions previously
 * found in `brain.ts` and `orchestrator.ts`.
 */
const DEFAULT_MODEL_MAP: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
  huggingface: 'meta-llama/Llama-3-8b-chat-hf',
};

/**
 * Returns the default model identifier for a given provider key.
 *
 * This is the **single source of truth** – callers should use this instead
 * of maintaining their own switch statements.
 *
 * @param providerKey - Provider key (e.g. `'openai'`, `'groq'`).
 * @returns The default model ID, or `'unknown'` for unrecognised providers.
 */
export function getDefaultModelForProvider(providerKey: string): string {
  const model = DEFAULT_MODEL_MAP[providerKey];
  if (!model) {
    throw new Error(`No default model configured for provider "${providerKey}". Add an entry to DEFAULT_MODEL_MAP.`);
  }
  return model;
}
