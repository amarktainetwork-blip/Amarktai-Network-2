/**
 * POST /api/admin/marketing/run
 * Thin route that runs the marketing workflow.
 *
 * Platform rule: payload must NEVER include provider, model, providerOverride,
 * modelOverride, or endpoint. These fields are stripped before calling the workflow.
 *
 * App requests a workflow; runtime selects providers automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runMarketingWorkflow } from '@/lib/marketing-workflow'
import type { MarketingWorkflowInput } from '@/lib/marketing-workflow'

// Forbidden override fields — never passed through to the workflow
const FORBIDDEN = ['provider', 'model', 'providerOverride', 'modelOverride', 'endpoint'] as const

function stripForbidden(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...obj }
  for (const key of FORBIDDEN) delete cleaned[key]
  return cleaned
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Strip any override fields before processing
  const safe = stripForbidden(body)

  const { websiteUrl, campaignGoal, targetAudience, platforms, contentTypes, durationDays, budgetTier, qualityTier, approvalMode } = safe as Partial<MarketingWorkflowInput>

  if (!websiteUrl || !campaignGoal || !Array.isArray(platforms) || !Array.isArray(contentTypes)) {
    return NextResponse.json({ error: 'websiteUrl, campaignGoal, platforms, and contentTypes are required' }, { status: 400 })
  }

  try {
    const steps: { step: string; status: string; detail?: string }[] = []
    const recordStep = (step: string, status: string, detail?: string) => steps.push({ step, status, detail })

    recordStep('validate', 'done')

    const result = await runMarketingWorkflow({
      websiteUrl: String(websiteUrl),
      campaignGoal: String(campaignGoal),
      targetAudience: typeof targetAudience === 'string' ? targetAudience : undefined,
      platforms: platforms as MarketingWorkflowInput['platforms'],
      contentTypes: contentTypes as MarketingWorkflowInput['contentTypes'],
      durationDays: typeof durationDays === 'number' ? durationDays : 7,
      budgetTier: (budgetTier as MarketingWorkflowInput['budgetTier']) ?? 'balanced',
      qualityTier: (qualityTier as MarketingWorkflowInput['qualityTier']) ?? 'standard',
      approvalMode: (approvalMode as MarketingWorkflowInput['approvalMode']) ?? 'manual_review',
      appSlug: 'dashboard',
    })

    recordStep('workflow', result.success ? 'done' : 'partial')
    if (result.scrapeSuccess) recordStep('scrape', 'done')
    if (result.brandExtracted) recordStep('brand_extraction', 'done')
    if (result.ragIngested) recordStep('rag_ingest', 'done')
    if (result.campaignPlanned) recordStep('campaign_plan', 'done')

    return NextResponse.json({
      campaignId: result.persistedCampaignId ?? '',
      campaign: {
        id: result.persistedCampaignId,
        name: result.campaignName,
        goal: result.campaignGoal,
        platforms: result.platforms,
        budgetTier: result.budgetTier,
        approvalMode: result.approvalMode,
      },
      items: result.contentCalendar ?? [],
      assets: result.persistedAssetIds.map(id => ({ id })),
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
      steps,
    })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Workflow failed',
      campaignId: '',
      campaign: {},
      items: [],
      assets: [],
      warnings: [],
      errors: [e instanceof Error ? e.message : 'Workflow failed'],
      steps: [{ step: 'workflow', status: 'failed' }],
    }, { status: 500 })
  }
}
