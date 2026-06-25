/**
 * @module campaign-storage
 * @description Durable storage for campaigns, campaign items, generated assets,
 * asset versions, and approval state.
 *
 * All provider/model fields on GeneratedAsset store what the RUNTIME selected.
 * Apps never provide provider or model — that is enforced here and in the workflow.
 *
 * Approval states: draft | pending_review | approved | rejected | needs_changes | published | failed
 *
 * Server-side only.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type ApprovalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'published'
  | 'failed'

export type CampaignStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'partial_failure'
  | 'needs_review'
  | 'failed'
  | 'archived'

export type AssetStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'published'

// ── Campaign ───────────────────────────────────────────────────────────────────

export interface CreateCampaignInput {
  appSlug: string
  workspaceId?: string
  brandId?: string
  name: string
  goal: string
  targetAudience?: string
  platforms: string[]
  contentTypes: string[]
  budgetTier: string
  qualityTier: string
  approvalMode?: 'auto' | 'manual_review'
  durationDays?: number
  websiteUrl?: string
  workflowId?: string
  metadata?: Record<string, unknown>
}

export interface StoredCampaign {
  id: string
  appSlug: string
  workspaceId: string
  brandId: string
  name: string
  goal: string
  targetAudience: string
  platforms: string[]
  contentTypes: string[]
  budgetTier: string
  qualityTier: string
  status: CampaignStatus
  approvalMode: 'auto' | 'manual_review'
  durationDays: number
  websiteUrl: string
  workflowId: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function createCampaign(input: CreateCampaignInput): Promise<StoredCampaign> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.campaign.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      brandId: input.brandId ?? '',
      name: input.name,
      goal: input.goal,
      targetAudience: input.targetAudience ?? '',
      platforms: JSON.stringify(input.platforms),
      contentTypes: JSON.stringify(input.contentTypes),
      budgetTier: input.budgetTier,
      qualityTier: input.qualityTier,
      status: 'draft',
      approvalMode: input.approvalMode ?? 'auto',
      durationDays: input.durationDays ?? 7,
      websiteUrl: input.websiteUrl ?? '',
      workflowId: input.workflowId ?? '',
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  return deserializeCampaign(row)
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  await prisma.campaign.update({ where: { id }, data: { status } })
}

export async function getCampaign(id: string): Promise<StoredCampaign | null> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.campaign.findUnique({ where: { id } })
  return row ? deserializeCampaign(row) : null
}

function deserializeCampaign(row: {
  id: string; appSlug: string; workspaceId: string; brandId: string; name: string;
  goal: string; targetAudience: string; platforms: string; contentTypes: string;
  budgetTier: string; qualityTier: string; status: string; approvalMode: string;
  durationDays: number; websiteUrl: string; workflowId: string; metadata: string;
  createdAt: Date; updatedAt: Date;
}): StoredCampaign {
  return {
    id: row.id,
    appSlug: row.appSlug,
    workspaceId: row.workspaceId,
    brandId: row.brandId,
    name: row.name,
    goal: row.goal,
    targetAudience: row.targetAudience,
    platforms: safeParseJson(row.platforms, []),
    contentTypes: safeParseJson(row.contentTypes, []),
    budgetTier: row.budgetTier,
    qualityTier: row.qualityTier,
    status: row.status as CampaignStatus,
    approvalMode: row.approvalMode as 'auto' | 'manual_review',
    durationDays: row.durationDays,
    websiteUrl: row.websiteUrl,
    workflowId: row.workflowId,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Campaign Item ──────────────────────────────────────────────────────────────

export interface CreateCampaignItemInput {
  campaignId: string
  platform: string
  contentType: string
  title?: string
  caption?: string
  script?: string
  hashtags?: string[]
  promptSummary?: string
  metadata?: Record<string, unknown>
}

export interface StoredCampaignItem {
  id: string
  campaignId: string
  platform: string
  contentType: string
  title: string
  caption: string
  script: string
  hashtags: string[]
  promptSummary: string
  scheduledFor: Date | null
  status: string
  approvalStatus: ApprovalStatus
  approvalNotes: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function createCampaignItem(input: CreateCampaignItemInput): Promise<StoredCampaignItem> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.campaignItem.create({
    data: {
      campaignId: input.campaignId,
      platform: input.platform,
      contentType: input.contentType,
      title: input.title ?? '',
      caption: input.caption ?? '',
      script: input.script ?? '',
      hashtags: JSON.stringify(input.hashtags ?? []),
      promptSummary: input.promptSummary ?? '',
      status: 'draft',
      approvalStatus: 'draft',
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  return deserializeCampaignItem(row)
}

export async function updateCampaignItemApproval(
  id: string,
  approvalStatus: ApprovalStatus,
  notes?: string,
): Promise<StoredCampaignItem> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.campaignItem.update({
    where: { id },
    data: { approvalStatus, approvalNotes: notes ?? '', status: approvalStatus },
  })
  return deserializeCampaignItem(row)
}

function deserializeCampaignItem(row: {
  id: string; campaignId: string; platform: string; contentType: string; title: string;
  caption: string; script: string; hashtags: string; promptSummary: string;
  scheduledFor: Date | null; status: string; approvalStatus: string; approvalNotes: string;
  metadata: string; createdAt: Date; updatedAt: Date;
}): StoredCampaignItem {
  return {
    id: row.id,
    campaignId: row.campaignId,
    platform: row.platform,
    contentType: row.contentType,
    title: row.title,
    caption: row.caption,
    script: row.script,
    hashtags: safeParseJson(row.hashtags, []),
    promptSummary: row.promptSummary,
    scheduledFor: row.scheduledFor,
    status: row.status,
    approvalStatus: row.approvalStatus as ApprovalStatus,
    approvalNotes: row.approvalNotes,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Generated Asset ────────────────────────────────────────────────────────────

export interface CreateGeneratedAssetInput {
  appSlug: string
  workspaceId?: string
  brandId?: string
  campaignId?: string
  campaignItemId?: string
  assetType: string
  capability: string
  /** Set by RUNTIME only — never app-provided */
  runtimeSelectedProvider?: string
  /** Set by RUNTIME only — never app-provided */
  runtimeSelectedModel?: string
  fallbackUsed?: boolean
  generationMode?: string
  promptSummary?: string
  sourceInputs?: Record<string, unknown>
  resultUrl?: string
  resultFilePath?: string
  thumbnailUrl?: string
  mimeType?: string
  durationSeconds?: number
  width?: number
  height?: number
  costCredits?: number
  latencyMs?: number
  error?: string
  metadata?: Record<string, unknown>
}

