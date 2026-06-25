/**
 * POST /api/admin/marketing-workflow
 * Thin route that calls marketing-workflow.ts.
 *
 * Platform rule: payload must NOT contain providerOverride, modelOverride,
 * provider, model, or endpoint. These are stripped before calling the workflow.
 *
 * The workflow itself never picks providers — runtime decides all routing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runMarketingWorkflow as executeWorkflow } from '@/lib/marketing-workflow'
import type { MarketingWorkflowInput, SocialPlatform, ContentType } from '@/lib/marketing-workflow'

// Fields that apps must never send — strip defensively
const FORBIDDEN = ['providerOverride', 'modelOverride', 'provider', 'model', 'endpoint'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Strip forbidden provider/model override fields
  for (const field of FORBIDDEN) {
    delete body[field]
  }

  const {
    websiteUrl,
    campaignGoal,
    targetAudience,
    platforms,
    contentTypes,
    durationDays,
    budgetTier,
    qualityTier,
    approvalMode,
    appSlug,
  } = body

  if (!websiteUrl || typeof websiteUrl !== 'string') {
    return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 })
  }
  if (!campaignGoal || typeof campaignGoal !== 'string') {
    return NextResponse.json({ error: 'campaignGoal is required' }, { status: 400 })
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'platforms must be a non-empty array' }, { status: 400 })
  }
  if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
    return NextResponse.json({ error: 'contentTypes must be a non-empty array' }, { status: 400 })
  }

  const input: MarketingWorkflowInput = {
    websiteUrl,
    appSlug: typeof appSlug === 'string' ? appSlug : 'dashboard',
    campaignGoal,
    targetAudience: typeof targetAudience === 'string' ? targetAudience : undefined,
    platforms: platforms as SocialPlatform[],
    contentTypes: contentTypes as ContentType[],
    durationDays: typeof durationDays === 'number' ? durationDays : 7,
    budgetTier: (budgetTier as MarketingWorkflowInput['budgetTier']) ?? 'balanced',
    qualityTier: (qualityTier as MarketingWorkflowInput['qualityTier']) ?? 'standard',
    approvalMode: (approvalMode as 'auto' | 'manual_review') ?? 'manual_review',
  }

  try {
    const result = await executeWorkflow(input)
    return NextResponse.json({
      campaignId: result.persistedCampaignId ?? '',
      status: result.success ? 'created' : result.partialSuccess ? 'partial' : 'failed',
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
      items: result.contentCalendar ?? [],
      assets: [],
      metadata: {
        workflowId: result.workflowId,
        scrapeSuccess: result.scrapeSuccess,
        brandExtracted: result.brandExtracted,
        ragIngested: result.ragIngested,
        assetsRequested: result.assetsRequested,
        assetsGenerated: result.assetsGenerated,
        durationMs: result.durationMs,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Workflow failed' },
      { status: 500 },
    )
  }
}
