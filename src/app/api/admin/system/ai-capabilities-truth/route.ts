import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
  getAiCapabilityTruthSummary,
  getCapabilityTaxonomyByGroup,
} from '@/lib/ai-capability-taxonomy'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    version: 'v1',
    summary: getAiCapabilityTruthSummary(),
    scopes: CONNECTED_APP_AI_SCOPES,
    groups: getCapabilityTaxonomyByGroup(),
    capabilities: AI_CAPABILITY_TAXONOMY,
    rules: {
      capabilityFirst: true,
      noFakeSuccess: true,
      providerAndModelTruthSources: [
        'src/lib/provider-mesh.ts',
        'src/lib/universal-model-catalog.ts',
        'src/lib/media-capability-registry.ts',
      ],
      connectedAppExecutionAddedInThisChange: false,
    },
  })
}