export interface StoredGeneratedAsset {
  id: string
  appSlug: string
  workspaceId: string
  brandId: string
  campaignId: string | null
  campaignItemId: string | null
  assetType: string
  capability: string
  status: AssetStatus
  approvalStatus: ApprovalStatus
  approvalNotes: string
  runtimeSelectedProvider: string
  runtimeSelectedModel: string
  fallbackUsed: boolean
  generationMode: string
  promptSummary: string
  sourceInputs: Record<string, unknown>
  resultUrl: string | null
  resultFilePath: string | null
  thumbnailUrl: string | null
  mimeType: string | null
  durationSeconds: number | null
  width: number | null
  height: number | null
  costCredits: number | null
  latencyMs: number | null
  error: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export async function createGeneratedAsset(input: CreateGeneratedAssetInput): Promise<StoredGeneratedAsset> {
  const { prisma } = await import('@/lib/prisma')
  const status: AssetStatus = input.error ? 'failed' : (input.resultUrl || input.resultFilePath) ? 'completed' : 'processing'

  const row = await prisma.generatedAsset.create({
    data: {
      appSlug: input.appSlug,
      workspaceId: input.workspaceId ?? '',
      brandId: input.brandId ?? '',
      campaignId: input.campaignId ?? null,
      campaignItemId: input.campaignItemId ?? null,
      assetType: input.assetType,
      capability: input.capability,
      status,
      approvalStatus: 'draft',
      runtimeSelectedProvider: input.runtimeSelectedProvider ?? '',
      runtimeSelectedModel: input.runtimeSelectedModel ?? '',
      fallbackUsed: input.fallbackUsed ?? false,
      generationMode: input.generationMode ?? '',
      promptSummary: input.promptSummary ?? '',
      sourceInputs: JSON.stringify(input.sourceInputs ?? {}),
      resultUrl: input.resultUrl ?? null,
      resultFilePath: input.resultFilePath ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      mimeType: input.mimeType ?? null,
      durationSeconds: input.durationSeconds ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      costCredits: input.costCredits ?? null,
      latencyMs: input.latencyMs ?? null,
      error: input.error ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })

  // Create initial version snapshot
  await createAssetVersion({
    assetId: row.id,
    versionNumber: 1,
    promptSummary: input.promptSummary ?? '',
    sourceInputs: input.sourceInputs ?? {},
    resultUrl: input.resultUrl,
    resultFilePath: input.resultFilePath,
    thumbnailUrl: input.thumbnailUrl,
    provider: input.runtimeSelectedProvider ?? '',
    model: input.runtimeSelectedModel ?? '',
    costCredits: input.costCredits,
    latencyMs: input.latencyMs,
  }).catch(() => { /* version creation is non-fatal */ })

  return deserializeAsset(row)
}

export async function updateAssetApproval(
  id: string,
  approvalStatus: ApprovalStatus,
  notes?: string,
): Promise<StoredGeneratedAsset> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.generatedAsset.update({
    where: { id },
    data: { approvalStatus, approvalNotes: notes ?? '', status: approvalStatus },
  })
  return deserializeAsset(row)
}

export async function getGeneratedAsset(id: string): Promise<StoredGeneratedAsset | null> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.generatedAsset.findUnique({ where: { id } })
  return row ? deserializeAsset(row) : null
}

