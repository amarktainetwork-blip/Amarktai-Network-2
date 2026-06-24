import { NextResponse } from 'next/server'
import { getVpsSnapshot } from '@/lib/vps-monitor'
import { isVpsMonitorAuthorized } from '@/lib/vps-monitor-auth'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  if (!(await isVpsMonitorAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getVpsSnapshot())
}
