import type { CommandIntent, ProductSurface } from '@/lib/product-contract'
import { extractStudioOptions, type StudioCommandOptions } from '@/lib/studio-options'
import { providersForCapability, type ProviderCapability } from '@/lib/provider-mesh'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'

export interface CommandRoute {
  intent: CommandIntent
  surface: ProductSurface
  toolchain: string[]
  appModule: string
  agentTeam: string[]
  providerStrategy: string[]
  approvalRequired: boolean
  approvalReason: string | null
  artifacts: string[]
  nextVisibleStep: string
  executionRoute: string
  confidence: number
  options: StudioCommandOptions
  missingInformation: string[]
  selectedSurface: ProductSurface
  selectedAgents: string[]
  nextStep: string
  artifactType: string[]
  selectedCapability: ProviderCapability | 'app_builder' | 'system' | 'network_app' | 'workflow'
  selectedProviderStrategy: string[]
  selectedProviders: string[]
}

type CommandRouteTemplate = Omit<
  CommandRoute,
  'intent' | 'confidence' | 'options' | 'missingInformation' | 'selectedSurface' | 'selectedAgents' | 'nextStep' | 'artifactType' | 'selectedCapability' | 'selectedProviderStrategy' | 'selectedProviders'
>

const RULES: Array<{
  intent: CommandIntent
  patterns: RegExp[]
  route: CommandRouteTemplate
}> = [
  command('create_song', [/song|music|lyrics|track|album|genre/i], 'Workspace', 'content-studio',
    ['Song Producer Agent', 'Media Director Agent'], ['GenX audio/music first', 'specialist audio fallback'],
    ['lyrics', 'MP3/WAV', 'metadata', 'artifact card'], '/api/admin/music-studio', 'Open song controls and confirm duration, genres, vocals, mood, and language.'),
  command('create_movie', [/movie|film|video|storyboard|scene|clip/i], 'Studio', 'content-studio',
    ['Movie Director Agent', 'Media Director Agent'], ['GenX video first', 'Qwen/Together fallback', 'ffmpeg final render'],
    ['script', 'storyboard', 'scene clips', 'captions', 'final MP4'], '/api/brain/video-generate', 'Open movie controls and confirm duration, aspect ratio, voice, music, and style.'),
  command('create_avatar', [/avatar|talking head|lip.?sync/i], 'Studio', 'content-studio',
    ['Avatar Producer Agent', 'Voice Producer Agent'], ['GenX avatar/image+audio-to-video first', 'MiMo/Groq voice helpers'],
    ['avatar image', 'voice track', 'avatar video'], '/api/brain/video-generate', 'Open avatar controls and attach or create the image and voice.'),
  command('create_voice', [/voice|speech|tts|narrat|audio read/i], 'Workspace', 'content-studio',
    ['Voice Producer Agent'], ['GenX voice first', 'MiMo/Groq specialist route'],
    ['voice audio', 'metadata'], '/api/voice/tts', 'Open voice controls and confirm voice, language, and emotion.'),
  command('create_image', [/image|picture|illustration|logo|poster|photo/i], 'Workspace', 'content-studio',
    ['Media Director Agent'], ['GenX image first', 'Qwen/Together/Hugging Face fallback'],
    ['image', 'prompt metadata', 'artifact card'], '/api/brain/image', 'Open image controls and confirm style, aspect ratio, and cost mode.'),
  command('crawl_site', [/crawl|scrape|extract.*site|website audit/i], 'Studio', 'research-engine',
    ['Research Agent', 'Memory/Learning Agent'], ['Local Playwright/Scrapy/Trafilatura', 'Qdrant indexing'],
    ['source cards', 'screenshots', 'extracted text', 'crawl report'], '/api/admin/research/url', 'Confirm the URL and crawl depth.'),
  command('research_topic', [/research|investigate|find sources|report on/i], 'Studio', 'research-engine',
    ['Research Agent'], ['Local crawler first', 'GenX synthesis', 'Hugging Face embeddings'],
    ['research report', 'source cards', 'memory summary'], '/api/admin/research/assist', 'Confirm the topic, depth, and desired report format.'),
  command('create_pr', [/create|open|raise].*(pr|pull request)|pull request/i], 'Workspace', 'app-builder',
    ['Code Review Agent', 'GitHub Agent'], ['GenX coding/review first'], ['diff', 'checks', 'PR link'],
    '/api/admin/repo-workbench', 'Select the repository and review the diff before approval.', true, 'Creating a pull request changes the connected GitHub repository.'),
  command('deploy_app', [/deploy|release|ship to|publish app/i], 'Workbench', 'operations',
    ['Deployment Agent', 'Runtime Truth Agent'], ['GenX planning', 'local deployment tools'], ['deployment plan', 'deploy logs', 'deployment result'],
    '/api/admin/repo-workbench', 'Select the deployment target and approve the deployment plan.', true, 'Deployment changes a live runtime.'),
  command('fix_repo', [/fix|finish|repair|implement|change].*(repo|code|app)|patch/i], 'Workbench', 'app-builder',
    ['Repo Audit Agent', 'Coding Agent', 'Code Review Agent', 'GitHub Agent'], ['GenX Codex/coding first', 'strong review model second'],
    ['plan', 'diff', 'checks', 'PR option'], '/api/admin/repo-workbench', 'Select the repository and generate a reviewable plan.', true, 'Applying patches, commits, pushes, and PRs require explicit approval.'),
  command('audit_repo', [/audit.*repo|review.*repo|what.*missing|codebase audit/i], 'Workspace', 'app-builder',
    ['Repo Audit Agent', 'Product Architect Agent', 'Code Review Agent'], ['GenX coding/reasoning first'],
    ['audit report', 'issue list', 'recommended plan'], '/api/admin/repo-workbench', 'Select or import the repository and start the read-only audit.'),
  command('build_new_app', [/build|create|make|start].*(app|website|dashboard|platform|api)/i], 'App Builder', 'app-builder',
    ['App Builder Agent', 'Product Architect Agent', 'UX/UI Designer Agent', 'Frontend Builder Agent', 'Backend Builder Agent'],
    ['GenX planning and coding first', 'specialist media routes as needed'],
    ['project', 'plan', 'generated files', 'preview', 'runtime QA', 'repo/PR/deploy option'], '/api/admin/app-builder/projects',
    'Start clarification, then move through Plan, Design, Generate, Media policy, Preview, Runtime QA, and Final gate.'),
  command('check_system', [/check.*system|system.*status|platform health/i], 'Workspace', 'operations',
    ['Runtime Truth Agent', 'VPS Monitor Agent'], ['Local safe diagnostics'],
    ['health summary', 'service status', 'actionable blockers'], '/api/admin/system/readiness', 'Run read-only system readiness checks.'),
  command('monitor_vps', [/vps|server|cpu|memory|disk|nginx|systemd|ssl/i], 'Workspace', 'operations',
    ['VPS Monitor Agent', 'Runtime Truth Agent', 'Repair Agent'], ['Local safe diagnostics'],
    ['health summary', 'service status', 'warnings', 'fix recommendations'], '/api/admin/system/vps', 'Run read-only VPS and service checks.'),
  command('check_app_status', [/app status|is .* healthy|connected app|health check/i], 'Workspace', 'operations',
    ['Runtime Truth Agent'], ['Local health endpoints', 'integration heartbeats'], ['plain-English readiness', 'last error summary'],
    '/api/admin/apps', 'Choose the app to inspect.'),
  command('repair_connected_app', [/repair.*app|restart.*app|app.*broken/i], 'Workspace', 'operations',
    ['Repair Agent', 'Runtime Truth Agent'], ['Read-only diagnosis first', 'approved repair action second'], ['diagnosis', 'repair plan', 'repair outcome'],
    '/api/admin/apps', 'Inspect the diagnosis and approve any state-changing repair.', true, 'Service restarts and repairs can change live state.'),
  command('create_marketing_campaign', [/marketing|campaign|ads|launch content/i], 'Workspace', 'marketing',
    ['Marketing Agent', 'Research Agent', 'Media Director Agent'], ['GenX first', 'specialist media routes'], ['campaign plan', 'content', 'media', 'measurement plan'],
    '/api/admin/command', 'Open the Marketing App controls and confirm audience, channels, budget, and approval policy.'),
  command('run_crypto_analysis', [/crypto|bitcoin|ethereum|trading|market analysis/i], 'Workspace', 'crypto-trading',
    ['Crypto/Trading Agent', 'Research Agent', 'Security Agent'], ['GenX/Qwen reasoning', 'approved market data'], ['analysis report', 'risk scenarios'],
    '/api/admin/command', 'Confirm the assets, time horizon, and risk policy.'),
  command('automate_workflow', [/automat|workflow|schedule|when .* then/i], 'Workspace', 'automation-hub',
    ['Automation Agent', 'Network Orchestrator Agent'], ['Redis queue', 'workflow engine'], ['workflow definition', 'approval gates', 'run history'],
    '/api/workflows', 'Define trigger, actions, approvals, and failure handling.'),
  command('generate_file', [/generate|create|write].*(file|document|csv|json|report)/i], 'Workspace', 'operations',
    ['Network Orchestrator Agent'], ['GenX first'], ['generated file'], '/api/admin/artifacts', 'Confirm the file type and required contents.'),
  command('explain_status', [/explain.*status|what.*blocked|why.*failed|readiness/i], 'System', 'operations',
    ['Runtime Truth Agent'], ['Runtime truth'], ['plain-English status explanation'], '/api/admin/system/readiness', 'Load runtime truth and explain only actionable issues.'),
]

