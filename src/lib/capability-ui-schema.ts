/**
 * Capability UI Schema
 *
 * Defines the schema for Studio mode rendering and future App capability requests.
 * Apps request capabilities using this schema shape — never provider or model.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'toggle'
  | 'url'
  | 'file'
  | 'status'
  | 'duration'
  | 'structure'

export interface FieldOption {
  value: string
  label: string
}

export interface CapabilityField {
  id: string
  label: string
  type: FieldType
  required?: boolean
  defaultValue?: string | number | boolean
  placeholder?: string
  helpText?: string
  options?: FieldOption[]
  statusCapabilityId?: string
  visibleWhen?: string
}

export interface CapabilityUiMode {
  id: string
  label: string
  shortLabel: string
  category: string
  description: string
  requestCapability: string
  statusCapabilityId: string
  knownRoute?: string
  artifactType?: string
  adminOnly?: boolean
  adultPrivate?: boolean
  appUsable: boolean
  proofRequirements?: string[]
  musicSubSections?: string[]
  fields: CapabilityField[]
}

// ── Shared field helpers ───────────────────────────────────────────────────────

const qualityField: CapabilityField = {
  id: 'quality',
  label: 'Quality / Cost',
  type: 'select',
  defaultValue: 'balanced',
  options: [
    { value: 'cheap', label: 'Economy' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'premium', label: 'Premium' },
  ],
}

const saveArtifactField: CapabilityField = {
  id: 'save_artifact',
  label: 'Save artifact',
  type: 'toggle',
  defaultValue: true,
}

const aspectRatioField: CapabilityField = {
  id: 'aspect_ratio',
  label: 'Aspect ratio',
  type: 'select',
  defaultValue: '16:9',
  options: [
    { value: '16:9', label: '16:9 Landscape' },
    { value: '9:16', label: '9:16 Portrait' },
    { value: '1:1', label: '1:1 Square' },
  ],
}

// ── Mode definitions ───────────────────────────────────────────────────────────

export const CAPABILITY_UI_MODES: readonly CapabilityUiMode[] = [
  // ── Chat ──────────────────────────────────────────────────────────────────
  {
    id: 'chat',
    label: 'Chat',
    shortLabel: 'Chat',
    category: 'text',
    description: 'Conversational AI — reasoning, drafting, planning, summarization.',
    requestCapability: 'chat',
    statusCapabilityId: 'chat',
    knownRoute: '/api/brain/request',
    artifactType: 'document',
    appUsable: true,
    proofRequirements: ['provider_connected', 'last_test_passed'],
    fields: [
      { id: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Ask the platform to reason, draft, plan, or explain.' },
      { id: 'streaming', label: 'Streaming', type: 'toggle', defaultValue: false },
      { id: 'memory', label: 'Use memory', type: 'toggle', defaultValue: false },
      qualityField,
      saveArtifactField,
    ],
  },

  // ── Image ─────────────────────────────────────────────────────────────────
  {
    id: 'image',
    label: 'Image',
    shortLabel: 'Image',
    category: 'image',
    description: 'Generate images from text prompts.',
    requestCapability: 'image_generation',
    statusCapabilityId: 'image_generation',
    knownRoute: '/api/brain/image',
    artifactType: 'image',
    appUsable: true,
    proofRequirements: ['provider_connected', 'storage_writable'],
    fields: [
      { id: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Describe the image, style, references, and intended use.' },
      { id: 'negative_prompt', label: 'Negative prompt', type: 'textarea', placeholder: 'What to avoid in the image.' },
      { id: 'style', label: 'Style', type: 'select', options: [
        { value: 'realistic', label: 'Realistic' },
        { value: 'cinematic', label: 'Cinematic' },
        { value: 'anime', label: 'Anime' },
        { value: 'digital_art', label: 'Digital Art' },
        { value: 'painting', label: 'Painting' },
        { value: 'sketch', label: 'Sketch' },
      ]},
      aspectRatioField,
      { id: 'count', label: 'Number of images', type: 'number', defaultValue: 1 },
      qualityField,
      { id: 'seed', label: 'Seed (optional)', type: 'number', placeholder: 'For reproducibility' },
    ],
  },

  // ── Video ─────────────────────────────────────────────────────────────────
  {
    id: 'video',
    label: 'Video',
    shortLabel: 'Video',
    category: 'video',
    description: 'Generate short video clips from text prompts.',
    requestCapability: 'video_generation',
    statusCapabilityId: 'video_generation',
    knownRoute: '/api/brain/video-generate',
    artifactType: 'video',
    appUsable: true,
    proofRequirements: ['provider_connected', 'storage_writable'],
    fields: [
      { id: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Describe a short video, reference image, camera motion, and format.' },
      { id: 'duration', label: 'Target duration', type: 'duration', defaultValue: '4s', helpText: 'Max 8s per clip for short video.' },
      aspectRatioField,
      { id: 'style', label: 'Style', type: 'select', options: [
        { value: 'cinematic', label: 'Cinematic' },
        { value: 'animated', label: 'Animated' },
        { value: 'realistic', label: 'Realistic' },
        { value: 'documentary', label: 'Documentary' },
        { value: 'commercial', label: 'Commercial' },
      ]},
      { id: 'count', label: 'Number of videos', type: 'number', defaultValue: 1 },
      qualityField,
    ],
  },

  // ── Long-form Video ────────────────────────────────────────────────────────
  {
    id: 'long_form_video',
    label: 'Long-form Video',
    shortLabel: 'Long Video',
    category: 'video',
    description: 'Plan and assemble multi-scene long-form video.',
    requestCapability: 'long_form_video',
    statusCapabilityId: 'long_form_video',
    knownRoute: '/api/brain/long-form-video',
    artifactType: 'video',
    appUsable: false,
    proofRequirements: ['provider_connected', 'storage_writable', 'video_executable'],
    fields: [
      { id: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Describe script, scenes, music, voice, stitching, and final format.' },
      { id: 'target_duration', label: 'Target duration', type: 'duration', defaultValue: '90s', helpText: 'Long-form uses multiple 4-8s scenes assembled together. Not a single clip.' },
      { id: 'scene_count', label: 'Scene count', type: 'number', defaultValue: 6 },
      { id: 'scene_length', label: 'Scene length', type: 'duration', defaultValue: '8s' },
      aspectRatioField,
      { id: 'style', label: 'Style', type: 'select', options: [{ value: 'cinematic', label: 'Cinematic' }, { value: 'documentary', label: 'Documentary' }, { value: 'commercial', label: 'Commercial' }] },
      { id: 'voice', label: 'Voice toggle', type: 'toggle', defaultValue: false },
      { id: 'music', label: 'Music toggle', type: 'toggle', defaultValue: false },
      { id: 'stitching', label: 'Stitching option', type: 'toggle', defaultValue: false },
      { id: 'production_notes', label: 'Production notes', type: 'textarea' },
    ],
  },

  // ── Image-to-Video ────────────────────────────────────────────────────────
  {
    id: 'image_to_video',
    label: 'Image-to-Video',
    shortLabel: 'I2V',
    category: 'video',
    description: 'Animate an image into a video clip.',
    requestCapability: 'image_to_video',
    statusCapabilityId: 'image_to_video',
    knownRoute: '/api/brain/video-generate',
    artifactType: 'video',
    appUsable: true,
    proofRequirements: ['provider_connected', 'storage_writable', 'reference_image_required'],
    fields: [
      { id: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Describe motion, camera move, and transformation from the reference image.' },
      { id: 'reference_image', label: 'Reference image URL', type: 'url', required: true, helpText: 'Required for image-to-video.' },
      { id: 'duration', label: 'Target duration', type: 'duration', defaultValue: '4s' },
      aspectRatioField,
      { id: 'style', label: 'Style', type: 'select', options: [{ value: 'cinematic', label: 'Cinematic' }, { value: 'animated', label: 'Animated' }, { value: 'realistic', label: 'Realistic' }] },
    ],
  },

  // ── Music ─────────────────────────────────────────────────────────────────
  {
    id: 'music',
    label: 'Music / Audio',
    shortLabel: 'Music',
    category: 'audio',
    description: 'Generate original songs, instrumentals, and audio compositions.',
    requestCapability: 'music_generation',
    statusCapabilityId: 'music_generation',
    knownRoute: '/api/admin/music-studio',
    artifactType: 'audio',
    appUsable: true,
    proofRequirements: ['provider_connected', 'storage_writable'],
    musicSubSections: ['Song', 'Lyrics', 'Production', 'Structure', 'Remix / Variations', 'Video / Outputs'],
    fields: [
      // ── Song ──
      { id: 'theme', label: 'Song theme / prompt', type: 'textarea', required: true, placeholder: 'Describe the song concept, emotion, story, or vibe.' },
      { id: 'genre', label: 'Primary genre', type: 'select', options: [
        { value: 'pop', label: 'Pop' }, { value: 'rock', label: 'Rock' }, { value: 'jazz', label: 'Jazz' },
        { value: 'hip-hop', label: 'Hip-hop' }, { value: 'electronic', label: 'Electronic' },
        { value: 'classical', label: 'Classical' }, { value: 'country', label: 'Country' },
        { value: 'rnb', label: 'R&B' }, { value: 'folk', label: 'Folk' }, { value: 'metal', label: 'Metal' },
      ]},
      { id: 'genres_multi', label: 'Multi-genre tags', type: 'multi_select', options: [
        { value: 'pop', label: 'Pop' }, { value: 'rock', label: 'Rock' }, { value: 'jazz', label: 'Jazz' },
        { value: 'hip-hop', label: 'Hip-hop' }, { value: 'electronic', label: 'Electronic' },
      ]},
      { id: 'mood', label: 'Mood', type: 'select', options: [
        { value: 'uplifting', label: 'Uplifting' }, { value: 'melancholic', label: 'Melancholic' },
        { value: 'energetic', label: 'Energetic' }, { value: 'calm', label: 'Calm' }, { value: 'dark', label: 'Dark' },
      ]},
      { id: 'vocal_mode', label: 'Vocal / No vocal', type: 'select', defaultValue: 'vocal', options: [
        { value: 'vocal', label: 'Vocal' }, { value: 'instrumental', label: 'Instrumental' }, { value: 'no_vocal', label: 'No vocal' },
      ]},
      { id: 'vocal_style', label: 'Vocal style', type: 'select', visibleWhen: 'vocal_mode=vocal', options: [
        { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'choir', label: 'Choir' },
      ]},
      { id: 'language', label: 'Language', type: 'select', defaultValue: 'en', options: [
        { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
      ]},
      { id: 'target_duration', label: 'Target duration', type: 'duration', defaultValue: '180s' },
      { id: 'track_count', label: 'Number of songs', type: 'number', defaultValue: 1 },
      { id: 'instrumental_only', label: 'Instrumental only', type: 'toggle', defaultValue: false },
      { id: 'generate_lyrics', label: 'Generate lyrics', type: 'toggle', defaultValue: true },
      qualityField,
      // ── Lyrics ──
      { id: 'lyrics', label: 'Lyrics textarea', type: 'textarea', placeholder: 'Paste your lyrics or leave blank to generate.' },
      // ── Production ──
      { id: 'bpm', label: 'BPM', type: 'number', defaultValue: 120 },
      { id: 'key', label: 'Key', type: 'select', options: [
        { value: 'c', label: 'C' }, { value: 'g', label: 'G' }, { value: 'd', label: 'D' },
        { value: 'a', label: 'A' }, { value: 'e', label: 'E' }, { value: 'am', label: 'Am' },
      ]},
      { id: 'energy', label: 'Energy level', type: 'select', options: [
        { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
      ]},
      { id: 'production_notes', label: 'Production notes', type: 'textarea' },
      // ── Structure ──
      { id: 'structure_intro', label: 'Intro', type: 'text', placeholder: 'Intro length / style' },
      { id: 'structure_verse', label: 'Verse', type: 'text', placeholder: 'Verse style' },
      { id: 'structure_chorus', label: 'Chorus', type: 'text', placeholder: 'Chorus style' },
      { id: 'structure_bridge', label: 'Bridge', type: 'text', placeholder: 'Bridge style' },
      { id: 'structure_outro', label: 'Outro', type: 'text', placeholder: 'Outro style' },
      // ── Remix / Variations ──
      { id: 'remix', label: 'Create remix', type: 'toggle', defaultValue: false },
      { id: 'remix_style', label: 'Remix style', type: 'select', visibleWhen: 'remix=true', options: [
        { value: 'acoustic', label: 'Acoustic' }, { value: 'dance', label: 'Dance' },
        { value: 'cinematic', label: 'Cinematic' }, { value: 'radio_edit', label: 'Radio edit' },
        { value: 'extended', label: 'Extended mix' }, { value: 'instrumental', label: 'Instrumental version' },
      ]},
      { id: 'stems', label: 'Stems / vocals-only', type: 'status', statusCapabilityId: 'music_generation' },
      // ── Video / Outputs ──
      { id: 'cover_art', label: 'Cover art', type: 'status', statusCapabilityId: 'image_generation' },
      { id: 'music_video', label: 'Music video handoff', type: 'toggle', defaultValue: false },
      { id: 'music_video_style', label: 'Music video visual style', type: 'select', visibleWhen: 'music_video=true', options: [
        { value: 'abstract', label: 'Abstract' }, { value: 'narrative', label: 'Narrative' }, { value: 'lyric', label: 'Lyric' },
      ]},
      { id: 'lyric_video', label: 'Lyric video', type: 'toggle', defaultValue: false },
      { id: 'download_artifact', label: 'Download artifact', type: 'status', statusCapabilityId: 'music_generation' },
    ],
  },

  // ── TTS ────────────────────────────────────────────────────────────────────
  {
    id: 'tts',
    label: 'Voice / TTS',
    shortLabel: 'TTS',
    category: 'audio',
    description: 'Convert text to speech audio.',
    requestCapability: 'tts',
    statusCapabilityId: 'tts',
    knownRoute: '/api/brain/tts',
    artifactType: 'audio',
    appUsable: true,
    proofRequirements: ['provider_connected'],
    fields: [
      { id: 'text', label: 'Text', type: 'textarea', required: true, placeholder: 'Paste the voice script and choose delivery style.' },
      { id: 'voice', label: 'Voice', type: 'select', options: [
        { value: 'auto', label: 'Auto (provider default)' }, { value: 'Arista-PlayAI', label: 'Arista' },
        { value: 'Chloe-PlayAI', label: 'Chloe' }, { value: 'Nova-PlayAI', label: 'Nova' },
      ]},
      { id: 'language', label: 'Language', type: 'select', defaultValue: 'en', options: [
        { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' },
      ]},
      { id: 'speed', label: 'Speed', type: 'number', defaultValue: 1.0 },
      { id: 'emotion', label: 'Emotion', type: 'select', options: [
        { value: 'neutral', label: 'Neutral' }, { value: 'calm', label: 'Calm' }, { value: 'energetic', label: 'Energetic' },
      ]},
      { id: 'output_format', label: 'Output format', type: 'select', defaultValue: 'mp3', options: [
        { value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' },
      ]},
    ],
  },

  // ── STT ────────────────────────────────────────────────────────────────────
  {
    id: 'stt',
    label: 'STT / Transcription',
    shortLabel: 'STT',
    category: 'audio',
    description: 'Transcribe audio to text.',
    requestCapability: 'stt',
    statusCapabilityId: 'stt',
    knownRoute: '/api/brain/stt',
    artifactType: 'transcript',
    appUsable: true,
    proofRequirements: ['provider_connected'],
    fields: [
      { id: 'audio', label: 'Audio upload', type: 'file', required: true, helpText: 'Upload audio or record.' },
      { id: 'language', label: 'Language', type: 'select', defaultValue: 'auto', options: [
        { value: 'auto', label: 'Auto-detect' }, { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' },
      ]},
      { id: 'diarization', label: 'Speaker diarization', type: 'toggle', defaultValue: false },
      { id: 'timestamps', label: 'Include timestamps', type: 'toggle', defaultValue: false },
      { id: 'translate', label: 'Translate to English', type: 'toggle', defaultValue: false },
    ],
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  {
    id: 'avatar',
    label: 'Avatar / Talking Video',
    shortLabel: 'Avatar',
    category: 'video',
    description: 'Generate avatar images or talking avatar video.',
    requestCapability: 'avatar_generation',
    statusCapabilityId: 'avatar_generation',
    knownRoute: '/api/brain/avatar-video',
    artifactType: 'image',
    appUsable: true,
    proofRequirements: ['provider_connected', 'storage_writable'],
    fields: [
      { id: 'avatar_name', label: 'Avatar name', type: 'text', required: true, placeholder: 'e.g. Alex Companion' },
      { id: 'avatar_library', label: 'Avatar library', type: 'select', options: [
        { value: 'default', label: 'Default library' }, { value: 'custom', label: 'Custom' },
      ]},
      { id: 'prompt', label: 'Avatar image prompt', type: 'textarea', placeholder: 'Describe appearance, style, expression.' },
      { id: 'reference_image_url', label: 'Reference image URL', type: 'url', helpText: 'For consistency reference.' },
      { id: 'consistency', label: 'Consistency toggle', type: 'toggle', defaultValue: false },
      { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'image', options: [
        { value: 'image', label: 'Avatar image' }, { value: 'video', label: 'Talking avatar video' },
      ]},
      { id: 'script', label: 'Script', type: 'textarea', visibleWhen: 'mode=video', placeholder: 'Script for the talking avatar.' },
      { id: 'voice', label: 'Voice', type: 'select', visibleWhen: 'mode=video', options: [
        { value: 'auto', label: 'Auto' }, { value: 'Arista-PlayAI', label: 'Arista' },
      ]},
      { id: 'lip_sync', label: 'Lip sync status', type: 'status', statusCapabilityId: 'avatar_generation' },
    ],
  },

  // ── Research / RAG ────────────────────────────────────────────────────────
  {
    id: 'research_rag',
    label: 'Research / RAG',
    shortLabel: 'Research',
    category: 'text',
    description: 'Web research, document ingestion, and retrieval-augmented generation.',
    requestCapability: 'research',
    statusCapabilityId: 'rag',
    knownRoute: '/api/admin/research/assist',
    artifactType: 'document',
    appUsable: true,
    proofRequirements: ['provider_connected'],
    fields: [
      { id: 'question', label: 'Research question', type: 'textarea', required: true, placeholder: 'Add a source URL, document note, or research query.' },
      { id: 'url', label: 'URL input for scrape', type: 'url', placeholder: 'Optional website URL to scrape.' },
      { id: 'document_upload', label: 'Document upload', type: 'file', helpText: 'Upload a document for ingestion.' },
      { id: 'depth', label: 'Scrape depth', type: 'select', defaultValue: 'standard', options: [
        { value: 'shallow', label: 'Shallow' }, { value: 'standard', label: 'Standard' }, { value: 'deep', label: 'Deep' },
      ]},
      { id: 'cite_sources', label: 'Cite sources', type: 'toggle', defaultValue: true },
      { id: 'memory_ingest', label: 'Ingest to memory', type: 'toggle', defaultValue: false },
    ],
  },

  // ── Campaign ──────────────────────────────────────────────────────────────
  {
    id: 'campaign',
    label: 'Campaign',
    shortLabel: 'Campaign',
    category: 'system',
    description: 'Generate marketing campaigns and assets.',
    requestCapability: 'campaigns',
    statusCapabilityId: 'campaigns',
    knownRoute: '/api/admin/campaigns',
    artifactType: 'document',
    appUsable: true,
    proofRequirements: ['provider_connected'],
    fields: [
      { id: 'brand', label: 'Brand / source', type: 'text', required: true, placeholder: 'Brand name or app context.' },
      { id: 'objective', label: 'Campaign objective', type: 'textarea', required: true },
      { id: 'audience', label: 'Target audience', type: 'text' },
      { id: 'asset_type_selector', label: 'Asset type selector', type: 'multi_select', options: [
        { value: 'post', label: 'Post' }, { value: 'ad', label: 'Ad' }, { value: 'reel', label: 'Reel' }, { value: 'email', label: 'Email' },
      ]},
      { id: 'posts_count', label: 'Number of posts', type: 'number', defaultValue: 3 },
      { id: 'tone', label: 'Tone', type: 'select', options: [
        { value: 'professional', label: 'Professional' }, { value: 'casual', label: 'Casual' }, { value: 'exciting', label: 'Exciting' },
      ]},
      { id: 'approval_mode', label: 'Approval mode', type: 'select', options: [
        { value: 'manual', label: 'Manual review' }, { value: 'auto', label: 'Auto approve' },
      ]},
    ],
  },

  // ── Automation ────────────────────────────────────────────────────────────
  {
    id: 'automation',
    label: 'Automation',
    shortLabel: 'Automation',
    category: 'system',
    description: 'Configure scheduled jobs, workflows, and approval flows.',
    requestCapability: 'scheduler',
    statusCapabilityId: 'scheduler',
    knownRoute: '/api/admin/scheduler',
    adminOnly: true,
    appUsable: false,
    fields: [
      { id: 'name', label: 'Automation name', type: 'text', required: true },
      { id: 'capability', label: 'Target capability', type: 'select', options: [
        { value: 'chat', label: 'Chat' }, { value: 'image_generation', label: 'Image' }, { value: 'music_generation', label: 'Music' },
      ]},
      { id: 'trigger', label: 'Trigger type', type: 'select', options: [
        { value: 'schedule', label: 'Schedule' }, { value: 'webhook', label: 'Webhook' }, { value: 'manual', label: 'Manual' },
      ]},
      { id: 'schedule', label: 'Schedule', type: 'text', placeholder: 'cron expression or interval', visibleWhen: 'trigger=schedule' },
      { id: 'approval_required', label: 'Approval required', type: 'toggle', defaultValue: true },
    ],
  },

  // ── Publishing ────────────────────────────────────────────────────────────
  {
    id: 'publishing',
    label: 'Publishing',
    shortLabel: 'Publish',
    category: 'system',
    description: 'Schedule and publish content to connected platforms.',
    requestCapability: 'social_publishing',
    statusCapabilityId: 'scheduler',
    adminOnly: true,
    appUsable: false,
    fields: [
      { id: 'platform', label: 'Platform', type: 'multi_select', options: [
        { value: 'twitter', label: 'X/Twitter' }, { value: 'instagram', label: 'Instagram' }, { value: 'linkedin', label: 'LinkedIn' },
      ]},
      { id: 'content', label: 'Post content', type: 'textarea', required: true },
      { id: 'schedule_time', label: 'Schedule time', type: 'text', placeholder: 'ISO datetime or leave blank for now' },
      { id: 'approval_required', label: 'Approval required', type: 'toggle', defaultValue: true },
    ],
  },

  // ── Trading ───────────────────────────────────────────────────────────────
  {
    id: 'trading',
    label: 'Trading',
    shortLabel: 'Trading',
    category: 'system',
    description: 'Trading strategy analysis and execution.',
    requestCapability: 'trading_analysis',
    statusCapabilityId: 'trading_analysis',
    adminOnly: true,
    appUsable: false,
    fields: [
      { id: 'strategy', label: 'Strategy', type: 'textarea', required: true, placeholder: 'Describe the trading strategy.' },
      { id: 'symbol', label: 'Market / symbol', type: 'text', placeholder: 'e.g. BTC/USD' },
      { id: 'timeframe', label: 'Timeframe', type: 'select', options: [
        { value: '1m', label: '1 minute' }, { value: '5m', label: '5 minutes' }, { value: '1h', label: '1 hour' }, { value: '1d', label: '1 day' },
      ]},
      { id: 'max_position', label: 'Max position size', type: 'number' },
      { id: 'daily_loss_limit', label: 'Daily loss limit', type: 'number' },
    ],
  },

  // ── Adult Private ─────────────────────────────────────────────────────────
  {
    id: 'adult_private',
    label: 'Adult Private',
    shortLabel: 'Adult',
    category: 'system',
    description: 'Adult-gated capabilities via Hugging Face dedicated endpoints only.',
    requestCapability: 'adult_text',
    statusCapabilityId: 'adult_text',
    adminOnly: true,
    adultPrivate: true,
    appUsable: false,
    proofRequirements: ['adult_permission_gate', 'hf_adult_endpoint_configured'],
    fields: [
      { id: 'adult_text', label: 'Adult text', type: 'status', statusCapabilityId: 'adult_text' },
      { id: 'adult_image', label: 'Adult image', type: 'status', statusCapabilityId: 'adult_image' },
      { id: 'adult_voice', label: 'Adult voice', type: 'status', statusCapabilityId: 'adult_voice' },
      { id: 'adult_avatar', label: 'Adult avatar', type: 'status', statusCapabilityId: 'adult_avatar' },
      { id: 'adult_video', label: 'Adult video', type: 'status', statusCapabilityId: 'adult_video' },
    ],
  },
] as const
