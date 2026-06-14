import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { APPROVED_DIRECT_PROVIDER_IDS, PROVIDER_MESH } from '@/lib/provider-mesh'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { UNIVERSAL_MODEL_ROUTES } from '@/lib/universal-model-catalog'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/brain/v1-capability-matrix'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const truth = await getPlatformSettingsTruth()
  const providers = APPROVED_DIRECT_PROVIDER_IDS.map((providerId) => {
    const node = PROVIDER_MESH.find((entry) => entry.id === providerId)!
    const status = truth.providers.find((entry) => entry.key === providerId)!
    const models = UNIVERSAL_MODEL_ROUTES
      .filter((model) => model.provider === providerId)
      .map((model) => ({
        id: model.modelId,
        name: model.displayName,
        capabilities: model.capabilities,
        enabled: model.enabled,
      }))
    const routes = AI_CAPABILITY_TAXONOMY
      .filter((capability) =>
        capability.providerRoutes.some((route) => route.provider === providerId),
      )
      .map((capability) => {
        const route = capability.providerRoutes.find((item) => item.provider === providerId)!
        return {
          capability: capability.id,
          label: capability.label,
          executable: route.executable,
          adapter: route.adapter,
          endpoint: route.route,
          models: route.modelIds,
          blocker: capability.blocker,
        }
      })

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
      capabilities: node.capabilities,
      models,
      routes,
      executableRouteCount: routes.filter((route) => route.executable).length,
    }
  })

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    approvedProviderCount: APPROVED_DIRECT_PROVIDER_IDS.length,
    connectedProviderCount: providers.filter((provider) => provider.connected).length,
    providers,
  })
}
