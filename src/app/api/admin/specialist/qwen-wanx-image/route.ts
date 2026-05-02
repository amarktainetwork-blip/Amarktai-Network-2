import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { runQwenWanxImage } from '@/lib/specialist-provider-routes'
import { saveJsonArtifact } from '@/lib/media-artifacts'
import { recordProviderResult } from '@/lib/provider-result-log'

const schema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.string().min(1).optional(),
  size: z.string().min(3).optional(),
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
    return NextResponse.json({ success: false, error: 'Invalid Qwen Wanx image request', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await runQwenWanxImage(parsed.data)
  const artifact = parsed.data.saveArtifact && result.json
    ? await saveJsonArtifact({
        appSlug: parsed.data.appSlug,
        provider: result.provider,
        model: result.model,
        capability: result.capability,
        json: result.json,
        metadata: { prompt: parsed.data.prompt, size: parsed.data.size ?? '1024*1024', latencyMs: result.latencyMs, asyncTask: true },
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
    metadata: { size: parsed.data.size ?? '1024*1024', asyncTask: true },
  }).catch(() => null)

  return NextResponse.json({ success: result.ok, ...result, artifact }, { status: result.ok ? 200 : 409 })
}
