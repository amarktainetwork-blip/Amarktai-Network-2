import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'
import { getQueueStatus } from '@/lib/job-queue'
import { verifyStorage } from '@/lib/storage-driver'
import { prisma } from '@/lib/prisma'
import { VIDEO_MODEL_CONTRACTS } from '@/lib/video-route-specs'
import { listGatewayAliases } from '@/lib/provider-gateway'
import { getAdultAppCapabilityProfile } from '@/lib/adult-app-capabilities'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const appSlug = request.nextUrl.searchParams.get('appSlug') || 'amarktai-network'
  const [matrix, queue, storage, adult, modelCounts, jobCounts, traceCount] = await Promise.all([
    getV1BrainRouteMatrix(),
    getQueueStatus(),
    verifyStorage(),
    getAdultAppCapabilityProfile(appSlug),
    prisma.approvedModelRegistry.groupBy({ by: ['provider'], _count: { _all: true } }),
    prisma.controlPlaneJob.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.capabilityTrace.count(),
  ])
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    architecture: {
      vpsRole: 'control_plane_only',
      heavyModelHosting: false,
      capabilityTruth: matrix.source,
      providerExecutionUtility: 'provider-gateway',
      durableQueue: 'BullMQ + Redis + ControlPlaneJob',
      tracing: 'CapabilityTrace + optional OTLP HTTP export',
    },
    readiness: {
      storage,
      queue,
      database: { ready: true },
      routeMatrix: matrix.summary,
      approvedModelCounts: modelCounts,
      jobCounts,
      traceCount,
    },
    adult,
    gatewayAliases: listGatewayAliases(),
    videoContracts: VIDEO_MODEL_CONTRACTS,
    proofRoutes: {
      health: '/api/health',
      routeMatrix: '/api/admin/system/v1-brain-route-matrix',
      adultMatrix: `/api/admin/system/adult-capability-matrix?appSlug=${encodeURIComponent(appSlug)}`,
      gateway: '/api/admin/system/provider-gateway',
      text: '/api/brain/request',
      image: '/api/brain/image',
      adultText: '/api/brain/adult-text',
      adultImage: '/api/brain/adult-image',
      tts: '/api/brain/tts',
      shortVideo: '/api/brain/video-generate',
      longFormVideo: '/api/admin/video-projects',
      jobs: '/api/admin/system/jobs',
      artifacts: '/api/admin/artifacts',
      creativeSmoke: '/api/admin/system/live-creative-smoke-test',
    },
  })
}
