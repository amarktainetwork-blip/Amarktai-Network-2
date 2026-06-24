import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'

export async function isVpsMonitorAuthorized(request: NextRequest): Promise<boolean> {
  const session = await getSession()
  if (session.isLoggedIn) return true
  const configured = process.env.VPS_MONITOR_API_KEY?.trim()
  const supplied = request.headers.get('x-amarktai-vps-key')?.trim()
    ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!configured || !supplied) return false
  const left = Buffer.from(configured)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}
