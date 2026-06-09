import { NextRequest, NextResponse } from 'next/server'

import { buildProviderMeshTruth, createRoutePlanPreview } from '@/lib/provider-mesh/registry'
import type { AppCostProfile, CapabilityKey } from '@/lib/provider-mesh/types'

export const dynamic = 'force-dynamic'

const VALID_COST_PROFILES = new Set<AppCostProfile>(['low_cost', 'balanced', 'premium', 'ultra_resilient'])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const capability = searchParams.get('capability') as CapabilityKey | null
  const appSlug = searchParams.get('appSlug') || 'amarktai-network'
  const packageId = searchParams.get('packageId') || undefined
  const requestedCostProfile = searchParams.get('costProfile') as AppCostProfile | null
  const costProfile = requestedCostProfile && VALID_COST_PROFILES.has(requestedCostProfile)
    ? requestedCostProfile
    : 'balanced'

  const truth = buildProviderMeshTruth()

  const routePlan = capability
    ? createRoutePlanPreview({
        appSlug,
        packageId,
        taskLabel: capability,
        capability,
        costProfile,
      })
    : null

  return NextResponse.json({
    success: true,
    truth,
    routePlan,
  })
}
