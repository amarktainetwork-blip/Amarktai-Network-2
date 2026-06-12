import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { ensureExecution, recordExecutionResponse, startExecution } from '@/lib/execution'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    query?: string
    depth?: 'shallow' | 'deep'
    providerOverride?: string
    modelOverride?: string
    appSlug?: string
    executionId?: string
  } | null

  if (!body?.query?.trim()) {
    return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const depth = body.depth === 'deep' ? 'deep' : 'shallow'
  const execution = ensureExecution({
    appSlug: body.appSlug || 'research',
    requestedCapability: 'research',
    prompt: body.query.trim(),
    action: 'generate',
    selectedProvider: body.providerOverride,
    selectedModel: body.modelOverride,
    metadata: { depth },
  }, body.executionId)
  startExecution(execution.executionId)
  const result = await executeCapability({
    input: `${depth === 'deep' ? 'Perform deep research' : 'Research'} and return a structured answer with source notes: ${body.query.trim()}`,
    capability: 'research',
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride,
    appId: body.appSlug || 'research',
    saveArtifact: true,
    metadata: { executionId: execution.executionId, depth },
  })

  const payload = {
    capability: depth === 'deep' ? 'deep_research' : 'research_search',
    executed: result.success,
    success: result.success,
    answer: result.output,
    provider: result.provider,
    model: result.model,
    artifactId: result.artifactId,
    jobId: result.jobId,
    status: result.status,
    depth,
    error: result.error,
    executionId: execution.executionId,
  }
  const executionResult = recordExecutionResponse(execution.executionId, payload)
  return NextResponse.json(
    { ...payload, execution: executionResult },
    { status: result.success ? 200 : 503 },
  )
}
