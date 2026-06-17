import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAppProfile } from '@/lib/app-profiles'
import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
import {
  getDashboardRuntimeTruth,
  getRuntimeProviderStatus,
} from '@/lib/runtime-capability-truth'

/**
 * GET /api/admin/truth — returns unified dashboard truth state.
 *
 * Legacy compatibility endpoint. Runtime truth is owned by runtime-capability-truth.ts
 * and the V1 route matrix; this route only aggregates those sources for older consumers.
 * Query params:
 *   section (optional): 'providers' | 'capabilities' | 'models' | 'summary' | 'all'
 *   appSlug (optional): scope capabilities to a specific app
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'all'
  const appSlug = searchParams.get('appSlug') || undefined

  try {
    const [runtime, providers, models] = await Promise.all([
      getDashboardRuntimeTruth(),
      getRuntimeProviderStatus(),
      getAllProviderModelCatalogs(),
    ])
    const capabilities = await buildCapabilityTruth(appSlug, runtime)

    const result: Record<string, unknown> = {}

    if (section === 'all' || section === 'summary') {
      result.summary = {
        totalProviders: providers.length,
        activeProviders: providers.filter((provider) => provider.status === 'READY').length,
        configuredProviders: providers.filter((provider) => provider.status !== 'NEEDS_CONFIGURATION').length,
        totalModels: models.reduce((sum, catalog) => sum + catalog.models.length, 0),
        usableModels: models.reduce((sum, catalog) => sum + catalog.models.filter((model) => model.enabled).length, 0),
        totalCapabilities: capabilities.length,
        availableCapabilities: capabilities.filter((capability) => capability.state === 'READY').length,
        blockedCapabilities: capabilities.filter((capability) => capability.state === 'BLOCKED' || capability.state === 'NEEDS_CONFIGURATION').length,
        unavailableCapabilities: capabilities.filter((capability) => capability.state === 'UNAVAILABLE').length,
        notImplemented: 0,
        systemHealth: providers.length && capabilities.length
          ? Math.round(((providers.filter((provider) => provider.status === 'READY').length / providers.length)
            + (capabilities.filter((capability) => capability.state === 'READY').length / capabilities.length)) * 50)
          : 0,
      }
    }
    if (section === 'all' || section === 'providers') {
      result.providers = providers
    }
    if (section === 'all' || section === 'capabilities') {
      result.capabilities = capabilities
    }
    if (section === 'all' || section === 'models') {
      result.models = models
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[truth] Error computing dashboard truth:', error)
    return NextResponse.json(
      { error: 'Failed to compute dashboard truth' },
      { status: 500 },
    )
  }
}

async function buildCapabilityTruth(
  appSlug: string | undefined,
  runtime: Awaited<ReturnType<typeof getDashboardRuntimeTruth>>,
) {
  const profile = appSlug ? getAppProfile(appSlug) : null
  const appAdultEnabled = profile?.adult_mode === true
  const standard = runtime.capabilities.map((capability) => ({
    capability: capabilityId(capability.name),
    displayName: capability.name,
    category: capabilityId(capability.name).split('_')[0],
    state: capability.status,
    implementationState: capability.status,
    routeExists: true,
    hasCapableModel: capability.models.length > 0,
    hasActiveProvider: capability.status === 'READY',
    blockedBySettings: false,
    reason: capability.blocker ?? `Ready through ${capability.models.join(', ')}.`,
  }))
  const adultCapabilities = ['adult_text', 'adult_image', 'adult_video', 'adult_voice'].map((capability) => {
    const policyAllowed = runtime.adultGate.enabled && appAdultEnabled
    return {
      capability,
      displayName: capability.replace('_', ' '),
      category: 'adult',
      state: policyAllowed ? 'READY' as const : 'BLOCKED' as const,
      implementationState: policyAllowed ? 'READY' as const : 'BLOCKED' as const,
      routeExists: true,
      hasCapableModel: runtime.adultGate.providerAvailable,
      hasActiveProvider: runtime.adultGate.providerAvailable,
      blockedBySettings: !policyAllowed,
      reason: policyAllowed
        ? 'Adult route is enabled by global operator opt-in and app policy.'
        : 'Adult mode requires both global operator opt-in and app-level adult_mode=true.',
    }
  })
  return [...standard, ...adultCapabilities]
}

function capabilityId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
