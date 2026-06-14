import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { requestControlPlaneJobCancellation } from '@/lib/control-plane-jobs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const job = await requestControlPlaneJobCancellation(id)
  return job
    ? NextResponse.json({ success: true, job })
    : NextResponse.json({ error: 'Control-plane job not found.' }, { status: 404 })
}
