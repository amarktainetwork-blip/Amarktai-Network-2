import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import {
  ensureExecution,
  recordExecutionResponse,
  startExecution,
} from '@/lib/execution'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    model?: string
    modelOverride?: string
    providerOverride?: string
    appSlug?: string
    executionId?: string
    qualityTier?: 'cheap' | 'balanced' | 'premium' | 'auto'
  } | null

  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 })
  }

  const execution = ensureExecution({
    appSlug: body.appSlug || 'amarktai-network',
    requestedCapability: 'image_generation',
    prompt: body.prompt.trim(),
    action: 'generate',
    selectedProvider: body.providerOverride,
    selectedModel: body.modelOverride ?? body.model,
    costMode: body.qualityTier === 'auto' ? 'balanced' : body.qualityTier,
  }, body.executionId)
  startExecution(execution.executionId)
  const result = await executeCapability({
    input: body.prompt.trim(),
    capability: 'image_generation',
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride ?? body.model,
    qualityTier: body.qualityTier,
    appId: body.appSlug || 'amarktai-network',
    saveArtifact: true,
    metadata: { executionId: execution.executionId },
  })

  const payload = {
      executed: result.success,
      success: result.success,
      imageUrl: result.output?.startsWith('http') ? result.output : undefined,
      imageBase64: result.output?.startsWith('data:image/') ? result.output : undefined,
      jobId: result.jobId,
      status: result.status,
      provider: result.provider,
      model: result.model,
      artifactId: result.artifactId,
      error: result.error,
      code: result.success ? undefined : 'no_eligible_image_model',
      capability: 'image_generation',
      executionId: execution.executionId,
    }
  const executionResult = recordExecutionResponse(execution.executionId, payload)
  return NextResponse.json(
    { ...payload, execution: executionResult },
    { status: result.success ? 200 : 503 },
  )
}
