import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAllProviderModelCatalogs, getProviderModelCatalog } from '@/lib/ai-model-catalog'
import { getUniversalModelCatalog } from '@/lib/universal-model-catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')?.trim().toLowerCase()

  if (provider) {
    const catalog = await getProviderModelCatalog(provider)
    return NextResponse.json({ success: true, catalog })
  }

  const [catalogs, universal] = await Promise.all([
    getAllProviderModelCatalogs(),
    getUniversalModelCatalog(),
  ])
  return NextResponse.json({
    success: true,
    catalogs,
    universal,
    summary: {
      providers: catalogs.length,
      configured: catalogs.filter((catalog) => catalog.configured).length,
      models: universal.models.length,
      customModelProviders: catalogs.filter((catalog) => catalog.supportsCustomModelIds).map((catalog) => catalog.provider),
      liveDiscoveryProviders: catalogs.filter((catalog) => catalog.supportsLiveDiscovery).map((catalog) => catalog.provider),
    },
    rules: {
      noGlobalDefault: true,
      appMustSelectModelPackage: true,
      customModelIdsAllowed: true,
      explanation: 'Amarktai Network should not force one global default. Each app selects its own provider/model package and may use any supported custom model ID where the provider allows it.',
    },
  })
}
