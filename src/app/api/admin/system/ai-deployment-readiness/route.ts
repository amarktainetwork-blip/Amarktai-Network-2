import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAiDeploymentReadiness } from '@/lib/ai-deployment-readiness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const readiness = await getAiDeploymentReadiness()
  return NextResponse.json({
    success: true,
    ...readiness,
    safety: {
      secretsExposed: false,
      credentialValuesReturned: false,
    },
  })
}
