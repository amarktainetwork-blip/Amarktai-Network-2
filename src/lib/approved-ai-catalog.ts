export type ApprovedProviderKey =
  | 'genx'
  | 'huggingface'
  | 'qwen'
  | 'minimax'
  | 'groq'
  | 'together'
  | 'openai'

export type CostMode = 'cheap' | 'balanced' | 'premium'

export interface ApprovedProvider {
  key: ApprovedProviderKey
  displayName: string
  settingsLabel: string
  defaultBaseUrl: string
  envVars: string[]
  providerType: 'ai'
  notes: string
  sortOrder: number
}

export interface ApprovedModel {
  provider: ApprovedProviderKey
  id: string
  label: string
  costMode: CostMode
  capability: 'repo_workbench' | 'assistant' | 'image' | 'voice' | 'embedding' | 'research'
  taskLabel?: string
}

export const APPROVED_AI_PROVIDERS: readonly ApprovedProvider[] = [
  {
    key: 'genx',
    displayName: 'GenX',
    settingsLabel: 'GenX',
    defaultBaseUrl: 'https://query.genx.sh',
    envVars: ['GENX_API_KEY'],
    providerType: 'ai',
    notes: 'Primary routing layer for workbench planning, patches, and assistant tasks.',
    sortOrder: 0,
  },
  {
    key: 'huggingface',
    displayName: 'Hugging Face',
    settingsLabel: 'Hugging Face',
    defaultBaseUrl: 'https://api-inference.huggingface.co',
    envVars: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    providerType: 'ai',
    notes: 'Shown as task-based routes in the UI, not as a raw model picker.',
    sortOrder: 1,
  },
  {
    key: 'qwen',
    displayName: 'Qwen/DashScope',
    settingsLabel: 'Qwen / DashScope',
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode',
    envVars: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    providerType: 'ai',
    notes: 'Low-cost chat, code, vision, and DashScope media routes.',
    sortOrder: 2,
  },
  {
    key: 'minimax',
    displayName: 'MiniMax/Mimo',
    settingsLabel: 'MiniMax / Mimo',
    defaultBaseUrl: 'https://api.minimax.io',
    envVars: ['MINIMAX_API_KEY', 'MIMO_API_KEY'],
    providerType: 'ai',
    notes: 'Text, voice, and media-capable routes under one approved provider.',
    sortOrder: 3,
  },
  {
    key: 'groq',
    displayName: 'Groq',
    settingsLabel: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai',
    envVars: ['GROQ_API_KEY'],
    providerType: 'ai',
    notes: 'Fast code, chat, and check triage route.',
    sortOrder: 4,
  },
  {
    key: 'together',
    displayName: 'Together AI',
    settingsLabel: 'Together AI',
    defaultBaseUrl: 'https://api.together.xyz',
    envVars: ['TOGETHER_API_KEY'],
    providerType: 'ai',
    notes: 'Open model route for coding and image tasks.',
    sortOrder: 5,
  },
  {
    key: 'openai',
    displayName: 'OpenAI',
    settingsLabel: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com',
    envVars: ['OPENAI_API_KEY'],
    providerType: 'ai',
    notes: 'Premium reasoning, coding, assistant, and multimodal route.',
    sortOrder: 6,
  },
] as const

export const APPROVED_PROVIDER_KEYS = new Set<ApprovedProviderKey>(
  APPROVED_AI_PROVIDERS.map((provider) => provider.key),
)

export const APPROVED_WORKBENCH_MODELS: readonly ApprovedModel[] = [
  { provider: 'qwen', id: 'qwen-turbo', label: 'Qwen Turbo', costMode: 'cheap', capability: 'repo_workbench' },
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', costMode: 'cheap', capability: 'repo_workbench' },
  { provider: 'together', id: 'meta-llama/Llama-3-70b-chat-hf', label: 'Llama 3 70B Chat', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'genx', id: 'auto:coding-balanced', label: 'GenX Coding Balanced', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'minimax', id: 'MiniMax-M2.7', label: 'MiniMax M2.7', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o', costMode: 'premium', capability: 'repo_workbench' },
  { provider: 'genx', id: 'auto:coding-best', label: 'GenX Coding Best', costMode: 'premium', capability: 'repo_workbench' },
] as const

export const APPROVED_ASSISTANT_MODELS: readonly ApprovedModel[] = [
  { provider: 'genx', id: 'auto:assistant', label: 'GenX Assistant Route', costMode: 'balanced', capability: 'assistant' },
  { provider: 'qwen', id: 'qwen-plus', label: 'Qwen Plus', costMode: 'cheap', capability: 'assistant' },
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3', costMode: 'cheap', capability: 'assistant' },
  { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o', costMode: 'premium', capability: 'assistant' },
] as const

export const HUGGING_FACE_TASK_ROUTES: readonly ApprovedModel[] = [
  { provider: 'huggingface', id: 'task:text', label: 'Text and code task', costMode: 'cheap', capability: 'assistant', taskLabel: 'Text and code' },
  { provider: 'huggingface', id: 'task:image', label: 'Image generation task', costMode: 'cheap', capability: 'image', taskLabel: 'Image generation' },
  { provider: 'huggingface', id: 'task:speech-to-text', label: 'Speech-to-text task', costMode: 'cheap', capability: 'voice', taskLabel: 'Speech to text' },
  { provider: 'huggingface', id: 'task:text-to-speech', label: 'Text-to-speech task', costMode: 'cheap', capability: 'voice', taskLabel: 'Text to speech' },
  { provider: 'huggingface', id: 'task:embeddings', label: 'Embeddings task', costMode: 'cheap', capability: 'embedding', taskLabel: 'Embeddings' },
] as const

export function isApprovedAIProvider(provider: string): provider is ApprovedProviderKey {
  return APPROVED_PROVIDER_KEYS.has(provider as ApprovedProviderKey)
}

export function providerLabel(provider: string): string {
  return APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)?.displayName ?? provider
}
