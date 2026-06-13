import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateConnectedAppJobRequest,
  getConnectedAppCapabilityJob,
  pollConnectedAppCapabilityJob,
} from '@/lib/connected-app-capability-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authentication = authenticateConnectedAppJobRequest({
    appId: request.headers.get('x-amarktai-app-id'),
    timestampHeader: request.headers.get('x-amarktai-timestamp'),
    signatureHeader: request.headers.get('x-amarktai-signature'),
    rawBody: '',
  })
  if (!authentication.ok) {
    return NextResponse.json({ success: false, error: authentication.error }, { status: authentication.status })
  }
  const { jobId } = await params
  const stored = getConnectedAppCapabilityJob(jobId)
  if (!stored || stored.appId !== authentication.app.id) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
  }
  if (!authentication.app.scopes.includes(stored.requiredScope as never)) {
    return NextResponse.json({ success: false, error: `Missing required scope: ${stored.requiredScope}` }, { status: 403 })
  }
  const job = await pollConnectedAppCapabilityJob(stored)
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
      qualityTier: job.qualityTier,
    },
    result: job.result,
    artifact: job.artifactId ? { id: job.artifactId, url: job.artifactUrl } : null,
    error: job.error,
  })
}
