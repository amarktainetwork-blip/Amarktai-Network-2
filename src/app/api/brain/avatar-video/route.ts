import { NextRequest, NextResponse } from 'next/server'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: 'avatar_video',
      jobStatus: 'blocked',
      artifactId: null,
      storageUrl: null,
      error: 'prompt is required',
      blocker: 'prompt is required',
    }, { status: 400 })
  }

  const truth = await getPlatformSettingsTruth()
  const provider = truth.providers.find((entry) =>
    entry.connected && entry.capabilities.includes('avatar') && entry.capabilities.includes('video'),
  )
  const blocker = provider
    ? `${provider.label} is connected, but no approved avatar/lip-sync execution contract is wired.`
    : 'avatar video provider unavailable'

  return NextResponse.json({
    success: false,
    executed: false,
    capability: 'avatar_video',
    provider: provider?.key ?? null,
    model: null,
    jobStatus: 'needs_setup',
    artifactId: null,
    storageUrl: null,
    error: blocker,
    blocker,
    setupRequirement: 'Connect and approve an avatar/lip-sync video provider with artifact persistence.',
  }, { status: 503 })
}
