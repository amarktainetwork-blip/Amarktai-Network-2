import { NextRequest, NextResponse } from 'next/server'
import {
  getLiveCatalogSnapshot,
  getLiveCatalogProviderSpecsForDashboard,
  getProviderLiveCatalog,
} from '@/lib/live-provider-catalog-service'
import { getCatalogEnabledProviders } from '@/lib/live-provider-catalog'
import type { ConnectedProviderKey } from '@/lib/capability-taxonomy'

export const dynamic = 'force-dynamic'

function isKnownProvider(provider: string): provider is ConnectedProviderKey {
  return (getCatalogEnabledProviders() as readonly string[]).includes(provider)
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')

  if (provider) {
    if (!isKnownProvider(provider)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown provider "${provider}"`,
          providers: getLiveCatalogProviderSpecsForDashboard(),
        },
        { status: 400 },
      )
    }

    const result = await getProviderLiveCatalog(provider)
    return NextResponse.json({
      ok: result.catalog.ok,
      fetchedAt: result.catalog.fetchedAt,
      provider: result.spec.provider,
      label: result.spec.label,
      mode: result.spec.mode,
      capabilities: result.spec.capabilities,
      modelCount: result.catalog.models.length,
      models: result.catalog.models,
      error: result.catalog.error,
      source: result.catalog.source,
    })
  }

  const snapshot = await getLiveCatalogSnapshot()
  return NextResponse.json({
    ok: snapshot.ok,
    fetchedAt: snapshot.fetchedAt,
    providerSpecs: getLiveCatalogProviderSpecsForDashboard(),
    providers: snapshot.providers.map((entry) => ({
      provider: entry.spec.provider,
      label: entry.spec.label,
      mode: entry.spec.mode,
      capabilities: entry.spec.capabilities,
      modelCount: entry.catalog.models.length,
      models: entry.catalog.models,
      error: entry.catalog.error,
      source: entry.catalog.source,
      fetchedAt: entry.catalog.fetchedAt,
      ok: entry.catalog.ok,
    })),
    errors: snapshot.errors,
  })
}
