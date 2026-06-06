import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { AI_PROVIDER_GOVERNANCE, PROPOSED_PROVIDER_BACKLOG, getPrimarySetupProviders } from '@/lib/ai-provider-governance'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getCapabilityGovernanceMatrix } from '@/lib/provider-capability-governance'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const truth = await getDashboardRuntimeTruth()
  const runtimeByKey = new Map(truth.providers.map((provider) => [provider.key, provider]))

  const providers = AI_PROVIDER_GOVERNANCE.map((provider) => ({
    ...provider,
    runtime: runtimeByKey.get(provider.key) ?? null,
  }))

  const counts = providers.reduce<Record<string, number>>((acc, provider) => {
    acc[provider.status] = (acc[provider.status] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    capabilityGovernance: getCapabilityGovernanceMatrix(),
    counts,
    primarySetup: getPrimarySetupProviders().map((provider) => provider.key),
    providers,
    proposedBacklog: PROPOSED_PROVIDER_BACKLOG,
    recommendations: {
      keepCore: ['genx', 'github', 'qwen', 'groq', 'together', 'huggingface'],
      keepActiveOptional: ['smtp'],
      advancedOnly: ['openai', 'xai'],
      debateBeforeAdding: [],
      hideFromPrimarySetup: providers.filter((provider) => !provider.showInPrimarySetup).map((provider) => provider.key),
    },
  })
}
