import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { runHuggingFaceInference } from '@/lib/specialist-provider-routes'

const schema = z.object({
  modelId: z.string().min(1).optional(),
  endpointUrl: z.string().url().optional(),
  inputs: z.unknown(),
  capability: z.string().min(1).default('huggingface_inference'),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid Hugging Face inference request', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await runHuggingFaceInference({
    modelId: parsed.data.modelId,
    endpointUrl: parsed.data.endpointUrl,
    inputs: parsed.data.inputs,
    capability: parsed.data.capability,
  })

  if (result.bytes) {
    return new NextResponse(result.bytes, {
      status: result.ok ? 200 : 409,
      headers: {
        'Content-Type': result.contentType ?? 'application/octet-stream',
        'X-Provider': result.provider,
        'X-Model': result.model,
        'X-Capability': result.capability,
        'X-Latency-Ms': String(result.latencyMs),
      },
    })
  }

  return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 409 })
}