function command(
  intent: CommandIntent,
  patterns: RegExp[],
  surface: ProductSurface,
  appModule: string,
  agentTeam: string[],
  providerStrategy: string[],
  artifacts: string[],
  executionRoute: string,
  nextVisibleStep: string,
  approvalRequired = false,
  approvalReason: string | null = null,
) {
  return {
    intent,
    patterns,
    route: {
      surface,
      toolchain: toolchainFor(surface),
      appModule,
      agentTeam,
      providerStrategy,
      approvalRequired,
      approvalReason,
      artifacts,
      nextVisibleStep,
      executionRoute,
    },
  }
}

function toolchainFor(surface: ProductSurface) {
  if (surface === 'Workspace') return ['provider mesh', 'approved tools', 'memory', 'artifacts']
  if (surface === 'Workbench') return ['GitHub', 'Repo Workbench', 'checks', 'artifacts', 'memory']
  if (surface === 'App Builder') return ['Idea Builder', 'build workspace', 'live preview', 'runtime QA', 'GitHub']
  if (surface === 'Studio') return ['GenX', 'specialist providers', 'async jobs', 'artifact storage']
  if (surface === 'System') return ['safe diagnostics', 'runtime truth', 'service health']
  return ['command router', 'agents', 'memory', 'artifacts']
}

