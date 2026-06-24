import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { hardResetJobsAndArtifacts } from '@/lib/admin-runtime-reset'

const CONFIRMATION = 'HARD RESET JOBS AND ARTIFACTS'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { confirmation?: string }
  if (body.confirmation !== CONFIRMATION) {
    return NextResponse.json({
      error: `Confirmation must exactly match "${CONFIRMATION}".`,
    }, { status: 400 })
  }
  try {
    return NextResponse.json({
      success: true,
      confirmation: CONFIRMATION,
      ...(await hardResetJobsAndArtifacts()),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Hard reset failed.',
    }, { status: 500 })
  }
}
