import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { testLocalTool } from '@/lib/local-tools'
import { verifyStorage } from '@/lib/storage-driver'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [ffmpeg, ffprobe, storage, playwright] = await Promise.all([
    testLocalTool('ffmpeg'),
    testLocalTool('ffprobe'),
    verifyStorage(),
    testLocalTool('playwright'),
  ])
  return NextResponse.json({
    tools: [
      ffmpeg,
      ffprobe,
      {
        id: 'storage',
        connected: storage.ready,
        capabilities: ['artifacts', 'uploads'],
        detail: storage.error || `Read ${storage.readable ? 'yes' : 'no'}, write ${storage.writable ? 'yes' : 'no'}, delete ${storage.deletable ? 'yes' : 'no'}.`,
      },
      playwright,
    ],
  })
}
