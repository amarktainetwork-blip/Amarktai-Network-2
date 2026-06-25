import { NextRequest, NextResponse } from 'next/server'

const MAX_QUERY_LENGTH = 4000

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { query?: unknown; depth?: unknown }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  const depth = typeof body.depth === 'string' ? body.depth : 'shallow'

  if (!query) {
    return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: `query must be ${MAX_QUERY_LENGTH} characters or less` }, { status: 400 })
  }

  if (!['shallow', 'deep'].includes(depth)) {
    return NextResponse.json({ error: "depth must be 'shallow' or 'deep'" }, { status: 400 })
  }

  return NextResponse.json({
    capability: depth === 'deep' ? 'deep_research' : 'research_search',
    executed: false,
    availabilityLevel: 'NOT_AVAILABLE',
    error: 'Research generation is not wired to an approved active provider.',
  }, { status: 501 })
}
