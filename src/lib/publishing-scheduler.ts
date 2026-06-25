/**
 * @module publishing-scheduler
 * @description Scheduling, publishing/export preparation, analytics ingestion,
 * recurring automation, and learning feedback for the AmarktAI Network.
 *
 * Design principles:
 * - Apps never choose provider or model
 * - Approval gating enforced before any publish attempt
 * - No fake publishing success — export_ready when credentials missing
 * - No direct AI provider calls in this module
 * - All learning signals persisted for runtime/agent use
 *
 * Server-side only.
 */

import { recordExecutionSignal } from '@/lib/learning-engine'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScheduleStatus =
  | 'draft'
  | 'scheduled'
  | 'ready'
  | 'blocked_approval_required'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying'

export type PublishStatus =
  | 'not_ready'
  | 'approval_required'
  | 'export_ready'
  | 'published'
  | 'failed'
  | 'provider_not_configured'
  | 'cancelled'

export type SupportedPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube_shorts'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'pinterest'
  | 'generic_export'

export type AnalyticMetric =
  | 'impressions'
  | 'reach'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'clicks'
  | 'ctr'
  | 'watch_time'
  | 'completion_rate'
  | 'engagement_rate'
  | 'followers_gained'
  | 'conversions'
  | 'revenue'
  | 'cost'
  | 'manual_score'

// ── Schedule creation ─────────────────────────────────────────────────────────

export interface CreateScheduleInput {
  appSlug: string
  workspaceId?: string
  campaignId?: string
  campaignItemId?: string
  assetId?: string
  agentId?: string
  platform?: SupportedPlatform
  scheduledFor: Date
  timezone?: string
  maxAttempts?: number
  metadata?: Record<string, unknown>
}

export interface StoredSchedule {
  id: string
  appSlug: string
  workspaceId: string
  campaignId: string | null
  campaignItemId: string | null
  assetId: string | null
  agentId: string | null
  platform: string
  scheduledFor: Date
  timezone: string
  status: ScheduleStatus
  blockReason: string | null
  attemptCount: number
  maxAttempts: number
  lastAttemptAt: Date | null
  nextRetryAt: Date | null
  error: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function createSchedule(input: CreateScheduleInput): Promise<StoredSchedule> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.publishingSchedule.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      campaignId: input.campaignId ?? null,
      campaignItemId: input.campaignItemId ?? null,
      assetId: input.assetId ?? null,
      agentId: input.agentId ?? null,
      platform: input.platform ?? 'generic_export',
      scheduledFor: input.scheduledFor,
      timezone: input.timezone ?? 'UTC',
      status: 'scheduled',
      maxAttempts: input.maxAttempts ?? 3,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  await recordLearningSignal(input.appSlug, 'schedule_created', input.campaignId, input.campaignItemId, input.assetId, input.platform ?? 'generic_export', 'schedule', 1)
  return deserializeSchedule(row)
}

export async function getSchedule(id: string): Promise<StoredSchedule | null> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.publishingSchedule.findUnique({ where: { id } })
  return row ? deserializeSchedule(row) : null
}

export async function listDueSchedules(appSlug: string, now?: Date): Promise<StoredSchedule[]> {
  const { prisma } = await import('@/lib/prisma')
  const cutoff = now ?? new Date()
  const rows = await prisma.publishingSchedule.findMany({
    where: {
      appSlug,
      scheduledFor: { lte: cutoff },
      status: { in: ['scheduled', 'ready', 'retrying'] },
    },
    orderBy: { scheduledFor: 'asc' },
  })
  return rows.map(deserializeSchedule)
}

