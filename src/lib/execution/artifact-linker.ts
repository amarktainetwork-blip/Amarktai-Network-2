import type {
  ExecutionArtifactLink,
  ExecutionJobLink,
} from '@/lib/execution/contracts'
import { getExecution, updateExecution } from '@/lib/execution/execution-store'

export function linkExecutionArtifact(
  executionId: string,
  artifact: Omit<ExecutionArtifactLink, 'createdAt'>,
) {
  const execution = getExecution(executionId)
  if (!execution) return null
  if (execution.artifacts.some((entry) => entry.artifactId === artifact.artifactId)) {
    return execution
  }
  return updateExecution(executionId, {
    artifacts: [
      ...execution.artifacts,
      { ...artifact, createdAt: new Date().toISOString() },
    ],
  })
}

export function linkExecutionJob(executionId: string, job: ExecutionJobLink) {
  const execution = getExecution(executionId)
  if (!execution) return null
  const jobs = execution.jobs.filter((entry) => entry.jobId !== job.jobId)
  return updateExecution(executionId, { jobs: [...jobs, job] })
}
