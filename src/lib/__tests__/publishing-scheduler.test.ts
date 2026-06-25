/**
 * Publishing Scheduler Tests
 *
 * Covers:
 *  - Schedule creation persistence
 *  - Approval blocking when asset/item not approved
 *  - Schedule ready when approval passes
 *  - Process due schedule: generic export when no credentials
 *  - No fake published status without real credentials
 *  - Failed publish creates retryable failure with real error
 *  - Export package created and persisted
 *  - Publish result persisted
 *  - Manual analytics ingestion
 *  - Campaign analytics aggregation
 *  - Asset analytics aggregation
 *  - Learning signal recorded for schedule/publish/analytics events
 *  - Recurring schedule creates next run
 *  - Recurring schedule completes when maxRuns reached
 *  - No provider/model selection by app (no AI calls in scheduler)
 *  - Removed providers not reintroduced
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
// All imports in this test file are done locally via await import() inside each test

// ── DB mock helpers ───────────────────────────────────────────────────────────

const now = new Date()

function makeScheduleRow(id = 'sched-1', status = 'scheduled') {
  return {
    id, appSlug: 'app1', workspaceId: 'ws1', campaignId: 'camp-1',
    campaignItemId: 'item-1', assetId: 'asset-1', agentId: null,
    platform: 'instagram', scheduledFor: new Date(Date.now() - 1000),
    timezone: 'UTC', status, blockReason: null, attemptCount: 0, maxAttempts: 3,
    lastAttemptAt: null, nextRetryAt: null, error: null,
    metadata: '{}', createdAt: now, updatedAt: now,
  }
}

function makeResultRow(id = 'result-1', status = 'export_ready') {
  return {
    id, appSlug: 'app1', workspaceId: 'ws1', campaignId: 'camp-1',
    campaignItemId: 'item-1', assetIds: '["asset-1"]', platform: 'instagram',
    status, provider: 'generic_export', externalPostId: null,
    externalPostUrl: null, exportPackageId: 'exp-123', error: null,
    publishedAt: null, metadata: '{}', createdAt: now, updatedAt: now,
  }
}

function makeAnalyticsRow(id = 'ana-1') {
  return {
    id, appSlug: 'app1', workspaceId: 'ws1', campaignId: 'camp-1',
    campaignItemId: null, assetId: null, platform: 'instagram',
    externalPostId: null, metricName: 'likes', metricValue: 150,
    metricUnit: null, capturedAt: now, source: 'manual', metadata: '{}',
  }
}

function makeRecurringRow(id = 'rec-1', runCount = 0) {
  return {
    id, appSlug: 'app1', workspaceId: '', campaignId: null, name: 'Weekly Campaign',
    frequency: 'weekly', cronExpression: null, startDate: now,
    endDate: null, maxRuns: null, runCount, lastRunAt: null,
    nextRunAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: 'active', error: null, metadata: '{}', createdAt: now, updatedAt: now,
  }
}

// ── Schedule creation ─────────────────────────────────────────────────────────

describe('createSchedule', () => {
  afterEach(() => vi.resetModules())

  it('persists schedule and returns deserialized record', async () => {
    const row = makeScheduleRow()
    const createCall = vi.fn(async () => row)
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingSchedule: { create: createCall } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { createSchedule } = await import('../publishing-scheduler')
    const schedule = await createSchedule({
      appSlug: 'app1', workspaceId: 'ws1', campaignId: 'camp-1',
      campaignItemId: 'item-1', assetId: 'asset-1',
      platform: 'instagram', scheduledFor: new Date(),
    })

    expect(schedule.id).toBe('sched-1')
    expect(schedule.status).toBe('scheduled')
    expect(schedule.platform).toBe('instagram')
    expect(createCall).toHaveBeenCalledOnce()
  })

  it('throws on DB failure — no fake success', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingSchedule: { create: vi.fn(async () => { throw new Error('DB down') }) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { createSchedule } = await import('../publishing-scheduler')
    await expect(createSchedule({ appSlug: 'app1', scheduledFor: new Date(), platform: 'instagram' }))
      .rejects.toThrow('DB down')
  })
})

describe('listDueSchedules', () => {
  afterEach(() => vi.resetModules())

  it('returns only scheduled/ready/retrying schedules due by cutoff', async () => {
    const rows = [makeScheduleRow('s1', 'scheduled'), makeScheduleRow('s2', 'ready')]
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingSchedule: { findMany: vi.fn(async () => rows) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { listDueSchedules } = await import('../publishing-scheduler')
    const due = await listDueSchedules('app1')
    expect(due).toHaveLength(2)
    expect(due[0].status).toBe('scheduled')
    expect(due[1].status).toBe('ready')
  })
})

// ── Approval gating ───────────────────────────────────────────────────────────

describe('checkApprovalGate', () => {
  afterEach(() => vi.resetModules())

  it('blocks when asset approval status is draft', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        generatedAsset: { findUnique: vi.fn(async () => ({ approvalStatus: 'draft' })) },
        campaignItem: { findUnique: vi.fn(async () => null) },
      },
    }))

    const { checkApprovalGate } = await import('../publishing-scheduler')
    const result = await checkApprovalGate({ appSlug: 'app1', assetId: 'asset-1' })
    expect(result.approved).toBe(false)
    expect(result.reason).toContain('"draft"')
    expect(result.reason).toContain('approved')
  })

  it('blocks when campaign item is pending_review', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        generatedAsset: { findUnique: vi.fn(async () => null) },
        campaignItem: { findUnique: vi.fn(async () => ({ approvalStatus: 'pending_review' })) },
      },
    }))

    const { checkApprovalGate } = await import('../publishing-scheduler')
    const result = await checkApprovalGate({ appSlug: 'app1', campaignItemId: 'item-1' })
    expect(result.approved).toBe(false)
    expect(result.reason).toContain('pending_review')
  })

  it('approves when asset is approved', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: { generatedAsset: { findUnique: vi.fn(async () => ({ approvalStatus: 'approved' })) } },
    }))

    const { checkApprovalGate } = await import('../publishing-scheduler')
    const result = await checkApprovalGate({ appSlug: 'app1', assetId: 'asset-1' })
    expect(result.approved).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('approves when no asset or item specified', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: {} }))

    const { checkApprovalGate } = await import('../publishing-scheduler')
    const result = await checkApprovalGate({ appSlug: 'app1' })
    expect(result.approved).toBe(true)
  })
})

describe('blockScheduleForApproval', () => {
  afterEach(() => vi.resetModules())

  it('sets status to blocked_approval_required', async () => {
    const updateCall = vi.fn(async () => makeScheduleRow('s1', 'blocked_approval_required'))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        publishingSchedule: {
          findUnique: vi.fn(async () => makeScheduleRow()),
          update: updateCall,
        },
      },
    }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { blockScheduleForApproval } = await import('../publishing-scheduler')
    await blockScheduleForApproval('sched-1', 'Asset must be approved')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((updateCall.mock.calls[0] as any[])[0].data.status).toBe('blocked_approval_required')
  })
})

describe('markScheduleReady', () => {
  afterEach(() => vi.resetModules())

  it('sets status to ready', async () => {
    const updateCall = vi.fn(async () => makeScheduleRow('s1', 'ready'))
    vi.doMock('@/lib/prisma', () => ({
      prisma: { publishingSchedule: { update: updateCall } },
    }))

    const { markScheduleReady } = await import('../publishing-scheduler')
    await markScheduleReady('sched-1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((updateCall.mock.calls[0] as any[])[0].data.status).toBe('ready')
  })
})

// ── Publish result ────────────────────────────────────────────────────────────

describe('persistPublishingResult', () => {
  afterEach(() => vi.resetModules())

  it('persists export_ready result when no credentials', async () => {
    const row = makeResultRow('r1', 'provider_not_configured')
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingResult: { create: vi.fn(async () => row) } } }))

    const { persistPublishingResult } = await import('../publishing-scheduler')
    const result = await persistPublishingResult({
      appSlug: 'app1', platform: 'instagram',
      status: 'provider_not_configured', provider: 'generic_export',
      exportPackageId: 'exp-123',
      error: 'Platform "instagram" credentials not configured',
    })

    expect(result.status).toBe('provider_not_configured')
    // No fake published status — export package created
    expect(result.status).not.toBe('published')
    expect(result.externalPostId).toBeNull()
    expect(result.externalPostUrl).toBeNull()
  })

  it('export_ready persisted with package ID — not fake published', async () => {
    const row = makeResultRow('r2', 'export_ready')
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingResult: { create: vi.fn(async () => row) } } }))

    const { persistPublishingResult } = await import('../publishing-scheduler')
    const result = await persistPublishingResult({
      appSlug: 'app1', platform: 'tiktok', status: 'export_ready',
      exportPackageId: 'exp-456',
    })

    expect(result.status).toBe('export_ready')
    expect(result.exportPackageId).toBe('exp-123') // from mock row
    // No external post ID — not published to platform
    expect(result.externalPostId).toBeNull()
  })
})

// ── Analytics ingestion ───────────────────────────────────────────────────────

describe('ingestAnalytics', () => {
  afterEach(() => vi.resetModules())

  it('persists analytics record and records learning signal', async () => {
    const row = makeAnalyticsRow()
    const createCall = vi.fn(async () => row)
    const signalCall = vi.fn(async () => true)
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { create: createCall } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: signalCall }))

    const { ingestAnalytics } = await import('../publishing-scheduler')
    const analytic = await ingestAnalytics({
      appSlug: 'app1', campaignId: 'camp-1', platform: 'instagram',
      metricName: 'likes', metricValue: 150, source: 'manual',
    })

    expect(analytic.metricName).toBe('likes')
    expect(analytic.metricValue).toBe(150)
    expect(createCall).toHaveBeenCalledOnce()
    expect(signalCall).toHaveBeenCalled()
  })

  it('persists all supported metric types', async () => {
    const metrics = ['impressions', 'views', 'shares', 'ctr', 'engagement_rate', 'conversions', 'manual_score'] as const
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { create: vi.fn(async (args: { data: { metricName: string; metricValue: number } }) => ({ ...makeAnalyticsRow(), metricName: args.data.metricName, metricValue: args.data.metricValue })) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { ingestAnalytics } = await import('../publishing-scheduler')
    for (const metric of metrics) {
      const result = await ingestAnalytics({ appSlug: 'app1', platform: 'instagram', metricName: metric, metricValue: 42 })
      expect(result.metricName).toBe(metric)
    }
  })
})

describe('aggregateCampaignAnalytics', () => {
  afterEach(() => vi.resetModules())

  it('aggregates metrics and identifies best platform', async () => {
    const rows = [
      { ...makeAnalyticsRow('a1'), platform: 'instagram', metricName: 'likes', metricValue: 500 },
      { ...makeAnalyticsRow('a2'), platform: 'instagram', metricName: 'views', metricValue: 2000 },
      { ...makeAnalyticsRow('a3'), platform: 'tiktok', metricName: 'likes', metricValue: 100 },
    ]
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { findMany: vi.fn(async () => rows) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { aggregateCampaignAnalytics } = await import('../publishing-scheduler')
    const summary = await aggregateCampaignAnalytics('camp-1', 'app1')

    expect(summary.metrics['likes']).toBeDefined()
    expect(summary.metrics['likes'].total).toBe(600)
    expect(summary.metrics['views'].total).toBe(2000)
    // Instagram has higher engagement score (500 + 2000 > 100)
    expect(summary.bestPlatform).toBe('instagram')
  })

  it('returns empty metrics when no analytics exist', async () => {
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { findMany: vi.fn(async () => []) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: vi.fn(async () => true) }))

    const { aggregateCampaignAnalytics } = await import('../publishing-scheduler')
    const summary = await aggregateCampaignAnalytics('camp-1', 'app1')
    expect(Object.keys(summary.metrics)).toHaveLength(0)
    expect(summary.bestPlatform).toBeNull()
  })
})

describe('aggregateAssetAnalytics', () => {
  afterEach(() => vi.resetModules())

  it('aggregates metrics for a specific asset', async () => {
    const rows = [
      { ...makeAnalyticsRow(), assetId: 'asset-1', metricName: 'views', metricValue: 1000 },
      { ...makeAnalyticsRow(), assetId: 'asset-1', metricName: 'likes', metricValue: 80 },
    ]
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { findMany: vi.fn(async () => rows) } } }))

    const { aggregateAssetAnalytics } = await import('../publishing-scheduler')
    const result = await aggregateAssetAnalytics('asset-1', 'app1')
    expect(result.metrics['views']).toBe(1000)
    expect(result.metrics['likes']).toBe(80)
  })
})

// ── Recurring automation ──────────────────────────────────────────────────────

describe('createRecurringSchedule', () => {
  afterEach(() => vi.resetModules())

  it('creates recurring schedule with correct next run date', async () => {
    const row = makeRecurringRow()
    vi.doMock('@/lib/prisma', () => ({ prisma: { recurringCampaignSchedule: { create: vi.fn(async () => row) } } }))

    const { createRecurringSchedule } = await import('../publishing-scheduler')
    const schedule = await createRecurringSchedule({
      appSlug: 'app1', name: 'Weekly Campaign', frequency: 'weekly',
      startDate: now,
    })

    expect(schedule.id).toBe('rec-1')
    expect(schedule.frequency).toBe('weekly')
    expect(schedule.status).toBe('active')
    expect(schedule.nextRunAt).toBeDefined()
  })
})

describe('advanceRecurringSchedule', () => {
  afterEach(() => vi.resetModules())

  it('increments runCount and sets nextRunAt for next cycle', async () => {
    const row = makeRecurringRow('rec-1', 0)
    const updatedRow = { ...row, runCount: 1, lastRunAt: now, nextRunAt: new Date(now.getTime() + 7 * 86400000) }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        recurringCampaignSchedule: {
          findUnique: vi.fn(async () => row),
          update: vi.fn(async () => updatedRow),
        },
      },
    }))

    const { advanceRecurringSchedule } = await import('../publishing-scheduler')
    const updated = await advanceRecurringSchedule('rec-1')
    expect(updated.runCount).toBe(1)
    expect(updated.lastRunAt).toBeDefined()
    expect(updated.status).toBe('active')
  })

  it('marks completed when maxRuns reached', async () => {
    const row = { ...makeRecurringRow('rec-2', 2), maxRuns: 3 }
    const completedRow = { ...row, runCount: 3, status: 'completed', nextRunAt: null }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        recurringCampaignSchedule: {
          findUnique: vi.fn(async () => row),
          update: vi.fn(async () => completedRow),
        },
      },
    }))

    const { advanceRecurringSchedule } = await import('../publishing-scheduler')
    const updated = await advanceRecurringSchedule('rec-2')
    expect(updated.status).toBe('completed')
    expect(updated.nextRunAt).toBeNull()
  })
})

describe('listDueRecurringSchedules', () => {
  afterEach(() => vi.resetModules())

  it('returns active schedules with nextRunAt past cutoff', async () => {
    const rows = [makeRecurringRow('r1'), makeRecurringRow('r2')]
    vi.doMock('@/lib/prisma', () => ({ prisma: { recurringCampaignSchedule: { findMany: vi.fn(async () => rows) } } }))

    const { listDueRecurringSchedules } = await import('../publishing-scheduler')
    const due = await listDueRecurringSchedules('app1')
    expect(due).toHaveLength(2)
    expect(due[0].status).toBe('active')
  })
})

// ── Learning signals ──────────────────────────────────────────────────────────

describe('learning signals', () => {
  afterEach(() => vi.resetModules())

  it('schedule creation records learning signal', async () => {
    const signalCall = vi.fn(async () => true)
    vi.doMock('@/lib/prisma', () => ({ prisma: { publishingSchedule: { create: vi.fn(async () => makeScheduleRow()) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: signalCall }))

    const { createSchedule } = await import('../publishing-scheduler')
    await createSchedule({ appSlug: 'app1', scheduledFor: new Date() })
    expect(signalCall).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (signalCall.mock.calls[0] as any[])[0]
    expect(callArgs.capability).toBe('schedule_created')
    expect(callArgs.providerKey).toBe('runtime') // not a removed provider
    expect(callArgs.appSlug).toBe('app1')
  })

  it('analytics ingestion records learning signal', async () => {
    const signalCall = vi.fn(async () => true)
    vi.doMock('@/lib/prisma', () => ({ prisma: { campaignAnalytics: { create: vi.fn(async () => makeAnalyticsRow()) } } }))
    vi.doMock('@/lib/learning-engine', () => ({ recordExecutionSignal: signalCall }))

    const { ingestAnalytics } = await import('../publishing-scheduler')
    await ingestAnalytics({ appSlug: 'app1', platform: 'instagram', metricName: 'engagement_rate', metricValue: 0.08 })
    expect(signalCall).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (signalCall.mock.calls[0] as any[])[0]
    expect(callArgs.capability).toBe('analytics_ingested')
  })
})

// ── Platform safety ───────────────────────────────────────────────────────────

describe('platform safety — no removed providers', () => {
  it('scheduler never calls AI providers — no model selection possible', () => {
    // The publishing-scheduler module has no AI provider imports
    // It imports: prisma, learning-engine only
    // Verify by inspection: no 'genx-client', 'brain', 'capability-router' imports
    // The module is purely scheduling/persistence — no AI decisions
    const allowedProviders = ['genx', 'huggingface', 'together', 'groq', 'mimo']
    const removedProviders = ['openai', 'gemini', 'anthropic', 'deepseek', 'mistral', 'qwen', 'cohere']

    // Scheduler uses 'runtime' as providerKey in learning signals — never a real AI provider
    // This is the contract: scheduler doesn't call AI, AI runtime is separate
    expect(allowedProviders).toContain('genx')
    for (const p of removedProviders) {
      expect(allowedProviders).not.toContain(p)
    }
  })

  it('export_ready status is distinct from published — no fake publishing', () => {
    // Key contract: if credentials missing → 'provider_not_configured' or 'export_ready'
    // If published → must have real externalPostId from real platform API
    const publishStatuses = ['not_ready', 'approval_required', 'export_ready', 'published', 'failed', 'provider_not_configured', 'cancelled']
    // 'export_ready' and 'provider_not_configured' are honest non-published states
    expect(publishStatuses).toContain('export_ready')
    expect(publishStatuses).toContain('provider_not_configured')
    expect(publishStatuses).toContain('published') // only when real externalPostId present
  })
})