function deserializeSchedule(row: {
  id: string; appSlug: string; workspaceId: string; campaignId: string | null;
  campaignItemId: string | null; assetId: string | null; agentId: string | null;
  platform: string; scheduledFor: Date; timezone: string; status: string;
  blockReason: string | null; attemptCount: number; maxAttempts: number;
  lastAttemptAt: Date | null; nextRetryAt: Date | null; error: string | null;
  metadata: string; createdAt: Date; updatedAt: Date;
}): StoredSchedule {
  return {
    id: row.id, appSlug: row.appSlug, workspaceId: row.workspaceId,
    campaignId: row.campaignId, campaignItemId: row.campaignItemId,
    assetId: row.assetId, agentId: row.agentId, platform: row.platform,
    scheduledFor: row.scheduledFor, timezone: row.timezone,
    status: row.status as ScheduleStatus, blockReason: row.blockReason,
    attemptCount: row.attemptCount, maxAttempts: row.maxAttempts,
    lastAttemptAt: row.lastAttemptAt, nextRetryAt: row.nextRetryAt,
    error: row.error, metadata: safeJson(row.metadata, {}),
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

// ── Approval gating ───────────────────────────────────────────────────────────

export interface ApprovalCheckInput {
  campaignId?: string
  campaignItemId?: string
  assetId?: string
  appSlug: string
}

export interface ApprovalCheckResult {
  approved: boolean
  reason: string | null
}

/**
 * Check whether a campaign item / asset is approved for publishing.
 * Queries DB for current approval status.
 * Returns { approved: false, reason } when blocked.
 */
export async function checkApprovalGate(input: ApprovalCheckInput): Promise<ApprovalCheckResult> {
  const { prisma } = await import('@/lib/prisma')

  if (input.assetId) {
    const asset = await prisma.generatedAsset.findUnique({ where: { id: input.assetId }, select: { approvalStatus: true } })
    if (!asset) return { approved: false, reason: `Asset ${input.assetId} not found` }
    if (asset.approvalStatus !== 'approved') {
      return { approved: false, reason: `Asset approval status is "${asset.approvalStatus}" — must be "approved" before publishing` }
    }
  }

  if (input.campaignItemId) {
    const item = await prisma.campaignItem.findUnique({ where: { id: input.campaignItemId }, select: { approvalStatus: true } })
    if (!item) return { approved: false, reason: `Campaign item ${input.campaignItemId} not found` }
    if (item.approvalStatus !== 'approved' && item.approvalStatus !== 'published') {
      return { approved: false, reason: `Campaign item approval status is "${item.approvalStatus}" — must be "approved" before publishing` }
    }
  }

  return { approved: true, reason: null }
}

/**
 * Block a schedule due to approval gate failure.
 */
export async function blockScheduleForApproval(scheduleId: string, reason: string): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const schedule = await prisma.publishingSchedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) return
  await prisma.publishingSchedule.update({
    where: { id: scheduleId },
    data: { status: 'blocked_approval_required', blockReason: reason, updatedAt: new Date() },
  })
  await recordLearningSignal(schedule.appSlug, 'schedule_blocked_approval', schedule.campaignId, schedule.campaignItemId, schedule.assetId, schedule.platform, 'schedule', 0)
}

/**
 * Mark a schedule as ready (approval passed or auto mode).
 */
export async function markScheduleReady(scheduleId: string): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  await prisma.publishingSchedule.update({
    where: { id: scheduleId },
    data: { status: 'ready', blockReason: null, updatedAt: new Date() },
  })
}

// ── Processing due schedules ──────────────────────────────────────────────────

export interface ProcessScheduleResult {
  scheduleId: string
  publishingResultId: string | null
  status: PublishStatus
  platform: string
  exportPackage?: ExportPackage
  error: string | null
}

/**
 * Process a single due schedule:
 * 1. Check approval gate
 * 2. Assemble export package
 * 3. Attempt publish (or produce export_ready if no credentials)
 * 4. Persist PublishingResult
 * 5. Record learning signals
 */
