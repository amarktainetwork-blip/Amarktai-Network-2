import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAllProviderModelCatalogs, getProviderModelCatalog } from '@/lib/ai-model-catalog'
import { getUniversalModelCatalog } from '@/lib/universal-model-catalog'
import { getCapabilityGovernanceMatrix, ROOT_WORKSPACE } from '@/lib/provider-capability-governance'

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
  const governance = getCapabilityGovernanceMatrix()
  return NextResponse.json({
    success: true,
    catalogs,
    universal,
    governance,
    rootWorkspace: ROOT_WORKSPACE,
    summary: {
      providers: catalogs.length,
      configured: catalogs.filter((catalog) => catalog.configured).length,
      models: universal.models.length,
      governedModels: governance.models.length,
      genxExpectedLiveModels: 58,
      customModelProviders: catalogs.filter((catalog) => catalog.supportsCustomModelIds).map((catalog) => catalog.provider),
      liveDiscoveryProviders: catalogs.filter((catalog) => catalog.supportsLiveDiscovery).map((catalog) => catalog.provider),
    },
    rules: {
      noGlobalDefault: true,
      rootWorkspaceHasFullAccess: true,
      appMustSelectModelPackage: false,
      externalManagedAppsSelectModelPackage: true,
      customModelIdsAllowed: true,
      explanation: `${ROOT_WORKSPACE.message} External managed apps select their own provider/model package and may use supported custom model IDs where the provider allows it.`,
    },
  })
}
