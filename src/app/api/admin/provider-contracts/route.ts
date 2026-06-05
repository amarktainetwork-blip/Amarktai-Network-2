import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { PROVIDER_CONTRACTS } from '@/lib/product-contract'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ providers: PROVIDER_CONTRACTS })
}
