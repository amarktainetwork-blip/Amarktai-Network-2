import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runCoreCapabilityProofPack } from '@/lib/core-capability-proof-runner'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await runCoreCapabilityProofPack())
}
