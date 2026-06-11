import { NextRequest, NextResponse } from 'next/server'
import { scanContent } from '@/lib/content-filter'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { input?: string | string[] } | null
  if (!body?.input || (typeof body.input !== 'string' && !Array.isArray(body.input))) {
    return NextResponse.json({ error: 'input is required and must be a string or array of strings' }, { status: 400 })
  }

  const inputs = Array.isArray(body.input) ? body.input : [body.input]
  const results = inputs.map(input => {
    const result = scanContent(input)
    return {
      flagged: result.flagged,
      categories: Object.fromEntries(result.categories.map(category => [category, true])),
      message: result.message,
    }
  })

  return NextResponse.json({
    executed: true,
    provider: 'local-policy',
    model: 'content-filter',
    results,
    capability: 'moderation',
  })
}
