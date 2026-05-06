import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { APPROVED_AI_PROVIDERS, APPROVED_ASSISTANT_MODELS } from '@/lib/approved-ai-catalog'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    assistant: 'AmarktAI Assistant',
    dashboardSections: DASHBOARD_NAV_ITEMS.map(({ id, href, label, description }) => ({ id, href, label, description })),
    approvedProviders: APPROVED_AI_PROVIDERS.map(({ key, displayName }) => ({ key, displayName })),
    assistantModels: APPROVED_ASSISTANT_MODELS,
    workbenchContext: [
      'repo',
      'branch',
      'model',
      'costMode',
      'prompt',
      'plan',
      'filesChanged',
      'diff',
      'checks',
      'pr',
      'deployLog',
    ],
  })
}
