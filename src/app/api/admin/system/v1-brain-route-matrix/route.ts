import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'
import { VIDEO_MODEL_CONTRACTS } from '@/lib/video-route-specs'
import { listGatewayAliases } from '@/lib/provider-gateway'
import { getQueueStatus } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [matrix, queue] = await Promise.all([getV1BrainRouteMatrix(), getQueueStatus()])
  return NextResponse.json({
    ...matrix,
    executionControlPlane: {
      gatewayAliases: listGatewayAliases(),
      queue,
      videoContracts: VIDEO_MODEL_CONTRACTS,
      note: 'These are execution utilities; the capability matrix above remains product truth.',
    },
  })
}
