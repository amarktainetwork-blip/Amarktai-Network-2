import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { PROVIDER_CONTRACTS } from '@/lib/product-contract'
import { collectProviderRuntimeConfigTruth } from '@/lib/provider-runtime-truth'
import { CAPABILITY_REGISTRY } from '@/lib/providers/capability-registry'
import { discoverProvider } from '@/lib/providers/provider-discovery'
import { buildProviderCapabilityContracts } from '@/lib/providers/provider-capability-contracts'
import { getCanonicalProviderHealth } from '@/lib/providers/health'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [configTruth, runtimeContracts] = await Promise.all([
    collectProviderRuntimeConfigTruth(),
    Promise.all(PROVIDER_TRUTH.map(async (provider) => {
      const [snapshot, health] = await Promise.all([
        discoverProvider(provider.id).catch(() => null),
        getCanonicalProviderHealth(provider.id).catch(() => null),
      ])
      if (!snapshot || !health) {
        return {
          provider: provider.id,
          contracts: [],
          error: 'Runtime discovery or health truth is unavailable.',
        }
      }
      return {
        provider: provider.id,
        contracts: buildProviderCapabilityContracts({
          provider,
          models: snapshot.models,
          capabilities: CAPABILITY_REGISTRY,
          health,
        }),
        error: snapshot.error,
      }
    })),
  ])
  return NextResponse.json({
    providers: PROVIDER_CONTRACTS,
    runtimeConfigTruth: configTruth,
    runtimeContracts,
  })
}
