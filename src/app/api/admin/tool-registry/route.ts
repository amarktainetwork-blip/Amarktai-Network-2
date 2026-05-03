import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getToolRegistry } from '@/lib/tool-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await getToolRegistry())
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Tool registry status failed',
    }, { status: 500 })
  }
}