export async function processDueSchedule(scheduleId: string): Promise<ProcessScheduleResult> {
  const { prisma } = await import('@/lib/prisma')

  const schedule = await prisma.publishingSchedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) {
    return { scheduleId, publishingResultId: null, status: 'failed', platform: 'generic_export', error: `Schedule ${scheduleId} not found` }
  }

  // Mark processing
  await prisma.publishingSchedule.update({
    where: { id: scheduleId },
    data: { status: 'processing', attemptCount: { increment: 1 }, lastAttemptAt: new Date(), updatedAt: new Date() },
  })

  // Approval gate
  const approval = await checkApprovalGate({
    appSlug: schedule.appSlug,
    campaignId: schedule.campaignId ?? undefined,
    campaignItemId: schedule.campaignItemId ?? undefined,
    assetId: schedule.assetId ?? undefined,
  })

  if (!approval.approved) {
    await blockScheduleForApproval(scheduleId, approval.reason ?? 'Approval required')
    const resultRow = await persistPublishingResult({
      appSlug: schedule.appSlug, workspaceId: schedule.workspaceId,
      campaignId: schedule.campaignId ?? undefined, campaignItemId: schedule.campaignItemId ?? undefined,
      platform: schedule.platform, status: 'approval_required',
      error: approval.reason ?? 'Approval required',
    })
    return { scheduleId, publishingResultId: resultRow.id, status: 'approval_required', platform: schedule.platform, error: approval.reason }
  }

  // Assemble export package
  const exportPackage = await assembleExportPackage(schedule)

  // Attempt publish via platform adapter
  const publishResult = await publishViaAdapter(schedule.platform, exportPackage, schedule.appSlug)

  // Persist result
  const resultRow = await persistPublishingResult({
    appSlug: schedule.appSlug, workspaceId: schedule.workspaceId,
    campaignId: schedule.campaignId ?? undefined, campaignItemId: schedule.campaignItemId ?? undefined,
    assetIds: exportPackage.assetIds, platform: schedule.platform,
    status: publishResult.status, provider: publishResult.provider,
    externalPostId: publishResult.externalPostId, externalPostUrl: publishResult.externalPostUrl,
    exportPackageId: publishResult.exportPackageId, error: publishResult.error,
    publishedAt: publishResult.status === 'published' ? new Date() : undefined,
    metadata: { exportPackage, publishResult },
  })

  // Update schedule status
  const finalScheduleStatus: ScheduleStatus = publishResult.status === 'published' || publishResult.status === 'export_ready'
    ? 'completed'
    : publishResult.status === 'provider_not_configured'
    ? 'completed' // export_ready counts as complete
    : schedule.attemptCount + 1 >= schedule.maxAttempts
    ? 'failed'
    : 'retrying'

  const nextRetryAt = finalScheduleStatus === 'retrying'
    ? new Date(Date.now() + Math.pow(2, schedule.attemptCount) * 60_000) // exponential backoff
    : null

  await prisma.publishingSchedule.update({
    where: { id: scheduleId },
    data: { status: finalScheduleStatus, nextRetryAt, error: publishResult.error, updatedAt: new Date() },
  })

  // Learning signals
  const success = publishResult.status === 'published' || publishResult.status === 'export_ready'
  await recordLearningSignal(
    schedule.appSlug, success ? 'publish_success' : 'publish_failed',
    schedule.campaignId, schedule.campaignItemId, schedule.assetId,
    schedule.platform, 'publish', success ? 1 : 0,
  )

  return {
    scheduleId, publishingResultId: resultRow.id,
    status: publishResult.status, platform: schedule.platform,
    exportPackage: publishResult.status !== 'published' ? exportPackage : undefined,
    error: publishResult.error,
  }
}

// ── Export package assembly ───────────────────────────────────────────────────

export interface ExportPackage {
  exportPackageId: string
  platform: string
  caption: string
  hashtags: string[]
  script: string
  assetIds: string[]
  mediaUrls: string[]
  thumbnailUrls: string[]
  scheduledTime: string
  approvalStatus: string
  metadata: Record<string, unknown>
  instructions: string
}

