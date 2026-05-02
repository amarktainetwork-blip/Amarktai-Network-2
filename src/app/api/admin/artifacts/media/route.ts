import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listMediaArtifacts } from '@/lib/artifact-gallery'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug') || 'amarktai-network'
  const provider = searchParams.get('provider') || undefined
  const capability = searchParams.get('capability') || undefined
  const limit = Number(searchParams.get('limit') || '100')

  const artifacts = await listMediaArtifacts({ appSlug, provider, capability, limit })
  return NextResponse.json({
    success: true,
    appSlug,
    provider: provider ?? 'all',
    capability: capability ?? 'all',
    count: artifacts.length,
    artifacts,
  })
}
