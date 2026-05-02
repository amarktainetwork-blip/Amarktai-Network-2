import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { pollQwenWanxTask } from '@/lib/qwen-wanx-polling'
import { saveJsonArtifact } from '@/lib/media-artifacts'
import { recordProviderResult } from '@/lib/provider-result-log'

const schema = z.object({
  taskId: z.string().min(1),
  model: z.string().min(1).optional(),
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
    return NextResponse.json({ success: false, error: 'Invalid Qwen Wanx task poll request', details: parsed.error.flatten() }, { status: 422 })
  }

  const result = await pollQwenWanxTask(parsed.data)
  const artifact = parsed.data.saveArtifact && result.json
    ? await saveJsonArtifact({
        appSlug: parsed.data.appSlug,
        provider: result.provider,
        model: result.model,
        capability: result.capability,
        json: result.json,
        metadata: { taskId: parsed.data.taskId, latencyMs: result.latencyMs },
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
    metadata: { taskId: parsed.data.taskId },
  }).catch(() => null)

  return NextResponse.json({ success: result.ok, ...result, artifact }, { status: result.ok ? 200 : 409 })
}
