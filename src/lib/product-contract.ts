export const PRODUCT_POSITIONING =
  'Amarktai Network is the core AI operating system that can plan, build, launch, monitor, improve, repair, generate, deploy, and operate connected apps, agents, media, workflows, and business modules from one intelligent command layer.'

export type CommandIntent =
  | 'create_song'
  | 'create_movie'
  | 'create_avatar'
  | 'create_voice'
  | 'create_image'
  | 'research_topic'
  | 'crawl_site'
  | 'build_new_app'
  | 'audit_repo'
  | 'fix_repo'
  | 'create_pr'
  | 'deploy_app'
  | 'monitor_vps'
  | 'check_app_status'
  | 'repair_connected_app'
  | 'create_marketing_campaign'
  | 'run_crypto_analysis'
  | 'automate_workflow'
  | 'ask_question'
  | 'generate_file'
  | 'explain_status'

export type ProductSurface = 'Studio' | 'Workbench' | 'App Builder' | 'Network Apps' | 'System' | 'Command'

export type AppReadiness = 'Live' | 'In build' | 'Planned' | 'Needs setup' | 'Blocked'

export interface NetworkAppDefinition {
  slug: string
  displayName: string
  status: AppReadiness
  purpose: string
  capabilities: string[]
  requiredProviders: string[]
  requiredAgents: string[]
  routes: string[]
  setupActions: string[]
  lastActivity: string | null
  readinessState: string
  sharedMemoryNamespace: string
  eventsEmitted: string[]
  eventsConsumed: string[]
  repairActions: string[]
  openHref: string
}