export function routeCommand(prompt: string, selectedOptions: StudioCommandOptions = {}, connectedProviderIds: readonly string[] = []): CommandRoute {
  const normalized = prompt.trim()
  const options = extractStudioOptions(normalized, selectedOptions)
  let best: { score: number; rule: typeof RULES[number] } | null = null
  for (const rule of RULES) {
    const score = rule.patterns.reduce((total, pattern) => total + (pattern.test(normalized) ? 1 : 0), 0)
    if (score > 0 && (!best || score > best.score)) best = { score, rule }
  }
  if (!best) {
    const fallback: Omit<CommandRoute, 'missingInformation' | 'selectedSurface' | 'selectedAgents' | 'nextStep' | 'artifactType' | 'selectedCapability' | 'selectedProviderStrategy' | 'selectedProviders'> = {
      intent: 'ask_question',
      surface: 'Workspace',
      toolchain: ['GenX', 'memory', 'connected app context'],
      appModule: 'operations',
      agentTeam: ['Network Orchestrator Agent', 'Command Router Agent'],
      providerStrategy: ['GenX primary', 'fast specialist fallback'],
      approvalRequired: false,
      approvalReason: null,
      artifacts: ['conversation message', 'optional saved answer'],
      nextVisibleStep: 'Answer in the command window and offer the relevant attached surface when action is needed.',
      executionRoute: '/api/admin/amarktai-assistant/stream',
      confidence: 0.55,
      options,
    }
    return withPublicContract(fallback, connectedProviderIds)
  }
  return withPublicContract({
    intent: best.rule.intent,
    ...best.rule.route,
    confidence: Math.min(0.98, 0.72 + best.score * 0.1),
    options,
  }, connectedProviderIds)
}

