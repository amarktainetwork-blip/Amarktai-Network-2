/**
 * @module agent-system
 * @description Agent System for the AmarktAI Network.
 *
 * Real agent execution using the capability-router as the sole execution path.
 * Agents never call provider APIs directly.
 * Agents never hardcode models.
 * Agents never bypass permissions or budget routing.
 *
 * Supported agent types:
 *   marketing       — brand-aware copy, campaigns, brand/RAG context
 *   adult_creator   — adult-permissioned HF-only adult content workflows
 *   customer_service — RAG-backed answers with cited context
 *   research        — web/RAG ingestion, memory storage, structured output
 *   automation      — chained capability calls, scheduled workflows
 *
 * All agents call executeCapability() via the capability-router.
 * Provider/model selection is deferred to the runtime.
 *
 * Server-side only.
 */

import { executeCapability, type CapabilityRequest, type CapabilityResponse } from '@/lib/capability-router'
import { memoryEngine } from '@/lib/memory-capability'
import { brandMemoryEngine } from '@/lib/brand-memory'
import { queryRAG, ingestDocument } from '@/lib/rag-capability'

// ── Agent types ───────────────────────────────────────────────────────────────

export type AgentSystemType =
  | 'marketing'
  | 'adult_creator'
  | 'customer_service'
  | 'research'
  | 'automation'

export type AgentTaskStatus = 'idle' | 'running' | 'completed' | 'failed'

// ── Agent configuration ───────────────────────────────────────────────────────

export interface AgentConfig {
  agentType: AgentSystemType
  agentId: string
  appSlug: string
  workspaceId?: string
  brandId?: string
  /** Capability keys this agent is permitted to use */
  allowedCapabilities: string[]
  /** Budget mode — drives provider ordering */
  budget: 'cheap' | 'balanced' | 'premium'
  /** Quality tier preference */
  quality: 'basic' | 'standard' | 'high' | 'premium'
  /** Adult mode — required for adult_creator agent */
  adultMode?: boolean
  safeMode?: boolean
  /** Agent memory namespace */
  memoryNamespace?: string
  /** HF API key for RAG embeddings / adult capabilities */
  hfApiKey?: string
  /** Custom permissions beyond defaults */
  permissions?: string[]
}

// ── Validation ────────────────────────────────────────────────────────────────

const ALLOWED_PROVIDERS = new Set(['genx', 'huggingface', 'together', 'groq', 'mimo'])
const REMOVED_PROVIDERS = new Set([
  'qwen', 'dashscope', 'wanx', 'minimax', 'openai', 'gemini',
  'anthropic', 'openrouter', 'deepseek', 'moonshot', 'replicate',
  'cohere', 'nvidia', 'mistral',
])

export interface AgentValidationResult {
  valid: boolean
  error: string | null
}

export function validateAgentConfig(config: AgentConfig): AgentValidationResult {
  if (!config.appSlug || config.appSlug.trim().length === 0) {
    return { valid: false, error: 'appSlug is required' }
  }
  if (!config.agentId || config.agentId.trim().length === 0) {
    return { valid: false, error: 'agentId is required' }
  }
  if (!(['marketing', 'adult_creator', 'customer_service', 'research', 'automation'] as string[]).includes(config.agentType)) {
    return { valid: false, error: `Unsupported agentType: "${config.agentType}"` }
  }
  if (config.agentType === 'adult_creator' && !config.adultMode) {
    return { valid: false, error: 'adult_creator agent requires adultMode=true' }
  }
  if (config.allowedCapabilities.length === 0) {
    return { valid: false, error: 'allowedCapabilities must not be empty' }
  }
  return { valid: true, error: null }
}

export function assertNoRemovedProviders(providerKey: string): void {
  if (REMOVED_PROVIDERS.has(providerKey)) {
    throw new Error(`[agent-system] Removed provider "${providerKey}" must not be used. Allowed: ${[...ALLOWED_PROVIDERS].join(', ')}`)
  }
}

export function isAllowedProvider(providerKey: string): boolean {
  return ALLOWED_PROVIDERS.has(providerKey)
}

// ── Agent task ────────────────────────────────────────────────────────────────

export interface AgentTask {
  taskId: string
  agentType: AgentSystemType
  appSlug: string
  status: AgentTaskStatus
  steps: AgentTaskStep[]
  output: string | null
  artifacts: string[]
  error: string | null
  startedAt: Date
  completedAt: Date | null
  latencyMs: number | null
  metadata: Record<string, unknown>
}

