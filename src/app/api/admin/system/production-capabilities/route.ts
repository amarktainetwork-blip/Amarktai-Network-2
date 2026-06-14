import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { PRODUCTION_CAPABILITY_CONTRACTS } from '@/lib/production-capability-contracts'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const matrix = await getV1BrainRouteMatrix()
  const runtime = new Map(matrix.capabilities.map((capability) => [capability.id, capability]))
  return NextResponse.json({
    source: '62 canonical V1 capabilities + 6 app-governed adult capabilities',
    canonicalCount: matrix.capabilities.length,
    adultGovernedCount: 6,
    total: PRODUCTION_CAPABILITY_CONTRACTS.length,
    capabilities: PRODUCTION_CAPABILITY_CONTRACTS.map((contract) => ({
      ...contract,
      runtime: runtime.get(contract.canonicalCapability) ?? null,
    })),
  })
}
