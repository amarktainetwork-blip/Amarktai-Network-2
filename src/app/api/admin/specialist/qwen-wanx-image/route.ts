import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { runQwenWanxImage } from '@/lib/specialist-provider-routes'

const schema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.string().min(1).optional(),
  size: z.string().min(3).optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid Qwen Wanx image request', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await runQwenWanxImage(parsed.data)
  return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 409 })
}