export async function listAssetsByCampaign(campaignId: string): Promise<StoredGeneratedAsset[]> {
  const { prisma } = await import('@/lib/prisma')
  const rows = await prisma.generatedAsset.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(deserializeAsset)
}

function deserializeAsset(row: {
  id: string; appSlug: string; workspaceId: string; brandId: string;
  campaignId: string | null; campaignItemId: string | null;
  assetType: string; capability: string; status: string; approvalStatus: string;
  approvalNotes: string; runtimeSelectedProvider: string; runtimeSelectedModel: string;
  fallbackUsed: boolean; generationMode: string; promptSummary: string;
  sourceInputs: string; resultUrl: string | null; resultFilePath: string | null;
  thumbnailUrl: string | null; mimeType: string | null; durationSeconds: number | null;
  width: number | null; height: number | null; costCredits: number | null;
  latencyMs: number | null; error: string | null; metadata: string;
  createdAt: Date; updatedAt: Date;
}): StoredGeneratedAsset {
  return {
    id: row.id,
    appSlug: row.appSlug,
    workspaceId: row.workspaceId,
    brandId: row.brandId,
    campaignId: row.campaignId,
    campaignItemId: row.campaignItemId,
    assetType: row.assetType,
    capability: row.capability,
    status: row.status as AssetStatus,
    approvalStatus: row.approvalStatus as ApprovalStatus,
    approvalNotes: row.approvalNotes,
    runtimeSelectedProvider: row.runtimeSelectedProvider,
    runtimeSelectedModel: row.runtimeSelectedModel,
    fallbackUsed: row.fallbackUsed,
    generationMode: row.generationMode,
    promptSummary: row.promptSummary,
    sourceInputs: safeParseJson(row.sourceInputs, {}),
    resultUrl: row.resultUrl,
    resultFilePath: row.resultFilePath,
    thumbnailUrl: row.thumbnailUrl,
    mimeType: row.mimeType,
    durationSeconds: row.durationSeconds,
    width: row.width,
    height: row.height,
    costCredits: row.costCredits,
    latencyMs: row.latencyMs,
    error: row.error,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Asset Version ──────────────────────────────────────────────────────────────

export interface CreateAssetVersionInput {
  assetId: string
  versionNumber: number
  status?: string
  resultUrl?: string | null
  resultFilePath?: string | null
  thumbnailUrl?: string | null
  promptSummary?: string
  sourceInputs?: Record<string, unknown>
  provider?: string
  model?: string
  costCredits?: number | null
  latencyMs?: number | null
  metadata?: Record<string, unknown>
}

export interface StoredAssetVersion {
  id: string
  assetId: string
  versionNumber: number
  status: string
  resultUrl: string | null
  resultFilePath: string | null
  thumbnailUrl: string | null
  promptSummary: string
  sourceInputs: Record<string, unknown>
  provider: string
  model: string
  costCredits: number | null
  latencyMs: number | null
  metadata: Record<string, unknown>
  createdAt: Date
}

export async function createAssetVersion(input: CreateAssetVersionInput): Promise<StoredAssetVersion> {
  const { prisma } = await import('@/lib/prisma')
  const row = await prisma.assetVersion.create({
    data: {
      assetId: input.assetId,
      versionNumber: input.versionNumber,
      status: input.status ?? 'draft',
      resultUrl: input.resultUrl ?? null,
      resultFilePath: input.resultFilePath ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      promptSummary: input.promptSummary ?? '',
      sourceInputs: JSON.stringify(input.sourceInputs ?? {}),
      provider: input.provider ?? '',
      model: input.model ?? '',
      costCredits: input.costCredits ?? null,
      latencyMs: input.latencyMs ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  })
  return {
    id: row.id,
    assetId: row.assetId,
    versionNumber: row.versionNumber,
    status: row.status,
    resultUrl: row.resultUrl,
    resultFilePath: row.resultFilePath,
    thumbnailUrl: row.thumbnailUrl,
    promptSummary: row.promptSummary,
    sourceInputs: safeParseJson(row.sourceInputs, {}),
    provider: row.provider,
    model: row.model,
    costCredits: row.costCredits,
    latencyMs: row.latencyMs,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.createdAt,
  }
}

export async function listAssetVersions(assetId: string): Promise<StoredAssetVersion[]> {
  const { prisma } = await import('@/lib/prisma')
  const rows = await prisma.assetVersion.findMany({
    where: { assetId },
    orderBy: { versionNumber: 'desc' },
  })
  return rows.map(row => ({
    id: row.id,
    assetId: row.assetId,
    versionNumber: row.versionNumber,
    status: row.status,
    resultUrl: row.resultUrl,
    resultFilePath: row.resultFilePath,
    thumbnailUrl: row.thumbnailUrl,
    promptSummary: row.promptSummary,
    sourceInputs: safeParseJson(row.sourceInputs, {}),
    provider: row.provider,
    model: row.model,
    costCredits: row.costCredits,
    latencyMs: row.latencyMs,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.createdAt,
  }))
}

/**
 * On rejection: create a new version snapshot of the current state before
 * updating approval — preserving history for rollback.
 */
export async function rejectAssetWithVersionPreservation(
  assetId: string,
  notes: string,
): Promise<{ asset: StoredGeneratedAsset; previousVersion: StoredAssetVersion }> {
  const asset = await getGeneratedAsset(assetId)
  if (!asset) throw new Error(`Asset ${assetId} not found`)

  // Get current version count so we can create next version number
  const { prisma } = await import('@/lib/prisma')
  const versionCount = await prisma.assetVersion.count({ where: { assetId } })

  // Preserve current state as a version before rejecting
  const previousVersion = await createAssetVersion({
    assetId,
    versionNumber: versionCount + 1,
    status: 'rejected',
    resultUrl: asset.resultUrl,
    resultFilePath: asset.resultFilePath,
    thumbnailUrl: asset.thumbnailUrl,
    promptSummary: asset.promptSummary,
    sourceInputs: asset.sourceInputs,
    provider: asset.runtimeSelectedProvider,
    model: asset.runtimeSelectedModel,
    costCredits: asset.costCredits,
    latencyMs: asset.latencyMs,
    metadata: { rejectionNotes: notes },
  })

  const updatedAsset = await updateAssetApproval(assetId, 'rejected', notes)
  return { asset: updatedAsset, previousVersion }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function safeParseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}
