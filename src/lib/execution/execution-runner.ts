import { appendRecord, generateId, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { planExecution } from '@/lib/execution/task-planner'
import {
  appendExecutionEvent,
  findExecutionByApprovalId,
  getExecution,
  saveExecution,
  updateExecution,
} from '@/lib/execution/execution-store'
import { linkExecutionArtifact, linkExecutionJob } from '@/lib/execution/artifact-linker'
import type {
  CreateExecutionInput,
  ExecutionRecord,
  ExecutionArtifactLink,
  ExecutionJobLink,
} from '@/lib/execution/contracts'

interface ExecutionApprovalRecord {
  id: string
  type: string
  title: string
  description: string
  app: string
  agent: string
  risk: string
  requestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  executionId: string
  createdAt: string
  auditLog: Array<{ action: string; by: string; at: string; note?: string }>
}

export function createExecution(input: CreateExecutionInput): ExecutionRecord {
  const plan = planExecution(input)
  const executionId = generateId()
  const now = new Date().toISOString()
  let approvalId: string | null = null

  if (plan.approval.required) {
    const approval = appendRecord<ExecutionApprovalRecord>(LOCAL_STORE_FILES.approvals, {
      id: generateId(),
      type: plan.action,
      title: `Approve ${plan.action.replace(/_/g, ' ')}`,
      description: plan.approval.reason ?? `Approval required for ${plan.detectedCapability}.`,
      app: input.appSlug ?? input.appId ?? 'dashboard',
      agent: input.actor?.label ?? input.actor?.type ?? 'system',
      risk: plan.riskLevel,
      requestedBy: input.actor?.id ?? input.actor?.label ?? 'admin',
      status: 'pending',
      executionId,
      createdAt: now,
      auditLog: [{ action: 'created', by: input.actor?.id ?? 'system', at: now }],
    })
    approvalId = approval.id
  }

  const status = plan.blockedReason
    ? 'blocked'
    : plan.approval.required
      ? 'awaiting_approval'
      : 'planned'
  const record = saveExecution({
    executionId,
    appSlug: input.appSlug ?? input.appId ?? 'dashboard',
    appId: input.appId ?? null,
    actor: input.actor ?? { type: 'system', label: 'AmarktAI' },
    requestedCapability: plan.requestedCapability,
    detectedCapability: plan.detectedCapability,
    action: plan.action,
    input: {
      prompt: input.prompt,
      files: input.files ?? [],
      metadata: input.metadata ?? {},
    },
    providerPlan: plan.providerPlan,
    modelPlan: plan.modelPlan,
    approval: { ...plan.approval, approvalId },
    riskLevel: plan.riskLevel,
    estimatedCostUsd: plan.estimatedCostUsd,
    status,
    jobs: [],
    artifacts: [],
    events: [
      {
        id: `${executionId}:1`,
        type: plan.blockedReason ? 'blocked' : 'planned',
        message: plan.blockedReason ?? 'Execution plan created.',
        level: plan.blockedReason ? 'warning' : 'info',
        at: now,
      },
    ],
    result: null,
    error: plan.blockedReason,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  })
  return record
}

export function ensureExecution(
  input: CreateExecutionInput,
  executionId?: string | null,
): ExecutionRecord {
  return (executionId ? getExecution(executionId) : null) ?? createExecution(input)
}

export function startExecution(executionId: string): ExecutionRecord | null {
  const execution = getExecution(executionId)
  if (!execution) return null
  if (execution.approval.status === 'pending' || execution.status === 'blocked') {
    return execution
  }
  const updated = updateExecution(executionId, { status: 'running', error: null })
  appendExecutionEvent(executionId, {
    type: 'started',
    message: 'Execution started.',
    level: 'info',
  })
  return updated
}

export function completeExecution(input: {
  executionId: string
  result: unknown
  artifact?: Omit<ExecutionArtifactLink, 'createdAt'>
  job?: ExecutionJobLink
}): ExecutionRecord | null {
  if (input.job) linkExecutionJob(input.executionId, input.job)
  if (input.artifact?.artifactId) linkExecutionArtifact(input.executionId, input.artifact)
  const completedAt = new Date().toISOString()
  const updated = updateExecution(input.executionId, {
    status: 'completed',
    result: input.result,
    error: null,
    completedAt,
  })
  appendExecutionEvent(input.executionId, {
    type: 'completed',
    message: 'Execution completed.',
    level: 'info',
  })
  return updated
}

export function failExecution(executionId: string, error: string): ExecutionRecord | null {
  const updated = updateExecution(executionId, {
    status: 'failed',
    error,
    completedAt: new Date().toISOString(),
  })
  appendExecutionEvent(executionId, {
    type: 'failed',
    message: error,
    level: 'error',
  })
  return updated
}

export function recordExecutionResponse(
  executionId: string,
  response: Record<string, unknown>,
): ExecutionRecord | null {
  const jobId = typeof response.jobId === 'string' ? response.jobId : null
  const providerJobId =
    typeof response.providerJobId === 'string' ? response.providerJobId : null
  const artifactId =
    typeof response.artifactId === 'string' ? response.artifactId : null
  const success = response.success === true || response.executed === true
  const status = String(response.jobStatus ?? response.status ?? '')
  const isPending = Boolean(jobId && ['pending', 'processing', 'queued'].includes(status))

  if (jobId) {
    linkExecutionJob(executionId, {
      jobId,
      providerJobId,
      status: status || undefined,
      pollUrl: typeof response.pollUrl === 'string' ? response.pollUrl : null,
    })
  }
  if (isPending) {
    return updateExecution(executionId, {
      status: 'queued',
      result: response,
      error: null,
    })
  }
  if (success) {
    return completeExecution({
      executionId,
      result: response,
      artifact: artifactId
        ? {
            artifactId,
            url:
              typeof response.storageUrl === 'string'
                ? response.storageUrl
                : typeof response.mediaUrl === 'string'
                  ? response.mediaUrl
                  : null,
          }
        : undefined,
    })
  }
  return failExecution(
    executionId,
    String(response.error ?? response.blocker ?? 'Execution failed.'),
  )
}

export function resolveExecutionApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
): ExecutionRecord | null {
  const execution = findExecutionByApprovalId(approvalId)
  if (!execution) return null
  const rejected = decision === 'rejected'
  const updated = updateExecution(execution.executionId, {
    approval: { ...execution.approval, status: decision },
    status: rejected ? 'cancelled' : 'planned',
    error: rejected ? 'Execution approval was rejected.' : null,
    completedAt: rejected ? new Date().toISOString() : null,
  })
  appendExecutionEvent(execution.executionId, {
    type: `approval_${decision}`,
    message: `Execution approval ${decision}.`,
    level: rejected ? 'warning' : 'info',
  })
  return updated
}
