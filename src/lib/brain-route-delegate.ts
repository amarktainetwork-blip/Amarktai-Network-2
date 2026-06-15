import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import type {
  CapabilityResponse,
  CapabilityRouterCapability,
} from '@/lib/capability-contracts'

export async function delegateJsonCapability(
  request: NextRequest,
  options: {
    capability: CapabilityRouterCapability
    inputFields?: string[]
    adult?: boolean
    saveArtifact?: boolean
  },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  const input = firstString(body, options.inputFields ?? ['input', 'prompt', 'text', 'query'])
  if (!input) return NextResponse.json({ error: 'A non-empty input is required.' }, { status: 400 })
  const files = [
    ...stringArray(body.files),
    ...['image', 'imageUrl', 'audio', 'audioUrl', 'video', 'videoUrl', 'document', 'documentUrl']
      .flatMap((key) => typeof body[key] === 'string' && body[key] ? [String(body[key])] : []),
  ]
  const metadata = typeof body.metadata === 'object' && body.metadata !== null
    ? body.metadata as Record<string, unknown>
    : {}
  const result = await executeCapability({
    input,
    capability: options.capability,
    files: files.length ? files : undefined,
    appId: firstString(body, ['appSlug', 'appId']),
    workspaceId: firstString(body, ['workspaceId']),
    adultMode: options.adult || body.adultMode === true,
    safeMode: options.adult ? false : body.safeMode !== false,
    suggestiveMode: body.suggestiveMode === true,
    saveArtifact: options.saveArtifact ?? true,
    traceId: firstString(body, ['traceId']),
    metadata: {
      ...metadata,
      executionId: firstString(body, ['executionId']) ?? metadata.executionId,
      routingProfile: body.routingProfile ?? body.qualityTier ?? metadata.routingProfile,
      ignoredProviderPreference: firstString(body, ['providerOverride', 'provider']) ?? null,
      ignoredModelPreference: firstString(body, ['modelOverride', 'model']) ?? null,
    },
  })
  return NextResponse.json(result, { status: capabilityHttpStatus(result) })
}

export function capabilityHttpStatus(result: CapabilityResponse): number {
  if (result.success) return 200
  if (result.readiness === 'NEEDS_INPUT') return 400
  if (result.readiness === 'BLOCKED') return 403
  if (result.error_category === 'no_route_found') return 503
  if (result.readiness === 'NEEDS_CONFIGURATION' || result.readiness === 'UNAVAILABLE') return 503
  return 502
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
