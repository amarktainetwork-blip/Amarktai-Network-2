/**
 * POST /api/admin/agents/run
 * Run an agent task via agent-system.ts.
 * No direct provider calls — all routing goes through capability-router.
 *
 * adult_creator agent type is gated: requires adultPermission: true in body.
 * Forbidden: provider, model, providerOverride, modelOverride, endpoint fields.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  runAgent,
  type AgentConfig,
  type MarketingAgentInput,
  type AdultCreatorAgentInput,
  type CustomerServiceAgentInput,
  type ResearchAgentInput,
  type AutomationAgentInput,
} from '@/lib/agent-system'

const FORBIDDEN = ['provider', 'model', 'providerOverride', 'modelOverride', 'endpoint'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Strip forbidden override fields
  for (const key of FORBIDDEN) delete body[key]

  const agentType = body.agentType as string | undefined
  const taskInput = body.task as string | undefined
  const appSlug = (body.appSlug as string) ?? 'dashboard'

  if (!agentType) return NextResponse.json({ error: 'agentType is required' }, { status: 400 })
  if (!taskInput) return NextResponse.json({ error: 'task is required' }, { status: 400 })

  // Gate adult_creator behind explicit permission
  if (agentType === 'adult_creator') {
    if (!body.adultPermission) {
      return NextResponse.json({ error: 'adult_creator requires adultPermission: true and must be accessed through the Adult Mode page.' }, { status: 403 })
    }
  }

  const ALLOWED_NON_ADULT = ['marketing', 'customer_service', 'research', 'automation']
  const ALLOWED_ALL = [...ALLOWED_NON_ADULT, 'adult_creator']
  if (!ALLOWED_ALL.includes(agentType)) {
    return NextResponse.json({ error: `agentType must be one of: ${ALLOWED_NON_ADULT.join(', ')}` }, { status: 400 })
  }

  const config: AgentConfig = {
    agentType: agentType as AgentConfig['agentType'],
    agentId: `dashboard-${agentType}-${Date.now()}`,
    appSlug,
    workspaceId: body.workspaceId as string | undefined,
    brandId: body.brandId as string | undefined,
    allowedCapabilities: (body.allowedCapabilities as string[]) ?? ['chat', 'research', 'image_generation'],
    budget: (body.budget as AgentConfig['budget']) ?? 'balanced',
    quality: (body.quality as AgentConfig['quality']) ?? 'standard',
    adultMode: agentType === 'adult_creator',
  }

  try {
    const context = (body.context as string) ?? ''
    const urls = (body.urls as string[]) ?? []

    let result
    if (agentType === 'marketing') {
      const input: MarketingAgentInput = { task: 'campaign_brief', prompt: taskInput }
      result = await runAgent(config, { type: 'marketing', input })
    } else if (agentType === 'adult_creator') {
      const input: AdultCreatorAgentInput = { task: 'adult_text', prompt: taskInput }
      result = await runAgent(config, { type: 'adult_creator', input })
    } else if (agentType === 'customer_service') {
      const input: CustomerServiceAgentInput = { userMessage: taskInput, conversationHistory: context ? [{ role: 'user' as const, content: context }] : [] }
      result = await runAgent(config, { type: 'customer_service', input })
    } else if (agentType === 'research') {
      const input: ResearchAgentInput = { query: taskInput, ingestUrls: urls.length > 0 ? urls : undefined }
      result = await runAgent(config, { type: 'research', input })
    } else {
      // automation
      const input: AutomationAgentInput = {
        workflowName: taskInput,
        steps: [{ capability: 'chat', input: taskInput }],
      }
      result = await runAgent(config, { type: 'automation', input })
    }

    return NextResponse.json({ task: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Agent run failed' }, { status: 500 })
  }
}
