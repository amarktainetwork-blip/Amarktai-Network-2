import {
  CAPABILITY_ROUTER_CAPABILITIES,
  executeCapability,
  type CapabilityRouterCapability,
} from '@/lib/capability-router'
import { createArtifact, getArtifact, type ArtifactRecord } from '@/lib/artifact-store'
import { canViewArtifactUnderAppPolicy } from '@/lib/artifact-policy'
import { loadAppSafetyConfigFromDB } from '@/lib/content-filter'
import {
  completeExecution,
  createExecution,
  failExecution,
  getExecution,
  listExecutions,
  recordExecutionResponse,
  startExecution,
  updateExecution,
  type ExecutionAction,
  type ExecutionRecord,
} from '@/lib/execution'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export const COMMAND_CENTER_QUICK_ACTIONS = {
  chat: { capability: 'chat', action: 'generate' },
  research: { capability: 'research', action: 'generate' },
  image: { capability: 'image_generation', action: 'generate' },
  image_edit: { capability: 'image_edit', action: 'generate' },
  video: { capability: 'video_generation', action: 'generate' },
  music: { capability: 'music_generation', action: 'generate' },
  tts: { capability: 'tts', action: 'generate' },
  repo_plan: { capability: 'repo_edit', action: 'repo_scan' },
  app_brief: { capability: 'app_build', action: 'generate' },
  deploy_plan: { capability: 'deploy_plan', action: 'generate' },
  system_check: { capability: 'file_analysis', action: 'generate' },
} as const satisfies Record<
  string,
  { capability: CapabilityRouterCapability; action: ExecutionAction }
>

export interface CommandCenterRunInput {
  executionId?: string
  prompt?: string
  appSlug?: string
  capability?: string
  quickAction?: keyof typeof COMMAND_CENTER_QUICK_ACTIONS
  action?: ExecutionAction
  files?: string[]
  references?: string[]
  artifactIds?: string[]
  selectedProvider?: string
  selectedModel?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  metadata?: Record<string, unknown>
}

export interface CommandCenterResponse {
  executionId: string
  status: ExecutionRecord['status']
  readiness: string | null
  capability: CapabilityRouterCapability
  providerPlan: ExecutionRecord['providerPlan']
  modelPlan: ExecutionRecord['modelPlan']
  approval: ExecutionRecord['approval']
  job: ExecutionRecord['jobs'][number] | null
  jobs: ExecutionRecord['jobs']
  artifacts: ArtifactRecord[]
  result: unknown | null
  error: string | null
  execution: ExecutionRecord
}

export async function runCommandCenter(
  input: CommandCenterRunInput,
): Promise<CommandCenterResponse> {
  const existing = input.executionId ? getExecution(input.executionId) : null
  if (input.executionId && !existing) throw new Error('Execution not found.')

  const quickAction = input.quickAction
    ? COMMAND_CENTER_QUICK_ACTIONS[input.quickAction]
    : undefined
  const prompt = (existing?.input.prompt ?? input.prompt ?? '').trim()
  if (!prompt) throw new Error('prompt is required')

  const appSlug = existing?.appSlug ?? input.appSlug?.trim() ?? 'amarktai-network'
  const safety = await loadAppSafetyConfigFromDB(appSlug)
  const artifactContext = existing
    ? artifactContextFromExecution(existing)
    : await resolveArtifactContext(input.artifactIds ?? [])
  const files = existing?.input.files ?? uniqueStrings([
    ...(input.files ?? []),
    ...(input.references ?? []),
    ...artifactContext.map((item) => `artifact:${item.id}`),
  ])
  const requestedCapability =
    existing?.requestedCapability ??
    quickAction?.capability ??
    normalizeCapability(input.capability)
  const action = existing?.action ?? input.action ?? quickAction?.action ?? 'generate'

  let execution = existing ?? createExecution({
    appSlug,
    actor: { type: 'admin', label: 'Command Center' },
    requestedCapability,
    prompt,
    files,
    action,
    selectedProvider: input.selectedProvider,
    selectedModel: input.selectedModel,
    costMode: input.costMode,
    adultPolicy: safety.adultMode
      ? 'full_adult_app_mode'
      : safety.suggestiveMode
        ? 'suggestive'
        : 'off',
    metadata: {
      ...(input.metadata ?? {}),
      source: 'command_center',
      quickAction: input.quickAction ?? null,
      artifactIds: artifactContext.map((item) => item.id),
      reusedArtifacts: artifactContext,
    },
  })

  if (
    execution.status === 'blocked' ||
    execution.status === 'awaiting_approval' ||
    execution.status === 'cancelled'
  ) {
    return commandCenterResponse(execution)
  }
  if (existing && execution.approval.status !== 'approved' && execution.approval.required) {
    return commandCenterResponse(execution)
  }
  if (!['planned', 'running'].includes(execution.status)) {
    return commandCenterResponse(execution)
  }

  execution = startExecution(execution.executionId) ?? execution
  try {
    if (input.quickAction === 'system_check' || existing?.input.metadata.quickAction === 'system_check') {
      const status = await getSystemRuntimeStatus()
      const artifact = await createArtifact({
        appSlug,
        executionId: execution.executionId,
        type: 'report',
        subType: 'system_check',
        title: 'Command Center system check',
        description: 'Live runtime and provider readiness report.',
        capability: 'file_analysis',
        metadata: {
          executionId: execution.executionId,
          capability: 'file_analysis',
          source: 'command_center',
        },
        content: Buffer.from(JSON.stringify(status, null, 2)),
      })
      execution = completeExecution({
        executionId: execution.executionId,
        result: { success: true, readiness: 'READY', status, artifactId: artifact.id },
        artifact: {
          artifactId: artifact.id,
          type: artifact.type,
          url: artifact.previewUrl,
        },
      }) ?? execution
      return commandCenterResponse(execution)
    }

    const response = await executeCapability({
      input: promptWithArtifactContext(prompt, artifactContext),
      capability: execution.detectedCapability,
      files,
      appId: appSlug,
      providerOverride: input.selectedProvider,
      modelOverride: input.selectedModel,
      adultMode: safety.adultMode,
      safeMode: safety.safeMode,
      suggestiveMode: safety.suggestiveMode,
      saveArtifact: true,
      traceId: execution.executionId,
      metadata: {
        ...execution.input.metadata,
        executionId: execution.executionId,
        appId: appSlug,
        capability: execution.detectedCapability,
        source: 'command_center',
      },
    })
    execution = recordExecutionResponse(
      execution.executionId,
      response as unknown as Record<string, unknown>,
    ) ?? execution
    if (!response.success) {
      execution = updateExecution(execution.executionId, { result: response }) ?? execution
    }
  } catch (error) {
    execution = failExecution(
      execution.executionId,
      commandCenterErrorMessage(error),
    ) ?? execution
  }
  return commandCenterResponse(execution)
}

