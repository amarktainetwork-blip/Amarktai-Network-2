import {
  appendRecord,
  findRecord,
  listRecords,
  LOCAL_STORE_FILES,
  updateRecord,
} from '@/lib/local-json-store'
import type {
  ExecutionEvent,
  ExecutionRecord,
  ExecutionApprovalStatus,
  ExecutionJobStatus,
} from '@/lib/execution/contracts'

export function saveExecution(record: Omit<ExecutionRecord, 'id'>): ExecutionRecord {
  return appendRecord<ExecutionRecord>(LOCAL_STORE_FILES.executions, {
    ...record,
    id: record.executionId,
  })
}

export function getExecution(executionId: string): ExecutionRecord | null {
  return findRecord<ExecutionRecord>(LOCAL_STORE_FILES.executions, executionId)
}

export function listExecutions(options: {
  status?: ExecutionJobStatus
  approvalStatus?: ExecutionApprovalStatus
  limit?: number
} = {}): ExecutionRecord[] {
  return listRecords<ExecutionRecord>(LOCAL_STORE_FILES.executions)
    .filter((record) => !options.status || record.status === options.status)
    .filter(
      (record) =>
        !options.approvalStatus || record.approval.status === options.approvalStatus,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, options.limit ?? 100)
}

export function updateExecution(
  executionId: string,
  updates: Partial<Omit<ExecutionRecord, 'id' | 'executionId'>>,
): ExecutionRecord | null {
  return updateRecord<ExecutionRecord>(LOCAL_STORE_FILES.executions, executionId, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export function appendExecutionEvent(
  executionId: string,
  event: Omit<ExecutionEvent, 'id' | 'at'>,
): ExecutionRecord | null {
  const execution = getExecution(executionId)
  if (!execution) return null
  const at = new Date().toISOString()
  return updateExecution(executionId, {
    events: [
      ...execution.events,
      {
        ...event,
        id: `${executionId}:${execution.events.length + 1}`,
        at,
      },
    ],
  })
}

export function findExecutionByApprovalId(approvalId: string): ExecutionRecord | null {
  return (
    listRecords<ExecutionRecord>(LOCAL_STORE_FILES.executions).find(
      (record) => record.approval.approvalId === approvalId,
    ) ?? null
  )
}