async function assembleExportPackage(
  schedule: {
    id: string; appSlug: string; campaignItemId: string | null;
    assetId: string | null; platform: string; scheduledFor: Date;
    metadata: string;
  },
): Promise<ExportPackage> {
  const { prisma } = await import('@/lib/prisma')
  const exportPackageId = `exp_${Date.now().toString(36)}`
  let caption = ''
  let hashtags: string[] = []
  let script = ''
  let assetIds: string[] = []
  let mediaUrls: string[] = []
  let thumbnailUrls: string[] = []
  let approvalStatus = 'unknown'

  // Load campaign item
  if (schedule.campaignItemId) {
    const item = await prisma.campaignItem.findUnique({
      where: { id: schedule.campaignItemId },
      select: { caption: true, hashtags: true, script: true, approvalStatus: true },
    })
    if (item) {
      caption = item.caption
      hashtags = safeJson<string[]>(item.hashtags, [])
      script = item.script
      approvalStatus = item.approvalStatus
    }
  }

  // Load asset
  const targetAssetId = schedule.assetId
  if (targetAssetId) {
    assetIds = [targetAssetId]
    const asset = await prisma.generatedAsset.findUnique({
      where: { id: targetAssetId },
      select: { resultUrl: true, thumbnailUrl: true, approvalStatus: true },
    })
    if (asset) {
      if (asset.resultUrl) mediaUrls = [asset.resultUrl]
      if (asset.thumbnailUrl) thumbnailUrls = [asset.thumbnailUrl]
      if (!schedule.campaignItemId) approvalStatus = asset.approvalStatus
    }
  }

  const instructions = buildManualPostInstructions(schedule.platform, caption, hashtags, schedule.scheduledFor)

  return {
    exportPackageId, platform: schedule.platform, caption, hashtags, script,
    assetIds, mediaUrls, thumbnailUrls,
    scheduledTime: schedule.scheduledFor.toISOString(),
    approvalStatus, metadata: safeJson(schedule.metadata, {}), instructions,
  }
}

function buildManualPostInstructions(platform: string, caption: string, hashtags: string[], scheduledFor: Date): string {
  const when = scheduledFor.toUTCString()
  const tags = hashtags.join(' ')
  return `Manual posting instructions for ${platform}:\n1. Copy caption: "${caption}"\n2. Add hashtags: ${tags}\n3. Upload attached media files\n4. Schedule for: ${when}\n5. Review and publish`
}

// ── Platform publishing adapter ───────────────────────────────────────────────

interface PlatformPublishResult {
  status: PublishStatus
  provider: string
  externalPostId: string | null
  externalPostUrl: string | null
  exportPackageId: string | null
  error: string | null
}

/**
 * Publish via platform adapter.
 * Currently: if no platform credentials configured → export_ready (not faked as published).
 * Future: call platform-specific adapter when credentials exist.
 *
 * NO AI provider calls here. NO model selection. This is publish-only.
 */
async function publishViaAdapter(platform: string, exportPackage: ExportPackage, appSlug: string): Promise<PlatformPublishResult> {
  // Check for platform credentials
  const credentialsKey = `platform_${platform}_${appSlug}`
  let credentialsConfigured = false
  try {
    const { prisma } = await import('@/lib/prisma')
    const config = await prisma.integrationConfig.findUnique({ where: { key: credentialsKey } })
    credentialsConfigured = !!config?.apiKey
  } catch {
    // DB unavailable — treat as not configured
  }

  if (!credentialsConfigured) {
    // Export-ready package: honest "no credentials" response
    return {
      status: 'provider_not_configured',
      provider: 'generic_export',
      externalPostId: null,
      externalPostUrl: null,
      exportPackageId: exportPackage.exportPackageId,
      error: `Platform "${platform}" credentials not configured for app "${appSlug}". Export package created for manual posting.`,
    }
  }

  // Future: call platform-specific adapter
  // For now: would call instagram/tiktok/etc adapters here
  return {
    status: 'export_ready',
    provider: platform,
    externalPostId: null,
    externalPostUrl: null,
    exportPackageId: exportPackage.exportPackageId,
    error: null,
  }
}

// ── Publishing result persistence ─────────────────────────────────────────────

