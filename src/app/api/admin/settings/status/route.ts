import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    truth: await getPlatformSettingsTruth(),
  })
}
