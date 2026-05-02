import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { AI_CAPABILITY_TAXONOMY, getCapabilityTaxonomyByGroup } from '@/lib/ai-capability-taxonomy'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    success: true,
    count: AI_CAPABILITY_TAXONOMY.length,
    groups: getCapabilityTaxonomyByGroup(),
    capabilities: AI_CAPABILITY_TAXONOMY,
    rules: {
      appLevelPermissionsRequired: true,
      specialistRoutesMustBeVerified: true,
      noFakeCapabilitySuccess: true,
      description: 'This taxonomy defines what the system can plan and configure. Provider-specific execution must still pass capability tests before a capability is treated as live.',
    },
  })
}
