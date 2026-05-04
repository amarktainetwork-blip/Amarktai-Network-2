import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { streamUniversalProvider, listUniversalProviders } from '@/lib/universal-provider-call'

const testSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1).optional(),
  timeoutMs: z.number().min(5_000).max(45_000).optional().default(15_000),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    success: true,
    providers: listUniversalProviders(),
    purpose: 'Use POST to verify a provider streams quickly enough for AmarktAI Assistant/live conversations.',
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid provider stream test request', details: parsed.error.flatten() }, { status: 422 })
  }

  const startedAt = Date.now()
  let firstTokenMs: number | undefined
  let tokenCount = 0
  let sample = ''
  let error = ''

  const result = await streamUniversalProvider({
    providerKey: parsed.data.provider,
    model: parsed.data.modelId ?? 'custom:model-id',
    message: 'Reply with exactly one short sentence confirming streaming works.',
    systemPrompt: 'You are a low-latency streaming health test. Reply briefly.',
    maxTokens: 80,
    temperature: 0.1,
    timeoutMs: parsed.data.timeoutMs,
  }, (event) => {
    if (event.type === 'token' && event.content) {
      tokenCount += 1
      if (firstTokenMs === undefined) firstTokenMs = event.firstTokenMs ?? Date.now() - startedAt
      sample += event.content
    }
    if (event.type === 'error') error = event.error ?? 'stream error'
  })

  const latencyMs = Date.now() - startedAt
  const passed = result.ok && tokenCount > 0 && (firstTokenMs ?? Number.MAX_SAFE_INTEGER) <= parsed.data.timeoutMs

  return NextResponse.json({
    success: passed,
    status: passed ? 'passed' : 'failed',
    provider: result.providerKey,
    model: result.model,
    latencyMs,
    firstTokenMs: firstTokenMs ?? null,
    tokenCount,
    sample: sample.slice(0, 500),
    error: result.error ?? (error || null),
    thresholds: {
      timeoutMs: parsed.data.timeoutMs,
      targetFirstTokenMs: 5000,
    },
    recommendation: passed
      ? 'Provider is suitable for AmarktAI Assistant/live conversation streaming.'
      : 'Do not use this provider as a live conversation default until the stream test passes.',
  }, { status: passed ? 200 : 409 })
}
