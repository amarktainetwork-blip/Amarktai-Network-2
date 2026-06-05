import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getVpsSnapshot } from '@/lib/vps-monitor'
import { PROVIDER_CONTRACTS } from '@/lib/product-contract'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [runtime, vps] = await Promise.all([getDashboardRuntimeTruth(), getVpsSnapshot()])
  return NextResponse.json({ runtime, vps, providerContracts: PROVIDER_CONTRACTS, rule: 'Unknown or untested capabilities never become green.' })
}
