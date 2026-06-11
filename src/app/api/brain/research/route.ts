import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    query?: string
    depth?: 'shallow' | 'deep'
    providerOverride?: string
    modelOverride?: string
  } | null

  if (!body?.query?.trim()) {
    return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }

  const depth = body.depth === 'deep' ? 'deep' : 'shallow'
  const result = await executeCapability({
    input: `${depth === 'deep' ? 'Perform deep research' : 'Research'} and return a structured answer with source notes: ${body.query.trim()}`,
    capability: 'research',
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride,
    saveArtifact: true,
  })

  return NextResponse.json(
    {
      capability: depth === 'deep' ? 'deep_research' : 'research_search',
      executed: result.success,
      answer: result.output,
      provider: result.provider,
      model: result.model,
      artifactId: result.artifactId,
      depth,
      error: result.error,
    },
    { status: result.success ? 200 : 503 },
  )
}
