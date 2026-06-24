import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import { callUniversalProvider } from '@/lib/universal-provider-call'
import { runHuggingFaceInference } from '@/lib/specialist-provider-routes'

const testSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1).optional(),
  capabilityId: z.string().min(1),
  prompt: z.string().max(4000).optional(),
  endpointUrl: z.string().url().optional(),
})

const EXECUTABLE_TEXT_CAPABILITIES = new Set([
  'text_generation',
  'question_answering',
  'summarization',
  'translation',
  'text_classification',
  'zero_shot_classification',
  'table_question_answering',
  'document_question_answering',
  'image_text_to_text',
  'visual_question_answering',
  'repo_coding_agent',
])

export const dynamic = 'force-dynamic'

async function specialistTest(provider: string, capabilityId: string, modelId: string | undefined, prompt: string, endpointUrl?: string) {
  if (provider === 'huggingface') {
    const result = await runHuggingFaceInference({
      modelId,
      endpointUrl,
      inputs: prompt,
      capability: capabilityId,
      timeoutMs: 45_000,
    })
    return result
  }

  return null
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid provider capability test request', details: parsed.error.flatten() }, { status: 422 })
  }

  const { provider, capabilityId } = parsed.data
  const capability = getCapabilityDefinition(capabilityId)
  if (!capability) {
    return NextResponse.json({ success: false, error: `Unknown capability: ${capabilityId}` }, { status: 404 })
  }

  const prompt = parsed.data.prompt ?? `Provider capability test. In one short sentence, confirm you can handle ${capability.label}.`

  if (!EXECUTABLE_TEXT_CAPABILITIES.has(capabilityId)) {
    const specialist = await specialistTest(provider, capabilityId, parsed.data.modelId, prompt, parsed.data.endpointUrl)
    if (specialist) {
      const audioOrBinary = specialist.bytes ? Buffer.byteLength(Buffer.from(specialist.bytes)) : 0
      return NextResponse.json({
        success: specialist.ok,
        executed: specialist.executed,
        status: specialist.ok ? 'passed' : 'failed',
        provider: specialist.provider,
        model: specialist.model,
        capability,
        latencyMs: specialist.latencyMs,
        contentType: specialist.contentType,
        bytes: audioOrBinary,
        json: specialist.json,
        text: specialist.text,
        error: specialist.error,
      }, { status: specialist.ok ? 200 : 409 })
    }

    return NextResponse.json({
      success: true,
      executed: false,
      status: 'needs_specialist_route',
      provider,
      capability,
      blocker: `Capability "${capability.label}" requires a specialist route and cannot be proven by the generic text provider caller yet.`,
      nextAction: 'Wire the provider-specific media/voice/video/task endpoint, then update this test to execute it.',
    })
  }

  const result = await callUniversalProvider({
    providerKey: provider,
    model: parsed.data.modelId ?? 'custom:model-id',
    message: prompt,
    systemPrompt: 'You are running an Amarktai Network provider capability test. Reply briefly and truthfully.',
    maxTokens: 200,
    temperature: 0.1,
  })

  return NextResponse.json({
    success: result.ok,
    executed: true,
    status: result.ok ? 'passed' : 'failed',
    provider: result.providerKey,
    model: result.model,
    capability,
    output: result.output,
    error: result.error,
    latencyMs: result.latencyMs,
  }, { status: result.ok ? 200 : 409 })
}
