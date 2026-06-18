import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
  getAiCapabilityTruthSummary,
  getCapabilityTaxonomyByGroup,
} from '@/lib/ai-capability-taxonomy'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'
import {
  buildCapabilityProofIndex,
  deriveRuntimeProofStatus,
  loadCapabilityProofReport,
  summarizeRuntimeProofStatuses,
} from '@/lib/runtime-proof-status'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const matrix = await getV1BrainRouteMatrix()
  const proofReport = loadCapabilityProofReport()
  const proofIndex = buildCapabilityProofIndex(proofReport)
  const capabilities = AI_CAPABILITY_TAXONOMY.map((capability) => {
    const route = matrix.capabilities.find((entry) => entry.id === capability.id)
    const proof = proofIndex.get(capability.id)
    const proofStatus = deriveRuntimeProofStatus(capability, route, proof)
    const routeAdapterExists = Boolean(route?.adapterImplemented || capability.adapterImplemented)
    const providerAvailable = capability.providerRoutes.length > 0
    const providerCatalogWorks = route
      ? route.modelsConsidered.length > 0
      : capability.providerRoutes.some((entry) => entry.modelIds.length > 0)
    const providerLiveTestPassed = Boolean(
      route?.selectedRoute?.liveTestStatus === 'passed'
      || route?.fallbackRoutes.some((entry) => entry.liveTestStatus === 'passed'),
    )
    return {
      ...capability,
      backendStatus: capability.status,
      status: proofStatus,
      proofStatus,
      proof,
      routeMatrixReadiness: route?.readiness ?? capability.readiness,
      routeAdapterExists,
      providerAvailable,
      providerCatalogWorks,
      providerLiveTestPassed,
      capabilityLiveProven: proofStatus === 'LIVE_PROVEN',
      proofGeneratedAt: proofReport?.generatedAt ?? null,
      routeFile: proof?.routeFile ?? proof?.sourceFileResponsible ?? route?.selectedRoute?.adapter ?? null,
      exactProofError: proof?.exactError ?? null,
    }
  })
  const proofSummary = summarizeRuntimeProofStatuses(capabilities.map((entry) => entry.proofStatus))
  return NextResponse.json({
    success: true,
    version: 'v1',
    summary: getAiCapabilityTruthSummary(),
    proofSummary,
    proofGeneratedAt: proofReport?.generatedAt ?? null,
    scopes: CONNECTED_APP_AI_SCOPES,
    groups: getCapabilityTaxonomyByGroup(),
    capabilities,
    routeMatrix: matrix,
    rules: {
      capabilityFirst: true,
      noFakeSuccess: true,
      providerAndModelTruthSources: [
        'src/lib/providers/provider-truth.ts',
        'src/lib/providers/provider-discovery.ts',
        'src/lib/providers/model-discovery.ts',
        'src/lib/providers/registry.ts',
      ],
      taxonomySource: 'src/lib/brain/v1-capability-matrix.ts',
      runtimeAvailabilityRequiresLiveDiscovery: true,
      readyLabelRequiresCapabilityLiveProof: true,
      connectedAppExecutionAddedInThisChange: false,
    },
  })
}