export const NETWORK_APPS: readonly NetworkAppDefinition[] = [
  {
    slug: 'marketing',
    displayName: 'Marketing App',
    status: 'In build',
    purpose: 'Plan campaigns, create content, evaluate outcomes, and improve future launches.',
    capabilities: ['campaign planning', 'content generation', 'research', 'image generation', 'performance learning'],
    requiredProviders: ['genx', 'huggingface', 'groq'],
    requiredAgents: ['marketing-agent', 'research-agent', 'media-director-agent'],
    routes: ['/api/admin/command', '/api/admin/artifacts', '/api/admin/memory'],
    setupActions: ['Connect campaign channels', 'Define brand memory', 'Confirm publishing approvals'],
    lastActivity: null,
    readinessState: 'Core generation works; external publishing connections still need setup.',
    sharedMemoryNamespace: 'app:marketing',
    eventsEmitted: ['campaign_created', 'artifact_created', 'campaign_outcome_recorded'],
    eventsConsumed: ['research_completed', 'media_completed', 'customer_signal_recorded'],
    repairActions: ['Retry failed generation', 'Refresh provider route', 'Reconnect publishing channel'],
    openHref: '/admin/dashboard/command?app=marketing',
  },
  {
    slug: 'crypto-trading',
    displayName: 'Crypto / Trading App',
    status: 'Planned',
    purpose: 'Research markets, model risk, record outcomes, and produce decision support without autonomous trading.',
    capabilities: ['market research', 'risk analysis', 'scenario modelling', 'outcome learning'],
    requiredProviders: ['genx', 'qwen', 'groq'],
    requiredAgents: ['crypto-trading-agent', 'research-agent', 'security-agent'],
    routes: ['/api/admin/command', '/api/admin/memory'],
    setupActions: ['Connect approved market data', 'Define risk policy', 'Keep trade execution human-approved'],
    lastActivity: null,
    readinessState: 'Analysis contract exists; live market data and execution are not connected.',
    sharedMemoryNamespace: 'app:crypto-trading',
    eventsEmitted: ['analysis_completed', 'risk_outcome_recorded'],
    eventsConsumed: ['market_data_updated', 'risk_policy_updated'],
    repairActions: ['Refresh market source', 'Re-run risk analysis', 'Review blocked data connection'],
    openHref: '/admin/dashboard/command?app=crypto-trading',
  },
  {
    slug: 'app-builder',
    displayName: 'App Builder',
    status: 'In build',
    purpose: 'Turn an idea into a clarified, planned, generated, previewed, tested, and deployable app.',
    capabilities: ['idea builder', 'clarification', 'planning', 'file generation', 'live preview', 'runtime QA', 'PR preparation'],
    requiredProviders: ['genx', 'github'],
    requiredAgents: ['app-builder-agent', 'product-architect-agent', 'ux-ui-designer-agent', 'frontend-builder-agent', 'backend-builder-agent'],
    routes: ['/api/admin/command', '/api/admin/app-builder/projects', '/api/admin/playground'],
    setupActions: ['Connect GitHub for repo/PR output', 'Confirm storage', 'Configure deployment target'],
    lastActivity: null,
    readinessState: 'Project storage and build workflow are available; generated runtimes require provider and deployment setup.',
    sharedMemoryNamespace: 'app:app-builder',
    eventsEmitted: ['plan_created', 'file_generated', 'checks_completed', 'deploy_completed'],
    eventsConsumed: ['build_outcome_recorded', 'repair_outcome_recorded'],
    repairActions: ['Resume build', 'Run validation', 'Repair failed files', 'Retry preview'],
    openHref: '/admin/dashboard/command?surface=app-builder',
  },
  {
    slug: 'content-studio',
    displayName: 'Content Studio',
    status: 'In build',
    purpose: 'Generate and manage songs, movies, avatars, images, voices, and reusable creative artifacts.',
    capabilities: ['song', 'movie', 'avatar', 'voice', 'image', 'artifact library'],
    requiredProviders: ['genx', 'replicate', 'fal'],
    requiredAgents: ['media-director-agent', 'song-producer-agent', 'movie-director-agent', 'avatar-producer-agent', 'voice-producer-agent'],
    routes: ['/api/admin/command', '/api/admin/studio/execute', '/api/admin/music-studio', '/api/admin/artifacts'],
    setupActions: ['Configure GenX', 'Verify ffmpeg', 'Confirm persistent storage'],
    lastActivity: null,
    readinessState: 'Core media routes exist; live output depends on configured models and storage.',
    sharedMemoryNamespace: 'app:content-studio',
    eventsEmitted: ['artifact_created', 'media_completed'],
    eventsConsumed: ['media_feedback_recorded', 'campaign_created'],
    repairActions: ['Poll provider job', 'Retry specialist fallback', 'Rebuild final render'],
    openHref: '/admin/dashboard/command?surface=studio',
  },
  {
    slug: 'research-engine',
    displayName: 'Research Engine',
    status: 'Needs setup',
    purpose: 'Render, crawl, extract, index, and synthesize source-backed research.',
    capabilities: ['rendered crawling', 'depth crawling', 'text extraction', 'screenshots', 'Qdrant indexing'],
    requiredProviders: ['playwright', 'scrapy', 'trafilatura', 'qdrant'],
    requiredAgents: ['research-agent', 'memory-learning-agent'],
    routes: ['/api/admin/command', '/api/admin/research/url', '/api/admin/research/status'],
    setupActions: ['Install Playwright browsers', 'Create Python crawler venv', 'Start Qdrant'],
    lastActivity: null,
    readinessState: 'No Firecrawl dependency. Local crawler readiness is verified at runtime.',
    sharedMemoryNamespace: 'app:research',
    eventsEmitted: ['research_completed', 'source_indexed'],
    eventsConsumed: ['crawl_requested', 'memory_query_requested'],
    repairActions: ['Retry browser render', 'Retry extraction', 'Re-index sources'],
    openHref: '/admin/dashboard/command?intent=research_topic',
  },
  {
    slug: 'automation-hub',
    displayName: 'Automation Hub',
    status: 'In build',
    purpose: 'Coordinate repeatable agent workflows, approval gates, schedules, and event-driven actions.',
    capabilities: ['workflows', 'queues', 'approvals', 'webhooks', 'schedules'],
    requiredProviders: ['redis', 'genx'],
    requiredAgents: ['automation-agent', 'network-orchestrator-agent'],
    routes: ['/api/workflows', '/api/webhooks', '/api/system/events'],
    setupActions: ['Start Redis', 'Configure webhook destinations'],
    lastActivity: null,
    readinessState: 'Workflow and event foundations exist; schedule coverage depends on deployment.',
    sharedMemoryNamespace: 'app:automation',
    eventsEmitted: ['workflow_started', 'workflow_completed'],
    eventsConsumed: ['job_created', 'approval_granted', 'artifact_created'],
    repairActions: ['Retry workflow', 'Resume queue', 'Inspect approval blocker'],
    openHref: '/admin/dashboard/command?intent=automate_workflow',
  },
  ...[
    ['sales-crm', 'Sales CRM', 'Planned', 'Coordinate leads, follow-ups, proposals, and sales learning.'],
    ['support-desk', 'Support Desk', 'Planned', 'Triage requests, draft responses, and learn from resolutions.'],
    ['finance-ops', 'Finance Ops', 'Planned', 'Support reporting, reconciliations, document generation, and finance workflows.'],
    ['retail-ecommerce', 'Retail / Ecommerce', 'Planned', 'Coordinate catalog, merchandising, support, content, and performance signals.'],
    ['operations', 'Operations', 'In build', 'Monitor apps, jobs, deployments, infrastructure, failures, and repairs.'],
  ].map(([slug, displayName, status, purpose]) => ({
    slug,
    displayName,
    status: status as AppReadiness,
    purpose,
    capabilities: ['command routing', 'shared memory', 'artifact linking', 'agent workflows'],
    requiredProviders: ['genx'],
    requiredAgents: ['network-orchestrator-agent', 'memory-learning-agent'],
    routes: ['/api/admin/command', '/api/admin/memory'],
    setupActions: ['Define module integrations', 'Confirm approval policy'],
    lastActivity: null,
    readinessState: status === 'Planned' ? 'Module contract defined; implementation has not started.' : 'Foundation exists; integrations are still being completed.',
    sharedMemoryNamespace: `app:${slug}`,
    eventsEmitted: ['module_outcome_recorded'],
    eventsConsumed: ['memory_updated', 'artifact_created'],
    repairActions: ['Review readiness', 'Reconnect module', 'Retry last job'],
    openHref: `/admin/dashboard/command?app=${slug}`,
  })),
] as const