export async function getCommandCenterExecution(
  executionId: string,
): Promise<CommandCenterResponse | null> {
  const execution = getExecution(executionId)
  return execution ? commandCenterResponse(execution) : null
}

export async function listCommandCenterHistory(limit = 30): Promise<CommandCenterResponse[]> {
  return Promise.all(
    listExecutions({ limit: Math.min(Math.max(limit, 1), 100) })
      .filter((execution) =>
        execution.actor.label === 'Command Center' ||
        execution.input.metadata.source === 'command_center',
      )
      .map(commandCenterResponse),
  )
}

async function commandCenterResponse(
  execution: ExecutionRecord,
): Promise<CommandCenterResponse> {
  const artifacts = (
    await Promise.all(
      execution.artifacts.map((link) => getArtifact(link.artifactId).catch(() => null)),
    )
  ).filter((artifact): artifact is ArtifactRecord => artifact !== null)
  return {
    executionId: execution.executionId,
    status: execution.status,
    readiness: responseReadiness(execution),
    capability: execution.detectedCapability,
    providerPlan: execution.providerPlan,
    modelPlan: execution.modelPlan,
    approval: execution.approval,
    job: execution.jobs.at(-1) ?? null,
    jobs: execution.jobs,
    artifacts,
    result: execution.result,
    error: execution.error,
    execution,
  }
}

function responseReadiness(execution: ExecutionRecord) {
  if (execution.result && typeof execution.result === 'object') {
    const readiness = (execution.result as { readiness?: unknown }).readiness
    if (typeof readiness === 'string') return readiness
  }
  return execution.status === 'blocked' ? 'BLOCKED' : null
}

export function commandCenterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/DATABASE_URL|prisma\.artifact|artifact metadata storage/i.test(message)) {
    return 'Artifact metadata storage is not configured.'
  }
  if (/artifact storage is not ready/i.test(message)) {
    return 'Artifact storage is not configured.'
  }
  return message || 'Command Center execution failed.'
}

async function resolveArtifactContext(ids: string[]) {
  const artifacts = await Promise.all(ids.map((id) => getArtifact(id).catch(() => null)))
  const visible = []
  for (const artifact of artifacts) {
    if (
      artifact &&
      artifact.status === 'completed' &&
      await canViewArtifactUnderAppPolicy(artifact)
    ) {
      visible.push(reusableArtifactSummary(artifact))
    }
  }
  return visible
}

function artifactContextFromExecution(execution: ExecutionRecord) {
  const value = execution.input.metadata.reusedArtifacts
  return Array.isArray(value)
    ? value.filter(isReusableArtifactSummary)
    : []
}

function reusableArtifactSummary(artifact: ArtifactRecord) {
  return {
    id: artifact.id,
    title: artifact.title,
    type: artifact.type,
    capability: artifact.capability,
    appSlug: artifact.appSlug,
    previewUrl: artifact.previewUrl,
  }
}

function isReusableArtifactSummary(
  value: unknown,
): value is ReturnType<typeof reusableArtifactSummary> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string',
  )
}

function promptWithArtifactContext(
  prompt: string,
  artifacts: ReturnType<typeof reusableArtifactSummary>[],
) {
  if (!artifacts.length) return prompt
  const references = artifacts
    .map((artifact) => `${artifact.title} (${artifact.type}, ${artifact.id})`)
    .join('; ')
  return `${prompt}\n\nReusable artifact context: ${references}`
}

function normalizeCapability(value?: string) {
  return value && CAPABILITY_ROUTER_CAPABILITIES.includes(
    value as CapabilityRouterCapability,
  )
    ? value as CapabilityRouterCapability
    : undefined
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
