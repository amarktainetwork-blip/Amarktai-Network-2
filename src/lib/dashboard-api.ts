/**
 * @module dashboard-api
 * @description Typed fetch helpers for the AmarktAI dashboard frontend.
 *
 * Platform rule:
 *   App workflow payloads NEVER include provider, model, providerOverride,
 *   modelOverride, or endpoint. stripProviderOverrides enforces this at the call site.
 *
 * Client-safe (no server imports). Uses native fetch.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface VpsCheck {
  name: string
  status: HealthStatus
  message: string
  value: number | string | null
  threshold: { warning?: number | string; critical?: number | string } | null
  checkedAt: string
  durationMs: number
  metadata: Record<string, unknown>
}

export interface VpsReadinessResult {
  status: HealthStatus
  checkedAt: string
  summary: string
  upgradeRecommended: boolean
  upgradeReasons: string[]
  blockingIssues: string[]
  warningIssues: string[]
  checks: VpsCheck[]
  alerts: string[]
}

export interface MarketingWorkflowPayload {
  websiteUrl: string
  campaignGoal: string
  targetAudience?: string
  platforms: string[]
  contentTypes: string[]
  durationDays?: number
  budgetTier: 'cheap' | 'balanced' | 'premium'
  qualityTier: 'basic' | 'standard' | 'high' | 'premium'
  approvalMode?: 'auto' | 'manual_review'
}

export interface MarketingWorkflowResult {
  campaignId: string
  campaign: Record<string, unknown>
  items: unknown[]
  assets: unknown[]
  warnings: string[]
  errors: string[]
  steps: { step: string; status: string; detail?: string }[]
}

export interface CampaignSummary {
  id: string
  name: string
  goal: string
  status: string
  approvalMode: string
  platforms: string[]
  createdAt: string
  updatedAt: string
}

export interface AssetSummary {
  id: string
  assetType: string
  capability: string
  status: string
  approvalStatus: string
  approvalNotes: string
  promptSummary: string
  resultUrl: string | null
  createdAt: string
}

export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'needs_changes' | 'published' | 'failed'

export interface ApprovalTarget {
  id: string
  type: 'asset' | 'campaign_item'
  title?: string
  approvalStatus: ApprovalStatus
  assetType?: string
  platform?: string
  resultUrl?: string | null
  approvalNotes: string
  campaignId?: string
  updatedAt: string
}

export interface ProviderStatusEntry {
  key: string
  displayName: string
  configured: boolean
  connected?: boolean
  status: string
  reason?: string
  keySource?: string
  capabilities?: string[]
  latencyMs?: number | null
  lastError?: string | null
  lastTestedAt?: string | null
}

export interface ApiResult<T> {
  ok: boolean
  data: T | null
  error: string | null
}

// ── Forbidden field stripping ──────────────────────────────────────────────────

const FORBIDDEN_FIELDS = ['providerOverride', 'modelOverride', 'provider', 'model', 'endpoint'] as const
type ForbiddenField = typeof FORBIDDEN_FIELDS[number]

export function stripProviderOverrides<T extends Record<string, unknown>>(payload: T): Omit<T, ForbiddenField> {
  const cleaned = { ...payload } as Record<string, unknown>
  for (const field of FORBIDDEN_FIELDS) delete cleaned[field]
  return cleaned as Omit<T, ForbiddenField>
}

// ── Fetch helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { ok: false, data: null, error: text || `HTTP ${res.status}` }
    }
    const data = await res.json() as T
    return { ok: true, data, error: null }
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) }
  }
}

function unwrapArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>)[key]
    if (Array.isArray(value)) return value as T[]
    const nested = (data as Record<string, unknown>).data
    if (Array.isArray(nested)) return nested as T[]
    if (nested && typeof nested === 'object') {
      const nestedValue = (nested as Record<string, unknown>)[key]
      if (Array.isArray(nestedValue)) return nestedValue as T[]
    }
  }
  return []
}

// ── VPS ────────────────────────────────────────────────────────────────────────

export async function getVpsReadiness(): Promise<ApiResult<VpsReadinessResult>> {
  return apiFetch<VpsReadinessResult>('/api/admin/vps/readiness')
}

// ── Marketing Workflow ─────────────────────────────────────────────────────────

export async function runMarketingWorkflow(input: MarketingWorkflowPayload): Promise<ApiResult<MarketingWorkflowResult>> {
  const clean = stripProviderOverrides(input as unknown as Record<string, unknown>)
  return apiFetch<MarketingWorkflowResult>('/api/admin/marketing/run', {
    method: 'POST',
    body: JSON.stringify(clean),
  })
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<ApiResult<CampaignSummary[]>> {
  const result = await apiFetch<unknown>('/api/admin/campaigns')
  if (!result.ok) return { ok: false, data: null, error: result.error }
  return { ok: true, data: unwrapArray<CampaignSummary>(result.data, 'campaigns'), error: null }
}

export async function getCampaign(id: string): Promise<ApiResult<{ campaign: Record<string, unknown>; items: unknown[]; assets: AssetSummary[] }>> {
  return apiFetch(`/api/admin/campaigns/${encodeURIComponent(id)}`)
}

// ── Assets ────────────────────────────────────────────────────────────────────

export async function listAssets(campaignId?: string): Promise<ApiResult<AssetSummary[]>> {
  const url = campaignId ? `/api/admin/assets?campaignId=${encodeURIComponent(campaignId)}` : '/api/admin/assets'
  const result = await apiFetch<unknown>(url)
  if (!result.ok) return { ok: false, data: null, error: result.error }
  return { ok: true, data: unwrapArray<AssetSummary>(result.data, 'assets'), error: null }
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function listPendingApprovals(): Promise<ApiResult<ApprovalTarget[]>> {
  const result = await apiFetch<unknown>('/api/admin/approvals/assets')
  if (!result.ok) return { ok: false, data: null, error: result.error }
  return { ok: true, data: unwrapArray<ApprovalTarget>(result.data, 'approvals'), error: null }
}

export async function approveAsset(id: string, notes?: string): Promise<ApiResult<{ ok: boolean }>> {
  const payload = stripProviderOverrides({ id, type: 'asset', decision: 'approved', notes: notes ?? '' } as Record<string, unknown>)
  return apiFetch('/api/admin/approvals/decide', { method: 'POST', body: JSON.stringify(payload) })
}

export async function rejectAsset(id: string, notes: string): Promise<ApiResult<{ ok: boolean }>> {
  const payload = stripProviderOverrides({ id, type: 'asset', decision: 'rejected', notes } as Record<string, unknown>)
  return apiFetch('/api/admin/approvals/decide', { method: 'POST', body: JSON.stringify(payload) })
}

export async function requestChanges(id: string, notes: string): Promise<ApiResult<{ ok: boolean }>> {
  const payload = stripProviderOverrides({ id, type: 'asset', decision: 'needs_changes', notes } as Record<string, unknown>)
  return apiFetch('/api/admin/approvals/decide', { method: 'POST', body: JSON.stringify(payload) })
}

// ── Providers (admin display only) ────────────────────────────────────────────

export async function getProviderStatus(): Promise<ApiResult<ProviderStatusEntry[]>> {
  const result = await apiFetch<unknown>('/api/admin/providers')
  if (!result.ok) return { ok: false, data: null, error: result.error }
  return { ok: true, data: unwrapArray<ProviderStatusEntry>(result.data, 'providers'), error: null }
}

export async function testProvider(key: string): Promise<ApiResult<{ ok: boolean; latencyMs?: number; error?: string }>> {
  return apiFetch('/api/admin/settings/test-provider', {
    method: 'POST',
    body: JSON.stringify({ providerKey: key }),
  })
}
