import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { capabilityHttpStatus } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  const forcedProvider = firstString(body, ['providerOverride', 'provider'])
  const forcedModel = firstString(body, ['modelOverride', 'model'])
  if (forcedProvider || forcedModel) {
    return NextResponse.json({
      error: 'Apps request capabilities only. Provider and model forcing is not allowed on this route.',
      rejected: { provider: forcedProvider ?? null, model: forcedModel ?? null },
    }, { status: 400 })
  }
  const input = firstString(body, ['query', 'input', 'prompt'])
  if (!input) return NextResponse.json({ error: 'A non-empty query is required.' }, { status: 400 })
  const documents = stringArray(body.documents).length
    ? stringArray(body.documents)
    : stringArray(body.sentences)
  if (!documents.length) return NextResponse.json({ error: 'documents must be a non-empty string array.' }, { status: 400 })
  const metadata = typeof body.metadata === 'object' && body.metadata !== null
    ? body.metadata as Record<string, unknown>
    : {}
  const result = await executeCapability({
    input,
    capability: 'rerank',
    appId: firstString(body, ['appSlug', 'appId']),
    workspaceId: firstString(body, ['workspaceId']),
    saveArtifact: false,
    traceId: firstString(body, ['traceId']),
    metadata: {
      ...metadata,
      documents,
      sentences: documents,
      executionId: firstString(body, ['executionId']) ?? metadata.executionId,
    },
  })
  return NextResponse.json(result, { status: capabilityHttpStatus(result) })
}

function firstString(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = body[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
    : []
}