export interface AgentTaskStep {
  stepId: string
  capability: string
  input: string
  output: string | null
  provider: string | null
  model: string | null
  success: boolean
  error: string | null
  latencyMs: number | null
}

function makeTaskId(): string {
  return `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeStepId(index: number): string {
  return `step_${index}_${Date.now().toString(36)}`
}

// ── Capability call guard ─────────────────────────────────────────────────────

/**
 * The only way agents may call capabilities.
 * Enforces: allowed capability list, no direct provider calls, no model hardcoding.
 */
async function agentCallCapability(
  config: AgentConfig,
  capability: string,
  input: string,
  meta?: Record<string, unknown>,
): Promise<CapabilityResponse> {
  if (!config.allowedCapabilities.includes(capability)) {
    return {
      success: false,
      capability,
      provider: null,
      model: null,
      outputType: 'text',
      output: null,
      fallbackUsed: false,
      error: `Agent "${config.agentId}" is not permitted to use capability "${capability}". Allowed: ${config.allowedCapabilities.join(', ')}`,
    }
  }

  const req: CapabilityRequest = {
    input,
    capability,
    appId: config.appSlug,
    adultMode: config.adultMode ?? false,
    safeMode: config.safeMode ?? false,
    metadata: {
      budget: config.budget,
      quality: config.quality,
      agentId: config.agentId,
      agentType: config.agentType,
      ...meta,
    },
  }

  return executeCapability(req)
}

// ── Marketing Agent ───────────────────────────────────────────────────────────

export interface MarketingAgentInput {
  task: 'campaign_brief' | 'copy_generation' | 'content_idea' | 'research'
  prompt: string
  brandId?: string
  targetAudience?: string
  tone?: string
  format?: string
}

export async function runMarketingAgent(
  config: AgentConfig,
  input: MarketingAgentInput,
): Promise<AgentTask> {
  const task: AgentTask = {
    taskId: makeTaskId(),
    agentType: 'marketing',
    appSlug: config.appSlug,
    status: 'running',
    steps: [],
    output: null,
    artifacts: [],
    error: null,
    startedAt: new Date(),
    completedAt: null,
    latencyMs: null,
    metadata: { task: input.task, brandId: input.brandId },
  }

  const start = Date.now()

  try {
    // Step 1: Load brand context if brandId provided
    let brandContext = ''
    if (input.brandId && config.brandId) {
      const brand = await brandMemoryEngine.get(config.appSlug, input.brandId)
      if (brand) {
        brandContext = `Brand: ${brand.brandName}. Voice: ${brand.voice}. Tone: ${brand.tone}. Audience: ${brand.audience}. Dos: ${brand.rules.dos.join(', ')}. Donts: ${brand.rules.donts.join(', ')}.`
      }
    }

    // Step 2: Load RAG context if available
    let ragContext = ''
    if (config.hfApiKey) {
      const ragResult = await queryRAG(input.prompt, {
        appSlug: config.appSlug,
        hfApiKey: config.hfApiKey,
        limit: 3,
      })
      if (ragResult.success && ragResult.context) {
        ragContext = ragResult.context
      }
    }

    // Step 3: Build enriched prompt
    const enrichedPrompt = [
      brandContext && `Brand context:\n${brandContext}`,
      ragContext && `Knowledge context:\n${ragContext}`,
      `Target audience: ${input.targetAudience ?? 'general'}`,
      `Tone: ${input.tone ?? 'professional'}`,
      `Format: ${input.format ?? 'structured text'}`,
      `Task: ${input.prompt}`,
    ].filter(Boolean).join('\n\n')

    // Step 4: Execute via capability-router (chat or research based on task)
    const capability = input.task === 'research' ? 'research' : 'chat'
    const stepId = makeStepId(0)
    const capResult = await agentCallCapability(config, capability, enrichedPrompt)

    task.steps.push({
      stepId,
      capability,
      input: enrichedPrompt,
      output: capResult.output,
      provider: capResult.provider,
      model: capResult.model,
      success: capResult.success,
      error: capResult.error ?? null,
      latencyMs: null,
    })

    if (!capResult.success || !capResult.output) {
      task.status = 'failed'
      task.error = capResult.error ?? 'Marketing agent: capability call returned no output'
    } else {
      task.status = 'completed'
      task.output = capResult.output

      // Step 5: Store result in agent memory
      await memoryEngine.store(
        { appSlug: config.appSlug, level: 'agent', scopeId: config.agentId },
        'knowledge',
        `marketing_${input.task}_${Date.now()}`,
        capResult.output,
        { importance: 0.7, tags: ['marketing', input.task] },
      )
    }
  } catch (err) {
    task.status = 'failed'
    task.error = err instanceof Error ? err.message : String(err)
  }

  task.completedAt = new Date()
  task.latencyMs = Date.now() - start
  return task
}

// ── Adult Creator Agent ───────────────────────────────────────────────────────

export interface AdultCreatorAgentInput {
  task: 'adult_text' | 'adult_image' | 'adult_avatar'
  prompt: string
  characterName?: string
  characterDescription?: string
  style?: string
}

export async function runAdultCreatorAgent(
  config: AgentConfig,
  input: AdultCreatorAgentInput,
): Promise<AgentTask> {
  const task: AgentTask = {
    taskId: makeTaskId(),
    agentType: 'adult_creator',
    appSlug: config.appSlug,
    status: 'running',
    steps: [],
    output: null,
    artifacts: [],
    error: null,
    startedAt: new Date(),
    completedAt: null,
    latencyMs: null,
    metadata: { task: input.task },
  }

  const start = Date.now()

  // Permission check — adult_creator requires adultMode
  if (!config.adultMode) {
    task.status = 'failed'
    task.error = 'adult_creator agent requires adultMode=true on the agent config'
    task.completedAt = new Date()
    task.latencyMs = Date.now() - start
    return task
  }

  // Only HuggingFace is allowed for adult generation
  // The capability-router enforces this — agent just calls the capability
  const capabilityMap: Record<string, string> = {
    adult_text: 'adult_text',
    adult_image: 'adult_image',
    adult_avatar: 'adult_avatar',
  }

  const capability = capabilityMap[input.task] ?? input.task

  try {
    const capResult = await agentCallCapability(config, capability, input.prompt, {
      characterName: input.characterName,
      characterDescription: input.characterDescription,
      style: input.style,
    })

    task.steps.push({
      stepId: makeStepId(0),
      capability,
      input: input.prompt,
      output: capResult.output,
      provider: capResult.provider,
      model: capResult.model,
      success: capResult.success,
      error: capResult.error ?? null,
      latencyMs: null,
    })

    // Validate provider was HuggingFace (enforced by router, double-check)
    if (capResult.success && capResult.provider && !['huggingface', null].includes(capResult.provider)) {
      task.status = 'failed'
      task.error = `adult_creator agent: expected huggingface provider, got "${capResult.provider}". Adult generation must use HuggingFace only.`
    } else if (!capResult.success) {
      task.status = 'failed'
      task.error = capResult.error ?? 'Adult creator capability returned failure'
    } else {
      task.status = 'completed'
      task.output = capResult.output
      if (capResult.output) task.artifacts.push(capResult.output)
    }
  } catch (err) {
    task.status = 'failed'
    task.error = err instanceof Error ? err.message : String(err)
  }

  task.completedAt = new Date()
  task.latencyMs = Date.now() - start
  return task
}

// ── Customer Service Agent ────────────────────────────────────────────────────

export interface CustomerServiceAgentInput {
  userMessage: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface CustomerServiceAgentOutput {
  answer: string
  sources: string[]
  citedContext: boolean
  escalationNeeded: boolean
}

export async function runCustomerServiceAgent(
  config: AgentConfig,
  input: CustomerServiceAgentInput,
): Promise<AgentTask> {
  const task: AgentTask = {
    taskId: makeTaskId(),
    agentType: 'customer_service',
    appSlug: config.appSlug,
    status: 'running',
    steps: [],
    output: null,
    artifacts: [],
    error: null,
    startedAt: new Date(),
    completedAt: null,
    latencyMs: null,
    metadata: {},
  }

  const start = Date.now()

  try {
    // Step 1: Query RAG for relevant context
    let ragContext = ''
    let sources: string[] = []
    let citedContext = false

    if (config.hfApiKey) {
      const ragResult = await queryRAG(input.userMessage, {
        appSlug: config.appSlug,
        hfApiKey: config.hfApiKey,
        limit: 5,
        minScore: 0.35,
      })
      if (ragResult.success && ragResult.context) {
        ragContext = ragResult.context
        sources = ragResult.sources
        citedContext = true
      }
    }

    // Step 2: Retrieve app memory context
    const memSearch = await memoryEngine.search(input.userMessage, {
      appSlug: config.appSlug,
      level: 'app',
      limit: 3,
    })
    const memContext = memSearch.map(r => r.entry.content).join('\n')

    // Step 3: Build prompt with context
    const history = input.conversationHistory
      ?.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') ?? ''

    const prompt = [
      'You are a helpful customer service assistant. Answer the user\'s question based on the provided context. If context is insufficient, say so clearly — do not fabricate answers.',
      ragContext && `Knowledge base context:\n${ragContext}`,
      memContext && `App context:\n${memContext}`,
      history && `Conversation history:\n${history}`,
      `User: ${input.userMessage}`,
    ].filter(Boolean).join('\n\n')

    // Step 4: Call chat capability through router
    const capResult = await agentCallCapability(config, 'chat', prompt)

    task.steps.push({
      stepId: makeStepId(0),
      capability: 'chat',
      input: input.userMessage,
      output: capResult.output,
      provider: capResult.provider,
      model: capResult.model,
      success: capResult.success,
      error: capResult.error ?? null,
      latencyMs: null,
    })

    if (!capResult.success || !capResult.output) {
      task.status = 'failed'
      task.error = capResult.error ?? 'Customer service agent: no response from capability'
    } else {
      const escalationNeeded = capResult.output.toLowerCase().includes('cannot help') ||
        capResult.output.toLowerCase().includes('insufficient context') ||
        capResult.output.toLowerCase().includes('escalate')

      const agentOutput: CustomerServiceAgentOutput = {
        answer: capResult.output,
        sources,
        citedContext,
        escalationNeeded,
      }

      task.status = 'completed'
      task.output = JSON.stringify(agentOutput)
      task.metadata = { citedContext, escalationNeeded, sourceCount: sources.length }
    }
  } catch (err) {
    task.status = 'failed'
    task.error = err instanceof Error ? err.message : String(err)
  }

  task.completedAt = new Date()
  task.latencyMs = Date.now() - start
  return task
}

// ── Research Agent ────────────────────────────────────────────────────────────

export interface ResearchAgentInput {
  query: string
  ingestUrls?: string[]
  storeFindings?: boolean
}

export async function runResearchAgent(
  config: AgentConfig,
  input: ResearchAgentInput,
): Promise<AgentTask> {
  const task: AgentTask = {
    taskId: makeTaskId(),
    agentType: 'research',
    appSlug: config.appSlug,
    status: 'running',
    steps: [],
    output: null,
    artifacts: [],
    error: null,
    startedAt: new Date(),
    completedAt: null,
    latencyMs: null,
    metadata: { query: input.query },
  }

  const start = Date.now()

  try {
    // Step 1: Ingest URLs if provided
    if (input.ingestUrls?.length && config.hfApiKey) {
      for (const url of input.ingestUrls.slice(0, 3)) { // cap at 3 URLs
        const docId = `research_${Buffer.from(url).toString('base64').slice(0, 20).replace(/[^a-z0-9]/gi, '_')}`
        // Use web scraping via scrape_website capability, then ingest into RAG
        const scrapeResult = await agentCallCapability(config, 'scrape_website', url)
        if (scrapeResult.success && scrapeResult.output) {
          const scraped = JSON.parse(scrapeResult.output) as { summary: string }
          await ingestDocument(docId, url, scraped.summary, 'website', {
            appSlug: config.appSlug,
            hfApiKey: config.hfApiKey,
          })
        }
        task.steps.push({
          stepId: makeStepId(task.steps.length),
          capability: 'scrape_website',
          input: url,
          output: scrapeResult.output,
          provider: scrapeResult.provider,
          model: scrapeResult.model,
          success: scrapeResult.success,
          error: scrapeResult.error ?? null,
          latencyMs: null,
        })
      }
    }

    // Step 2: RAG retrieval
    let ragContext = ''
    if (config.hfApiKey) {
      const ragResult = await queryRAG(input.query, {
        appSlug: config.appSlug,
        hfApiKey: config.hfApiKey,
        limit: 5,
      })
      if (ragResult.success && ragResult.context) ragContext = ragResult.context
    }

    // Step 3: Research via capability
    const researchPrompt = [
      'Conduct thorough research on the following query. Provide a structured, factual response with key findings, insights, and citations where available.',
      ragContext && `Available knowledge:\n${ragContext}`,
      `Research query: ${input.query}`,
    ].filter(Boolean).join('\n\n')

    const capResult = await agentCallCapability(config, 'research', researchPrompt)

    task.steps.push({
      stepId: makeStepId(task.steps.length),
      capability: 'research',
      input: input.query,
      output: capResult.output,
      provider: capResult.provider,
      model: capResult.model,
      success: capResult.success,
      error: capResult.error ?? null,
      latencyMs: null,
    })

    if (!capResult.success || !capResult.output) {
      task.status = 'failed'
      task.error = capResult.error ?? 'Research agent: no output from capability'
    } else {
      task.status = 'completed'
      task.output = capResult.output

      // Step 4: Store findings in memory if requested
      if (input.storeFindings !== false) {
        await memoryEngine.store(
          { appSlug: config.appSlug, level: 'agent', scopeId: config.agentId },
          'knowledge',
          `research_${Date.now()}`,
          capResult.output,
          { importance: 0.8, tags: ['research', 'findings'] },
        )
      }
    }
  } catch (err) {
    task.status = 'failed'
    task.error = err instanceof Error ? err.message : String(err)
  }

  task.completedAt = new Date()
  task.latencyMs = Date.now() - start
  return task
}

// ── Automation Agent ──────────────────────────────────────────────────────────

export interface AutomationStep {
  capability: string
  input: string
  dependsOn?: number // step index
  metadata?: Record<string, unknown>
}

export interface AutomationAgentInput {
  workflowName: string
  steps: AutomationStep[]
}

export async function runAutomationAgent(
  config: AgentConfig,
  input: AutomationAgentInput,
): Promise<AgentTask> {
  const task: AgentTask = {
    taskId: makeTaskId(),
    agentType: 'automation',
    appSlug: config.appSlug,
    status: 'running',
    steps: [],
    output: null,
    artifacts: [],
    error: null,
    startedAt: new Date(),
    completedAt: null,
    latencyMs: null,
    metadata: { workflowName: input.workflowName, totalSteps: input.steps.length },
  }

  const start = Date.now()
  const stepOutputs: (string | null)[] = []

  try {
    for (let i = 0; i < input.steps.length; i++) {
      const step = input.steps[i]

      // Resolve input — if step depends on a previous step's output, inject it
      let resolvedInput = step.input
      if (step.dependsOn !== undefined && stepOutputs[step.dependsOn]) {
        resolvedInput = `${step.input}\n\nPrevious step output:\n${stepOutputs[step.dependsOn]}`
      }

      const capResult = await agentCallCapability(config, step.capability, resolvedInput, step.metadata)
      const stepRecord: AgentTaskStep = {
        stepId: makeStepId(i),
        capability: step.capability,
        input: resolvedInput,
        output: capResult.output,
        provider: capResult.provider,
        model: capResult.model,
        success: capResult.success,
        error: capResult.error ?? null,
        latencyMs: null,
      }
      task.steps.push(stepRecord)
      stepOutputs.push(capResult.output)

      if (!capResult.success) {
        // Automation agent fails honestly when a step fails
        task.status = 'failed'
        task.error = `Step ${i + 1} (${step.capability}) failed: ${capResult.error ?? 'No output returned'}`
        task.completedAt = new Date()
        task.latencyMs = Date.now() - start
        return task
      }

      if (capResult.output) task.artifacts.push(capResult.output)
    }

    // All steps succeeded
    task.status = 'completed'
    task.output = stepOutputs.filter(Boolean).join('\n\n---\n\n')
    task.metadata = { ...task.metadata, stepsCompleted: task.steps.length }
  } catch (err) {
    task.status = 'failed'
    task.error = err instanceof Error ? err.message : String(err)
  }

  task.completedAt = new Date()
  task.latencyMs = Date.now() - start
  return task
}

// ── Agent orchestrator entry point ────────────────────────────────────────────

export type AgentRunInput =
  | { type: 'marketing'; input: MarketingAgentInput }
  | { type: 'adult_creator'; input: AdultCreatorAgentInput }
  | { type: 'customer_service'; input: CustomerServiceAgentInput }
  | { type: 'research'; input: ResearchAgentInput }
  | { type: 'automation'; input: AutomationAgentInput }

/**
 * Run any agent type through the unified orchestrator.
 * All agents use the capability-router. No direct provider calls.
 */
export async function runAgent(config: AgentConfig, run: AgentRunInput): Promise<AgentTask> {
  const validation = validateAgentConfig(config)
  if (!validation.valid) {
    return {
      taskId: makeTaskId(),
      agentType: config.agentType,
      appSlug: config.appSlug,
      status: 'failed',
      steps: [],
      output: null,
      artifacts: [],
      error: validation.error!,
      startedAt: new Date(),
      completedAt: new Date(),
      latencyMs: 0,
      metadata: {},
    }
  }

  switch (run.type) {
    case 'marketing': return runMarketingAgent(config, run.input)
    case 'adult_creator': return runAdultCreatorAgent(config, run.input)
    case 'customer_service': return runCustomerServiceAgent(config, run.input)
    case 'research': return runResearchAgent(config, run.input)
    case 'automation': return runAutomationAgent(config, run.input)
  }
}
