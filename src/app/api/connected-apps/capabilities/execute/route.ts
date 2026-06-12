import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateConnectedAppCapabilityRequest,
  executeConnectedAppCapability,
} from '@/lib/connected-app-capability-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const authentication = authenticateConnectedAppCapabilityRequest({
    appId: request.headers.get('x-amarktai-app-id'),
    timestampHeader: request.headers.get('x-amarktai-timestamp'),
    signatureHeader: request.headers.get('x-amarktai-signature'),
    rawBody,
  })
  if (!authentication.ok) {
    return NextResponse.json(
      { success: false, status: 'blocked', error: authentication.error },
      { status: authentication.status },
    )
  }

  const job = await executeConnectedAppCapability(authentication)
  return NextResponse.json({
    success: job.status === 'completed' || job.status === 'processing',
    executionId: job.id,
    jobId: job.id,
    status: job.status,
    capability: job.capability,
    route: {
      provider: job.provider,
      model: job.model,
      adapter: job.adapter,
    },
    result: job.result,
    artifact: job.artifactId ? { id: job.artifactId, url: job.artifactUrl } : null,
    error: job.error,
  }, { status: job.status === 'blocked' ? 403 : 200 })
}