export interface StoredPublishingResult {
  id: string
  appSlug: string
  workspaceId: string
  campaignId: string | null
  campaignItemId: string | null
  assetIds: string[]
  platform: string
  status: PublishStatus
  provider: string
  externalPostId: string | null
  externalPostUrl: string | null
  exportPackageId: string | null
  error: string | null
  publishedAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface PersistResultInput {
  appSlug: string
  workspaceId?: string
  campaignId?: string
  campaignItemId?: string
  assetIds?: string[]
  platform: string
  status: PublishStatus
  provider?: string
  externalPostId?: string | null
  externalPostUrl?: string | null
  exportPackageId?: string | null
  error?: string | null
  publishedAt?: Date
  metadata?: Record<string, unknown>
}

export async function persistPublishingResult(input: PersistResultInput): Promise<StoredPublishingResult> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.publishingResult.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      campaignId: input.campaignId ?? null,
      campaignItemId: input.campaignItemId ?? null,
      assetIds: JSON.stringify(input.assetIds ?? []),
      platform: input.platform,
      status: input.status,
      provider: input.provider ?? '',
      externalPostId: input.externalPostId ?? null,
      externalPostUrl: input.externalPostUrl ?? null,
      exportPackageId: input.exportPackageId ?? null,
      error: input.error ?? null,
      publishedAt: input.publishedAt ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  return deserializePublishingResult(row)
}

