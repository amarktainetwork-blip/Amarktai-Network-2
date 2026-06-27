import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { getCapabilityRuntimeTruth } from '@/lib/capability-runtime-truth'
// getModelTruth reads the static model-registry only — not broken, keep as-is
import { getModelTruth } from '@/lib/dashboard-truth'
import type { ProviderState, ProviderTruth, CapabilityTruth } from '@/lib/dashboard-truth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/truth — unified dashboard truth.
 *
 * providers and capabilities now derive from the canonical runtime truth
 * (provider-runtime-truth.ts / capability-runtime-truth.ts), not from the
 * legacy prisma.aiProvider table.
 *
 * Query params:
 *   section: 'providers' | 'capabilities' | 'models' | 'summary' | 'all'
 *   appSlug: reserved for future capability scoping
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'all'

  try {
    const needProviders = section === 'all' || section === 'providers' || section === 'summary'
    const needCapabilities = section === 'all' || section === 'capabilities' || section === 'summary'
    const needModels = section === 'all' || section === 'models'

    // Fetch only what this section requires
    const [rawProviders, rawCaps] = await Promise.all([
      needProviders ? getProviderRuntimeTruth() : Promise.resolve(null),
      needCapabilities ? getCapabilityRuntimeTruth() : Promise.resolve(null),
    ])

    const result: Record<string, unknown> = {}

    // ── Providers ─────────────────────────────────────────────────────────────
    const providers: ProviderTruth[] = rawProviders
      ? rawProviders.map((p) => ({
          providerKey: p.providerId,
          displayName: p.displayName,
          state: deriveState(p),
          isActive: p.connected,
          launchRequired: p.providerId === 'genx',
          healthStatus: p.connected ? 'healthy' : p.lastTestStatus === 'failed' ? 'error' : p.hasKey ? 'configured' : 'unconfigured',
          healthMessage: p.blocker || (p.connected ? 'Live test passed' : p.hasKey ? 'Key saved — run live test' : 'No API key configured'),
          lastCheckedAt: p.lastTestedAt,
          modelCount: 0,
          supportedCapabilities: [...p.capabilities],
        }))
      : []

    if (section === 'all' || section === 'providers') {
      result.providers = providers
    }

    // ── Capabilities ──────────────────────────────────────────────────────────
    const capabilities: CapabilityTruth[] = rawCaps
      ? rawCaps.map((c) => ({
          capability: c.capabilityId,
          displayName: c.label,
          category: c.category,
          state: mapCapState(c.status),
          implementationState: mapImplState(c),
          routeExists: c.hasExecutionRoute,
          hasCapableModel: c.providerCandidates.length > 0,
          hasActiveProvider: c.connectedProviderCandidates.length > 0,
          blockedBySettings: !c.hasPermission,
          reason: c.blocker || (c.status === 'working' ? 'Connected and proven' : c.nextAction),
        }))
      : []

    if (section === 'all' || section === 'capabilities') {
      result.capabilities = capabilities
    }

    // ── Models — static registry, unchanged ───────────────────────────────────
    if (needModels) {
      result.models = getModelTruth()
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    if (section === 'all' || section === 'summary') {
      const totalProviders = providers.length
      const activeProviders = providers.filter((p) => p.isActive).length
      const configuredProviders = providers.filter((p) => p.state !== 'AVAILABLE_IN_CATALOG').length
      const totalCapabilities = capabilities.length
      const availableCapabilities = capabilities.filter((c) => c.state === 'AVAILABLE_NOW').length
      const blockedCapabilities = capabilities.filter((c) => c.state === 'BLOCKED_BY_SETTINGS').length
      const unavailableCapabilities = capabilities.filter((c) => c.state === 'UNAVAILABLE_WITH_CURRENT_CONFIG').length
      const notImplemented = capabilities.filter((c) => c.state === 'NOT_IMPLEMENTED').length
      const implemented = totalCapabilities - notImplemented
      const systemHealth = Math.round(
        (implemented > 0 ? (availableCapabilities / implemented) * 60 : 0) +
        (totalProviders > 0 ? (activeProviders / totalProviders) * 40 : 0),
      )

      result.summary = {
        totalProviders,
        activeProviders,
        configuredProviders,
        totalModels: 0,
        usableModels: 0,
        totalCapabilities,
        availableCapabilities,
        blockedCapabilities,
        unavailableCapabilities,
        notImplemented,
        systemHealth,
        artifactCount: 0,
        queueHealthy: false,
        storageDriver: 'unknown',
        managerAgentsActive: false,
        healthScore: systemHealth,
        circuitBreakersOpen: 0,
        deadLetterQueueSize: 0,
        unresolvedAlerts: 0,
        criticalAlerts: 0,
        sseListeners: 0,
        providerReliabilityCount: activeProviders,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[truth] Error computing dashboard truth:', error)
    return NextResponse.json({ error: 'Failed to compute dashboard truth' }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveState(p: { hasKey: boolean; connected: boolean; lastTestStatus: string }): ProviderState {
  if (!p.hasKey) return 'AVAILABLE_IN_CATALOG'
  if (p.connected) return 'HEALTHY'
  if (p.lastTestStatus === 'failed') return 'ERROR'
  return 'CONFIGURED'
}

function mapCapState(status: string): CapabilityTruth['state'] {
  if (status === 'working') return 'AVAILABLE_NOW'
  if (status === 'blocked') return 'BLOCKED_BY_SETTINGS'
  if (status === 'wired_unproven') return 'UNAVAILABLE_WITH_CURRENT_CONFIG'
  return 'NOT_IMPLEMENTED'
}

function mapImplState(c: { hasExecutionRoute: boolean; status: string; hasPermission: boolean }): CapabilityTruth['implementationState'] {
  if (!c.hasExecutionRoute) return 'NOT_IMPLEMENTED'
  if (!c.hasPermission) return 'BLOCKED_BY_SETTINGS'
  if (c.status === 'working') return 'ACTIVE_NOW'
  if (c.status === 'wired_unproven') return 'IMPLEMENTED_IN_PLATFORM'
  if (c.status === 'blocked') return 'CONFIGURED'
  return 'NOT_IMPLEMENTED'
}
