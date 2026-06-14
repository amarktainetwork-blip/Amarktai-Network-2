import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { executeCapabilityOrchestration } from '@/lib/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'An avatar prompt is required.' }, { status: 400 })
  }

  const result = await executeCapabilityOrchestration({
    capability: 'image_generation',
    input: prompt,
    appId: typeof body.appId === 'string' ? body.appId : undefined,
    saveArtifact: true,
    metadata: {
      artifactTypeOverride: 'avatar',
      artifactSubTypeOverride: 'avatar_profile',
      artifactCapabilityOverride: 'avatar_generation',
      avatarStyle: typeof body.style === 'string' ? body.style : 'professional portrait',
    },
  })

  return NextResponse.json({
    ...result,
    capability: 'avatar_generation',
  }, { status: result.success ? 200 : 503 })
}
