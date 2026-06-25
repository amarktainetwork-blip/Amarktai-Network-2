import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { input?: unknown }
  const input = body.input
  if (!input || (typeof input !== 'string' && !Array.isArray(input))) {
    return NextResponse.json(
      { error: 'input is required and must be a string or array of strings', capability: 'moderation' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    capability: 'moderation',
    executed: false,
    availabilityLevel: 'NOT_AVAILABLE',
    error: 'Dedicated moderation is not wired to an approved active provider.',
  }, { status: 501 })
}
