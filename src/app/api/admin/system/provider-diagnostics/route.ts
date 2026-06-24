import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { APPROVED_DIRECT_PROVIDER_IDS, PROVIDER_MESH } from '@/lib/provider-mesh'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { getCanonicalProviderRuntimeTruth } from '@/lib/providers/execution'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const truth = await getPlatformSettingsTruth()
  const providers = await Promise.all(APPROVED_DIRECT_PROVIDER_IDS.map(async (providerId) => {
    const node = PROVIDER_MESH.find((entry) => entry.id === providerId)!
    const status = truth.providers.find((entry) => entry.key === providerId)!
    const runtime = await getCanonicalProviderRuntimeTruth(providerId)
    const models = runtime.models
      .map((model) => ({
        id: model.id,
        name: typeof model.raw.display_name === 'string'
          ? model.raw.display_name
          : model.id,
        capabilities: model.capabilities,
        enabled: model.status !== 'unavailable',
        evidence: model.capabilityEvidence,
      }))
    const routes = runtime.routes.map((route) => ({
      capability: route.capability,
      label: route.capability.replaceAll('_', ' '),
      executable: route.executable,
      adapter: `${providerId}_capability_adapter`,
      endpoint: '/api/brain/execute',
      models: route.models,
      evidence: route.evidence,
      blocker: route.executable
        ? null
        : runtime.error ?? 'No discovered model or provider-contract evidence.',
    }))

    return {
      id: providerId,
      name: node.displayName,
      configured: status.configured,
      connected: status.connected,
      status: status.status,
      lastTestResult: status.lastTestResult,
      lastTestedAt: status.lastTestedAt,
      error: status.error,
      blocker: status.blocker,
      capabilities: runtime.declaredCapabilities,
      models,
      routes,
      discoveryStatus: runtime.discoveryStatus,
      discoveryError: runtime.error,
      executableRouteCount: routes.filter((route) => route.executable).length,
    }
  }))

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    approvedProviderCount: APPROVED_DIRECT_PROVIDER_IDS.length,
    connectedProviderCount: providers.filter((provider) => provider.connected).length,
    providers,
  })
}
