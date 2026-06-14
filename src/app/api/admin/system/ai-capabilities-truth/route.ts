import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
  getAiCapabilityTruthSummary,
  getCapabilityTaxonomyByGroup,
} from '@/lib/ai-capability-taxonomy'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const matrix = await getV1BrainRouteMatrix()
  return NextResponse.json({
    success: true,
    version: 'v1',
    summary: getAiCapabilityTruthSummary(),
    scopes: CONNECTED_APP_AI_SCOPES,
    groups: getCapabilityTaxonomyByGroup(),
    capabilities: AI_CAPABILITY_TAXONOMY,
    routeMatrix: matrix,
    rules: {
      capabilityFirst: true,
      noFakeSuccess: true,
      providerAndModelTruthSources: [
        'src/lib/brain/v1-capability-matrix.ts',
      ],
      connectedAppExecutionAddedInThisChange: true,
    },
  })
}
