import { getServiceKey } from '@/lib/service-vault'
import {
  fetchLiveCatalog,
  getCatalogEnabledProviders,
  getLiveProviderCatalogSpec,
  getLiveProviderCatalogSpecs,
  type LiveCatalogResult,
  type LiveCatalogProviderSpec,
} from '@/lib/live-provider-catalog'
import type { ConnectedProviderKey } from '@/lib/capability-taxonomy'

export interface LiveCatalogSnapshotProvider {
  spec: LiveCatalogProviderSpec
  catalog: LiveCatalogResult
}

export interface LiveCatalogSnapshot {
  ok: boolean
  fetchedAt: string
  providers: LiveCatalogSnapshotProvider[]
  errors: Array<{ provider: string; error: string }>
}

export interface LiveCatalogServiceDeps {
  keyResolver?: (provider: ConnectedProviderKey, envVars: readonly string[]) => Promise<string | null>
  fetchImpl?: typeof fetch
}

async function defaultKeyResolver(provider: ConnectedProviderKey, envVars: readonly string[]): Promise<string | null> {
  for (const envVar of envVars) {
    const key = await getServiceKey(provider, envVar)
    if (key) return key
  }
  return null
}

export async function getProviderLiveCatalog(
  provider: ConnectedProviderKey,
  deps: LiveCatalogServiceDeps = {},
): Promise<LiveCatalogSnapshotProvider> {
  const spec = getLiveProviderCatalogSpec(provider)
  if (!spec) {
    throw new Error(`Unknown live catalog provider: ${provider}`)
  }

  const keyResolver = deps.keyResolver ?? defaultKeyResolver
  const apiKey = spec.envVars.length > 0 ? await keyResolver(provider, spec.envVars) : null
  const catalog = await fetchLiveCatalog(provider, apiKey, deps.fetchImpl ?? fetch)

  return { spec, catalog }
}

export async function getLiveCatalogSnapshot(deps: LiveCatalogServiceDeps = {}): Promise<LiveCatalogSnapshot> {
  const providers = await Promise.all(
    getCatalogEnabledProviders().map((provider) => getProviderLiveCatalog(provider, deps)),
  )

  const errors = providers
    .filter((entry) => !entry.catalog.ok && entry.catalog.error)
    .map((entry) => ({
      provider: entry.spec.provider,
      error: entry.catalog.error ?? 'Unknown catalog error',
    }))

  return {
    ok: errors.length === 0,
    fetchedAt: new Date().toISOString(),
    providers,
    errors,
  }
}

export function getLiveCatalogProviderSpecsForDashboard() {
  return getLiveProviderCatalogSpecs().map((spec) => ({
    provider: spec.provider,
    label: spec.label,
    mode: spec.mode,
    capabilities: spec.capabilities,
    envVars: spec.envVars,
    endpoints: spec.endpoints.map((endpoint) => ({
      label: endpoint.label,
      method: endpoint.method,
      requiresApiKey: endpoint.requiresApiKey,
      category: endpoint.category ?? null,
      notes: endpoint.notes,
      // Do not leak non-public or placeholder endpoint internals to the dashboard.
      hasLiveUrl: endpoint.url.startsWith('http'),
    })),
    notes: spec.notes,
  }))
}
