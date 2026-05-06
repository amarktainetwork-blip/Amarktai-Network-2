import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [modelCatalogs, repoWorkbench, researchTools, system] = await Promise.all([
    getAllProviderModelCatalogs(),
    getRepoWorkbenchStatus(),
    getResearchToolStatus(),
    getSystemRuntimeStatus(),
  ])

  return NextResponse.json({
    success: true,
    approvedProviders: APPROVED_AI_PROVIDERS.map((provider) => provider.displayName),
    modelCatalogs,
    repoWorkbench,
    researchTools,
    system,
  })
}
