import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { runMiniMaxTts } from '@/lib/specialist-provider-routes'
import { saveMediaArtifact } from '@/lib/media-artifacts'
import { recordProviderResult } from '@/lib/provider-result-log'

const schema = z.object({
  text: z.string().min(1).max(2000),
  model: z.string().min(1).optional(),
  voiceId: z.string().min(1).optional(),
  appSlug: z.string().min(1).optional().default('amarktai-network'),
  saveArtifact: z.boolean().optional().default(true),
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
  const artifact = parsed.data.saveArtifact && result.ok && result.bytes
    ? await saveMediaArtifact({
        appSlug: parsed.data.appSlug,
        provider: result.provider,
        model: result.model,
        capability: result.capability,
        contentType: result.contentType ?? 'audio/mpeg',
        bytes: result.bytes,
        metadata: { textPreview: parsed.data.text.slice(0, 160), voiceId: parsed.data.voiceId, latencyMs: result.latencyMs },
      })
    : null

  await recordProviderResult({
    appSlug: parsed.data.appSlug,
    provider: result.provider,
    model: result.model,
    capability: result.capability,
    success: result.ok,
    executed: result.executed,
    latencyMs: result.latencyMs,
    contentType: result.contentType,
    artifactId: artifact?.id,
    artifactPath: artifact?.publicPath,
    error: result.error,
    metadata: { voiceId: parsed.data.voiceId, textLength: parsed.data.text.length },
  }).catch(() => null)

  if (result.bytes) {
    return new NextResponse(result.bytes, {
      status: result.ok ? 200 : 409,
      headers: {
        'Content-Type': result.contentType ?? 'audio/mpeg',
        'X-Provider': result.provider,
        'X-Model': result.model,
        'X-Capability': result.capability,
        'X-Latency-Ms': String(result.latencyMs),
        ...(artifact ? { 'X-Artifact-Id': artifact.id, 'X-Artifact-Path': artifact.publicPath } : {}),
      },
    })
  }

  return NextResponse.json({ success: result.ok, ...result, artifact }, { status: result.ok ? 200 : 409 })
}
