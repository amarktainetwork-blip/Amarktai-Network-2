import { NextRequest, NextResponse } from 'next/server'
import { ensureExecution, recordExecutionResponse, startExecution } from '@/lib/execution'
import { researchRuntime } from '@/lib/research-runtime'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    query?: string
    depth?: 'shallow' | 'deep'
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
    metadata: { depth },
  }, body.executionId)
  startExecution(execution.executionId)
  const result = await researchRuntime.execute({
    query: body.query.trim(),
    appSlug: body.appSlug || 'research',
    depth,
    executionId: execution.executionId,
  })

  const payload = {
    capability: depth === 'deep' ? 'deep_research' : 'research_search',
    executed: result.success,
    success: result.success,
    answer: result.output,
    provider: result.provider,
    model: result.model,
    artifactId: result.artifactId,
    artifactUrl: result.artifactUrl,
    jobId: result.jobId,
    providerJobId: result.providerJobId,
    pollUrl: result.pollUrl,
    status: result.status,
    readiness: result.readiness,
    providerAttempts: result.providerAttempts,
    warning: result.warning,
    depth,
    error: result.error,
    diagnostics: result.diagnostics,
    executionId: execution.executionId,
  }
  const executionResult = recordExecutionResponse(execution.executionId, payload)
  return NextResponse.json(
    { ...payload, execution: executionResult },
    { status: result.success ? 200 : 503 },
  )
}
