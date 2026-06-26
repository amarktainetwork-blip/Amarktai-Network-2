import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getCapabilityRuntimeTruth } from '@/lib/capability-runtime-truth'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [capabilities, system] = await Promise.all([
    getCapabilityRuntimeTruth(),
    getSystemRuntimeStatus(),
  ])

  const working = capabilities.filter((c) => c.status === 'working')
  const wiredUnproven = capabilities.filter((c) => c.status === 'wired_unproven')
  const blocked = capabilities.filter((c) => c.status === 'blocked')
  const missing = capabilities.filter((c) => c.status === 'missing')

  return NextResponse.json({
    success: true,
    capabilities,
    summary: {
      total: capabilities.length,
      working: working.length,
      wiredUnproven: wiredUnproven.length,
      blocked: blocked.length,
      missing: missing.length,
    },
    system,
  })
}