export async function routeCommandWithProviderMesh(prompt: string, selectedOptions: StudioCommandOptions = {}) {
  const truth = await getPlatformSettingsTruth()
  return routeCommand(prompt, selectedOptions, truth.connectedProviderIds)
}

function withPublicContract(
  route: Omit<CommandRoute, 'missingInformation' | 'selectedSurface' | 'selectedAgents' | 'nextStep' | 'artifactType' | 'selectedCapability' | 'selectedProviderStrategy' | 'selectedProviders'>,
  connectedProviderIds: readonly string[],
): CommandRoute {
  const missingInformation = route.intent === 'create_song' && !route.options.genres?.length
    ? ['Which genre or genre combination should the song use?']
    : []
  const selectedCapability = capabilityForIntent(route.intent)
  const compatibleProviders = typeof selectedCapability === 'string' && isProviderCapability(selectedCapability)
    ? providersForCapability(selectedCapability, connectedProviderIds)
    : []
  const preferredIds = preferredProvidersForIntent(route.intent)
  const selectedProviders = compatibleProviders
    .slice()
    .sort((a, b) => preferredIds.indexOf(a.id) - preferredIds.indexOf(b.id))
    .map((provider) => provider.id)
  const selectedProviderStrategy = selectedProviders.length
    ? selectedProviders.map((provider, index) => `${index === 0 ? 'Primary' : 'Fallback'}: ${provider}`)
    : route.providerStrategy

  return {
    ...route,
    missingInformation,
    selectedSurface: route.surface,
    selectedAgents: route.agentTeam,
    nextStep: missingInformation[0] ?? route.nextVisibleStep,
    artifactType: route.artifacts,
    selectedCapability,
    selectedProviderStrategy,
    selectedProviders,
  }
}

function capabilityForIntent(intent: CommandIntent): CommandRoute['selectedCapability'] {
  if (intent === 'create_song') return 'music'
  if (intent === 'create_image') return 'image'
  if (intent === 'create_movie') return 'video'
  if (intent === 'create_avatar') return 'avatar'
  if (intent === 'create_voice') return 'tts'
  if (intent === 'research_topic' || intent === 'crawl_site') return 'crawl'
  if (intent === 'audit_repo' || intent === 'fix_repo' || intent === 'create_pr' || intent === 'deploy_app') return 'repo'
  if (intent === 'build_new_app') return 'app_builder'
  if (intent === 'monitor_vps' || intent === 'check_system' || intent === 'explain_status') return 'system'
  if (intent === 'automate_workflow') return 'workflow'
  if (intent === 'check_app_status' || intent === 'repair_connected_app' || intent === 'create_marketing_campaign' || intent === 'run_crypto_analysis') return 'network_app'
  return 'text'
}

function preferredProvidersForIntent(intent: CommandIntent): string[] {
  if (intent === 'create_image') return ['genx', 'qwen', 'together', 'huggingface']
  if (intent === 'create_movie') return ['genx', 'qwen', 'together', 'huggingface']
  if (intent === 'create_song') return ['genx', 'together', 'huggingface']
  if (intent === 'create_avatar') return ['genx', 'qwen']
  if (intent === 'create_voice') return ['genx', 'mimo', 'groq', 'huggingface']
  if (intent === 'audit_repo' || intent === 'fix_repo' || intent === 'create_pr' || intent === 'build_new_app') return ['genx', 'mimo', 'qwen', 'groq', 'together', 'huggingface']
  return ['genx', 'mimo', 'qwen', 'groq', 'together', 'huggingface']
}

function isProviderCapability(value: string): value is ProviderCapability {
  return !['app_builder', 'system', 'network_app', 'workflow'].includes(value)
}