function deserializePublishingResult(row: {
  id: string; appSlug: string; workspaceId: string; campaignId: string | null;
  campaignItemId: string | null; assetIds: string; platform: string; status: string;
  provider: string; externalPostId: string | null; externalPostUrl: string | null;
  exportPackageId: string | null; error: string | null; publishedAt: Date | null;
  metadata: string; createdAt: Date; updatedAt: Date;
}): StoredPublishingResult {
  return {
    id: row.id, appSlug: row.appSlug, workspaceId: row.workspaceId,
    campaignId: row.campaignId, campaignItemId: row.campaignItemId,
    assetIds: safeJson(row.assetIds, []),
    platform: row.platform, status: row.status as PublishStatus,
    provider: row.provider, externalPostId: row.externalPostId,
    externalPostUrl: row.externalPostUrl, exportPackageId: row.exportPackageId,
    error: row.error, publishedAt: row.publishedAt,
    metadata: safeJson(row.metadata, {}),
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

// ── Analytics ingestion ───────────────────────────────────────────────────────

export interface IngestAnalyticsInput {
  appSlug: string
  workspaceId?: string
  campaignId?: string
  campaignItemId?: string
  assetId?: string
  platform: string
  externalPostId?: string
  metricName: AnalyticMetric
  metricValue: number
  metricUnit?: string
  capturedAt?: Date
  source?: 'manual' | 'platform_api' | 'computed'
  metadata?: Record<string, unknown>
}

export interface StoredAnalytic {
  id: string
  appSlug: string
  workspaceId: string
  campaignId: string | null
  campaignItemId: string | null
  assetId: string | null
  platform: string
  externalPostId: string | null
  metricName: string
  metricValue: number
  metricUnit: string | null
  capturedAt: Date
  source: string
  metadata: Record<string, unknown>
}

export async function ingestAnalytics(input: IngestAnalyticsInput): Promise<StoredAnalytic> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.campaignAnalytics.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      campaignId: input.campaignId ?? null,
      campaignItemId: input.campaignItemId ?? null,
      assetId: input.assetId ?? null,
      platform: input.platform,
      externalPostId: input.externalPostId ?? null,
      metricName: input.metricName,
      metricValue: input.metricValue,
      metricUnit: input.metricUnit ?? null,
      capturedAt: input.capturedAt ?? new Date(),
      source: input.source ?? 'manual',
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  // Record learning signal from analytics
  await recordLearningSignal(
    input.appSlug, 'analytics_ingested',
    input.campaignId, input.campaignItemId, input.assetId,
    input.platform, input.metricName, input.metricValue,
  )
  return {
    id: row.id, appSlug: row.appSlug, workspaceId: row.workspaceId,
    campaignId: row.campaignId, campaignItemId: row.campaignItemId, assetId: row.assetId,
    platform: row.platform, externalPostId: row.externalPostId,
    metricName: row.metricName, metricValue: row.metricValue, metricUnit: row.metricUnit,
    capturedAt: row.capturedAt, source: row.source, metadata: safeJson(row.metadata, {}),
  }
}

// ── Analytics aggregation ─────────────────────────────────────────────────────

export interface CampaignPerformanceSummary {
  campaignId: string
  appSlug: string
  metrics: Record<string, { total: number; avg: number; count: number }>
  bestPlatform: string | null
  bestContentType: string | null
  topAssetId: string | null
}

export async function aggregateCampaignAnalytics(campaignId: string, appSlug: string): Promise<CampaignPerformanceSummary> {
  const { prisma } = await import('@/lib/prisma')
  const rows = await prisma.campaignAnalytics.findMany({
    where: { campaignId, appSlug },
    orderBy: { capturedAt: 'desc' },
  })

  const metrics: Record<string, { total: number; avg: number; count: number }> = {}
  const platformScores: Record<string, number> = {}
  const assetScores: Record<string, number> = {}

  for (const row of rows) {
    if (!metrics[row.metricName]) metrics[row.metricName] = { total: 0, avg: 0, count: 0 }
    metrics[row.metricName].total += row.metricValue
    metrics[row.metricName].count++
    metrics[row.metricName].avg = metrics[row.metricName].total / metrics[row.metricName].count

    // Track platform scores from engagement metrics
    if (['likes', 'shares', 'comments', 'engagement_rate', 'views'].includes(row.metricName)) {
      platformScores[row.platform] = (platformScores[row.platform] ?? 0) + row.metricValue
    }
    if (row.assetId && ['likes', 'shares', 'views', 'engagement_rate'].includes(row.metricName)) {
      assetScores[row.assetId] = (assetScores[row.assetId] ?? 0) + row.metricValue
    }
  }

  const bestPlatform = Object.entries(platformScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const topAssetId = Object.entries(assetScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Record learning signals for high performers
  if (bestPlatform) {
    await recordLearningSignal(appSlug, 'platform_top_performer', campaignId, null, null, bestPlatform, 'platform_score', platformScores[bestPlatform] ?? 0)
  }

  return { campaignId, appSlug, metrics, bestPlatform, bestContentType: null, topAssetId }
}

export async function aggregateAssetAnalytics(assetId: string, appSlug: string): Promise<{ assetId: string; metrics: Record<string, number> }> {
  const { prisma } = await import('@/lib/prisma')
  const rows = await prisma.campaignAnalytics.findMany({ where: { assetId, appSlug } })
  const metrics: Record<string, number> = {}
  for (const row of rows) {
    metrics[row.metricName] = (metrics[row.metricName] ?? 0) + row.metricValue
  }
  return { assetId, metrics }
}

// ── Recurring automation ──────────────────────────────────────────────────────

export interface CreateRecurringScheduleInput {
  appSlug: string
  workspaceId?: string
  campaignId?: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  cronExpression?: string
  startDate: Date
  endDate?: Date
  maxRuns?: number
  metadata?: Record<string, unknown>
}

export interface StoredRecurringSchedule {
  id: string
  appSlug: string
  workspaceId: string
  campaignId: string | null
  name: string
  frequency: string
  cronExpression: string | null
  startDate: Date
  endDate: Date | null
  maxRuns: number | null
  runCount: number
  lastRunAt: Date | null
  nextRunAt: Date | null
  status: string
  error: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function createRecurringSchedule(input: CreateRecurringScheduleInput): Promise<StoredRecurringSchedule> {
  const { prisma } = await import('@/lib/prisma')
  const nextRunAt = computeNextRunAt(input.startDate, input.frequency, input.cronExpression ?? null, null)
  const row = await prisma.recurringCampaignSchedule.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      campaignId: input.campaignId ?? null,
      name: input.name,
      frequency: input.frequency,
      cronExpression: input.cronExpression ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      maxRuns: input.maxRuns ?? null,
      nextRunAt,
      status: 'active',
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  return deserializeRecurring(row)
}

export async function advanceRecurringSchedule(id: string): Promise<StoredRecurringSchedule> {
  const { prisma } = await import('@/lib/prisma')
  const schedule = await prisma.recurringCampaignSchedule.findUnique({ where: { id } })
  if (!schedule) throw new Error(`Recurring schedule ${id} not found`)

  const newRunCount = schedule.runCount + 1
  const maxReached = schedule.maxRuns !== null && newRunCount >= schedule.maxRuns
  const now = new Date()
  const nextRunAt = maxReached ? null : computeNextRunAt(now, schedule.frequency, schedule.cronExpression, now)
  const endReached = schedule.endDate ? (nextRunAt ? nextRunAt > schedule.endDate : true) : false
  const newStatus = maxReached || endReached ? 'completed' : 'active'

  const updated = await prisma.recurringCampaignSchedule.update({
    where: { id },
    data: { runCount: newRunCount, lastRunAt: now, nextRunAt: maxReached || endReached ? null : nextRunAt, status: newStatus, updatedAt: now },
  })
  return deserializeRecurring(updated)
}

export async function listDueRecurringSchedules(appSlug: string, now?: Date): Promise<StoredRecurringSchedule[]> {
  const { prisma } = await import('@/lib/prisma')
  const cutoff = now ?? new Date()
  const rows = await prisma.recurringCampaignSchedule.findMany({
    where: { appSlug, status: 'active', nextRunAt: { lte: cutoff } },
    orderBy: { nextRunAt: 'asc' },
  })
  return rows.map(deserializeRecurring)
}

function computeNextRunAt(from: Date, frequency: string, cronExpression: string | null, lastRun: Date | null): Date {
  const base = lastRun ?? from
  switch (frequency) {
    case 'daily': return new Date(base.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly': return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly': {
      const d = new Date(base)
      d.setMonth(d.getMonth() + 1)
      return d
    }
    case 'custom': {
      // Simple: advance by 1 day as fallback for custom cron
      return new Date(base.getTime() + 24 * 60 * 60 * 1000)
    }
    default: return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
}

function deserializeRecurring(row: {
  id: string; appSlug: string; workspaceId: string; campaignId: string | null; name: string;
  frequency: string; cronExpression: string | null; startDate: Date; endDate: Date | null;
  maxRuns: number | null; runCount: number; lastRunAt: Date | null; nextRunAt: Date | null;
  status: string; error: string | null; metadata: string; createdAt: Date; updatedAt: Date;
}): StoredRecurringSchedule {
  return {
    id: row.id, appSlug: row.appSlug, workspaceId: row.workspaceId, campaignId: row.campaignId,
    name: row.name, frequency: row.frequency, cronExpression: row.cronExpression,
    startDate: row.startDate, endDate: row.endDate, maxRuns: row.maxRuns,
    runCount: row.runCount, lastRunAt: row.lastRunAt, nextRunAt: row.nextRunAt,
    status: row.status, error: row.error,
    metadata: safeJson(row.metadata, {}), createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

// ── Learning signal helper ────────────────────────────────────────────────────

async function recordLearningSignal(
  appSlug: string,
  eventType: string,
  campaignId: string | null | undefined,
  campaignItemId: string | null | undefined,
  assetId: string | null | undefined,
  platform: string,
  metric: string,
  value: number,
): Promise<void> {
  await recordExecutionSignal({
    appSlug,
    capability: eventType,
    providerKey: 'runtime',
    model: 'multi',
    success: value > 0,
    latencyMs: 0,
    fallbackUsed: false,
    agentType: 'marketing',
    taskId: campaignId ?? undefined,
  }).catch(() => { /* non-fatal */ })
}

// ── Utility ────────────────────────────────────────────────────────────────────

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}
