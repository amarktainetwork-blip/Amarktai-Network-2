import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { runMiniMaxTts } from '@/lib/specialist-provider-routes'

const schema = z.object({
  text: z.string().min(1).max(2000),
  model: z.string().min(1).optional(),
  voiceId: z.string().min(1).optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid MiniMax/Mimo TTS request', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await runMiniMaxTts(parsed.data)
  if (result.bytes) {
    return new NextResponse(result.bytes, {
      status: result.ok ? 200 : 409,
      headers: {
        'Content-Type': result.contentType ?? 'audio/mpeg',
        'X-Provider': result.provider,
        'X-Model': result.model,
        'X-Capability': result.capability,
        'X-Latency-Ms': String(result.latencyMs),
      },
    })
  }

  return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 409 })
}
