import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { APPROVED_AI_PROVIDERS, APPROVED_ASSISTANT_MODELS } from '@/lib/approved-ai-catalog'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import { getCostSummary } from '@/lib/cost-tracking'
import { listOperatorAgents } from '@/lib/agent-registry'
import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'
import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
import { listAppAiPackages } from '@/lib/app-ai-package-store'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [workbench, costs, agents, research, system, modelCatalog, apps] = await Promise.all([
    getRepoWorkbenchStatus().catch((error) => ({ status: error instanceof Error ? error.message : 'unavailable' })),
    getCostSummary().catch(() => null),
    Promise.resolve(listOperatorAgents()),
    getResearchToolStatus().catch(() => null),
    getSystemRuntimeStatus().catch(() => null),
    getAllProviderModelCatalogs().catch(() => []),
    listAppAiPackages().catch(() => []),
  ])

  return NextResponse.json({
    assistant: 'AmarktAI Assistant',
    dashboardSections: DASHBOARD_NAV_ITEMS.map(({ id, href, label, description }) => ({ id, href, label, description })),
    approvedProviders: APPROVED_AI_PROVIDERS.map(({ key, displayName }) => ({ key, displayName })),
    assistantModels: APPROVED_ASSISTANT_MODELS,
    modelCatalog,
    workbench,
    apps,
    agents,
    costs,
    actions: { confirmationsRequired: ['apply patch', 'commit', 'push', 'create PR', 'merge', 'deploy'] },
    jobs: { source: 'Repo Workbench jobs and artifacts' },
    research,
    system,
    voice: [
      { provider: 'minimax', label: 'MiniMax/Mimo voice', status: process.env.MINIMAX_API_KEY || process.env.MIMO_API_KEY ? 'Configured' : 'Needs key/test' },
      { provider: 'genx', label: 'GenX voice', status: process.env.GENX_API_KEY ? 'Configured' : 'Needs key/test' },
      { provider: 'groq', label: 'Groq speech', status: process.env.GROQ_API_KEY ? 'Configured' : 'Needs key/test' },
      { provider: 'openai', label: 'OpenAI TTS', status: process.env.OPENAI_API_KEY ? 'Configured' : 'Needs key/test' },
    ],
  })
}