export interface ProviderContract {
  name: string
  key: string
  envAliases: string[]
  baseUrl: string
  authMethod: string
  capabilities: string[]
  asyncJobs: boolean
  polling: boolean
  webhooks: boolean
  artifacts: boolean
  defaultRoute: string
  status: 'primary' | 'specialist' | 'infrastructure'
  testRoute: string
  userFacingVisibility: 'settings' | 'system'
}

export const PROVIDER_CONTRACTS: readonly ProviderContract[] = [
  {
    name: 'GenX',
    key: 'genx',
    envAliases: ['GENX_API_KEY', 'GENX_BASE_URL', 'GENX_API_URL'],
    baseUrl: 'Configured by GENX_BASE_URL or GENX_API_URL',
    authMethod: 'Bearer token',
    capabilities: ['chat', 'code', 'reasoning', 'image', 'video', 'avatar', 'music', 'TTS', 'STT', 'multimodal', 'tools'],
    asyncJobs: true,
    polling: true,
    webhooks: true,
    artifacts: true,
    defaultRoute: 'Primary route for every supported capability',
    status: 'primary',
    testRoute: '/api/admin/genx/status',
    userFacingVisibility: 'settings',
  },
  {
    name: 'Hugging Face',
    key: 'huggingface',
    envAliases: ['HF_TOKEN', 'HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN'],
    baseUrl: 'https://api-inference.huggingface.co',
    authMethod: 'Bearer token',
    capabilities: ['open models', 'embeddings', 'image', 'video', 'STT', 'model search'],
    asyncJobs: false,
    polling: false,
    webhooks: false,
    artifacts: true,
    defaultRoute: 'Open-source and specialist model universe',
    status: 'specialist',
    testRoute: '/api/admin/specialist/huggingface',
    userFacingVisibility: 'settings',
  },
  {
    name: 'Qwen / DashScope',
    key: 'qwen',
    envAliases: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    authMethod: 'Bearer token',
    capabilities: ['chat', 'code', 'reasoning', 'long context', 'multimodal', 'image', 'video'],
    asyncJobs: true,
    polling: true,
    webhooks: false,
    artifacts: true,
    defaultRoute: 'Low-cost reasoning, code, multimodal, and media specialist',
    status: 'specialist',
    testRoute: '/api/admin/provider-capability-test',
    userFacingVisibility: 'settings',
  },
  {
    name: 'Xiaomi MiMo',
    key: 'mimo',
    envAliases: ['MIMO_API_KEY'],
    baseUrl: 'Configured MiMo V2.5 compatible endpoint',
    authMethod: 'Bearer token',
    capabilities: ['chat', 'tools', 'STT', 'TTS', 'image understanding', 'audio understanding', 'video understanding', 'web search'],
    asyncJobs: false,
    polling: false,
    webhooks: false,
    artifacts: true,
    defaultRoute: 'Tool agents, speech, and multimodal understanding',
    status: 'specialist',
    testRoute: '/api/admin/provider-capability-test',
    userFacingVisibility: 'settings',
  },
  ...[
    ['Groq', 'groq', ['GROQ_API_KEY'], 'https://api.groq.com/openai/v1', ['fast chat', 'reasoning', 'code triage', 'STT', 'TTS', 'tools']],
    ['Together AI', 'together', ['TOGETHER_API_KEY'], 'https://api.together.xyz/v1', ['open models', 'image', 'video', 'vision', 'STT', 'TTS', 'embeddings', 'rerank', 'code sandbox']],
    ['Replicate / Fal', 'replicate-fal', ['REPLICATE_API_TOKEN', 'FAL_API_KEY'], 'Provider endpoints', ['specialist image', 'video', 'avatar', 'audio fallback']],
    ['GitHub', 'github', ['GITHUB_PAT'], 'https://api.github.com', ['repos', 'branches', 'commits', 'pull requests']],
    ['Redis', 'redis', ['REDIS_URL'], 'Configured Redis URL', ['queues', 'realtime state', 'retries']],
    ['Qdrant', 'qdrant', ['QDRANT_URL'], 'Configured Qdrant URL', ['vector memory', 'RAG', 'search']],
    ['Local Crawler', 'local-crawler', [], 'Local process', ['Playwright', 'Scrapy', 'Trafilatura']],
    ['ffmpeg', 'ffmpeg', [], 'Local binary', ['audio/video render', 'stitching', 'captions', 'conversion']],
    ['Rhubarb Lip Sync', 'rhubarb', [], 'Local binary', ['phoneme timing', 'avatar lip sync data']],
    ['Storage', 'storage', ['STORAGE_DRIVER', 'STORAGE_ROOT'], 'Local VPS or S3-compatible storage', ['artifacts', 'files', 'media']],
  ].map(([name, key, envAliases, baseUrl, capabilities]) => ({
    name: name as string,
    key: key as string,
    envAliases: envAliases as string[],
    baseUrl: baseUrl as string,
    authMethod: envAliases.length ? 'Configured credential' : 'Local runtime',
    capabilities: capabilities as string[],
    asyncJobs: key === 'redis' || key === 'replicate-fal',
    polling: key === 'replicate-fal',
    webhooks: key === 'github',
    artifacts: ['replicate-fal', 'storage', 'local-crawler', 'ffmpeg', 'rhubarb'].includes(key as string),
    defaultRoute: `${name} capability route`,
    status: ['Redis', 'Qdrant', 'Local Crawler', 'ffmpeg', 'Rhubarb Lip Sync', 'Storage'].includes(name as string) ? 'infrastructure' as const : 'specialist' as const,
    testRoute: '/api/admin/system/readiness',
    userFacingVisibility: (['Redis', 'Qdrant', 'Local Crawler', 'ffmpeg', 'Rhubarb Lip Sync', 'Storage'].includes(name as string) ? 'system' : 'settings') as 'system' | 'settings',
  })),
] as const

export const REQUIRED_AGENT_NAMES = [
  'Network Orchestrator Agent',
  'Command Router Agent',
  'Repo Audit Agent',
  'Coding Agent',
  'Code Review Agent',
  'Deployment Agent',
  'Product Architect Agent',
  'UX/UI Designer Agent',
  'Frontend Builder Agent',
  'Backend Builder Agent',
  'App Builder Agent',
  'Media Director Agent',
  'Song Producer Agent',
  'Movie Director Agent',
  'Avatar Producer Agent',
  'Voice Producer Agent',
  'Research Agent',
  'Marketing Agent',
  'Crypto/Trading Agent',
  'Automation Agent',
  'Memory/Learning Agent',
  'Runtime Truth Agent',
  'Security Agent',
  'Repair Agent',
  'GitHub Agent',
  'VPS Monitor Agent',
] as const
