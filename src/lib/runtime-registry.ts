/**
 * @module runtime-registry
 * @description Runtime Registry — single source of truth for capabilities, providers, and models.
 *
 * This module provides read-only access to the Runtime Registry tables:
 * - capability_registry: canonical capability definitions
 * - provider_capability_map: provider→capability mappings with proof status
 * - model_discovery_cache: dynamic model discovery cache
 * - budget_profiles: cost/quality/latency routing profiles
 *
 * All routing decisions should consult these tables instead of hardcoded lists.
 */

import { prisma } from '@/lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CapabilityEntry {
  capabilityKey: string
  label: string
  description: string
  category: string
  requiredFlags: string[]
  allowedProviders: string[]
  enabled: boolean
  proofStatus: string
  sourceFile: string
  proofFile: string
  knownIssues: string
}

export interface ProviderCapabilityEntry {
  providerKey: string
  capabilityKey: string
  models: string[]
  endpoints: string[]
  proven: boolean
  proofType: string
  proofSource: string
  lastVerified: Date | null
}

export interface ModelCacheEntry {
  providerKey: string
  modelId: string
  capabilities: string[]
  costTier: string
  latencyTier: string
  contextWindow: number
  enabled: boolean
  metadata: Record<string, unknown>
  lastSeen: Date
  expiresAt: Date | null
}

export interface BudgetProfileEntry {
  profileKey: string
  displayName: string
  costTier: string
  qualityPreference: string
  latencyPreference: string
  maxCostPerRequest: number
  maxFallbackDepth: number
  allowPremium: boolean
  allowStreaming: boolean
  allowLongRunningJobs: boolean
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let capabilityCache: Map<string, CapabilityEntry> | null = null
let providerCapabilityCache: Map<string, ProviderCapabilityEntry[]> | null = null
let budgetProfileCache: Map<string, BudgetProfileEntry> | null = null
let cacheAge = 0
const CACHE_TTL_MS = 60_000 // 1 minute

function isCacheValid(): boolean {
  return capabilityCache !== null && Date.now() - cacheAge < CACHE_TTL_MS
}

function invalidateCache(): void {
  capabilityCache = null
  providerCapabilityCache = null
  budgetProfileCache = null
  cacheAge = 0
}

// ── Capability Registry ───────────────────────────────────────────────────────

async function loadCapabilityCache(): Promise<Map<string, CapabilityEntry>> {
  if (isCacheValid() && capabilityCache) return capabilityCache

  const rows = await prisma.capabilityRegistry.findMany({
    where: { enabled: true },
  })

  capabilityCache = new Map()
  for (const row of rows) {
    capabilityCache.set(row.capabilityKey, {
      capabilityKey: row.capabilityKey,
      label: row.label,
      description: row.description,
      category: row.category,
      requiredFlags: JSON.parse(row.requiredFlags),
      allowedProviders: JSON.parse(row.allowedProviders),
      enabled: row.enabled,
      proofStatus: row.proofStatus,
      sourceFile: row.sourceFile,
      proofFile: row.proofFile,
      knownIssues: row.knownIssues,
    })
  }

  cacheAge = Date.now()
  return capabilityCache
}

/**
 * Get a capability entry by key.
 * Returns null if the capability doesn't exist or is disabled.
 */
export async function getCapability(key: string): Promise<CapabilityEntry | null> {
  const cache = await loadCapabilityCache()
  return cache.get(key) ?? null
}

/**
 * Get all enabled capabilities.
 */
export async function getAllCapabilities(): Promise<CapabilityEntry[]> {
  const cache = await loadCapabilityCache()
  return Array.from(cache.values())
}

/**
 * Check if a capability is enabled and has at least one allowed provider.
 */
export async function isCapabilityAvailable(key: string): Promise<boolean> {
  const cap = await getCapability(key)
  return cap !== null && cap.enabled && cap.allowedProviders.length > 0
}

/**
 * Get the allowed providers for a capability.
 * Returns empty array if capability doesn't exist.
 */
export async function getAllowedProviders(capabilityKey: string): Promise<string[]> {
  const cap = await getCapability(capabilityKey)
  return cap?.allowedProviders ?? []
}

// ── Provider Capability Map ───────────────────────────────────────────────────

async function loadProviderCapabilityCache(): Promise<Map<string, ProviderCapabilityEntry[]>> {
  if (isCacheValid() && providerCapabilityCache) return providerCapabilityCache

  const rows = await prisma.providerCapabilityMap.findMany()

  providerCapabilityCache = new Map()
  for (const row of rows) {
    const entry: ProviderCapabilityEntry = {
      providerKey: row.providerKey,
      capabilityKey: row.capabilityKey,
      models: JSON.parse(row.models),
      endpoints: JSON.parse(row.endpoints),
      proven: row.proven,
      proofType: row.proofType,
      proofSource: row.proofSource,
      lastVerified: row.lastVerified,
    }

    const existing = providerCapabilityCache.get(row.capabilityKey) ?? []
    existing.push(entry)
    providerCapabilityCache.set(row.capabilityKey, existing)
  }

  cacheAge = Date.now()
  return providerCapabilityCache
}

/**
 * Get all provider mappings for a capability.
 */
export async function getProvidersForCapability(capabilityKey: string): Promise<ProviderCapabilityEntry[]> {
  const cache = await loadProviderCapabilityCache()
  return cache.get(capabilityKey) ?? []
}

/**
 * Get the best provider for a capability based on proof status.
 * Prefers proven providers over inferred ones.
 */
export async function getBestProvider(capabilityKey: string): Promise<ProviderCapabilityEntry | null> {
  const providers = await getProvidersForCapability(capabilityKey)
  if (providers.length === 0) return null

  // Sort by proof status: vps_test > source_code > manual_test > inferred
  const proofOrder: Record<string, number> = {
    vps_test: 0,
    source_code: 1,
    manual_test: 2,
    inferred: 3,
  }

  providers.sort((a, b) => {
    const aOrder = proofOrder[a.proofType] ?? 99
    const bOrder = proofOrder[b.proofType] ?? 99
    return aOrder - bOrder
  })

  return providers[0]
}

/**
 * Check if a provider supports a capability.
 */
export async function providerSupportsCapability(providerKey: string, capabilityKey: string): Promise<boolean> {
  const providers = await getProvidersForCapability(capabilityKey)
  return providers.some(p => p.providerKey === providerKey)
}

// ── Model Discovery Cache ─────────────────────────────────────────────────────

/**
 * Get cached models for a provider.
 */
export async function getModelsForProvider(providerKey: string): Promise<ModelCacheEntry[]> {
  const rows = await prisma.modelDiscoveryCache.findMany({
    where: {
      providerKey,
      enabled: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  })

  return rows.map(row => ({
    providerKey: row.providerKey,
    modelId: row.modelId,
    capabilities: JSON.parse(row.capabilities),
    costTier: row.costTier,
    latencyTier: row.latencyTier,
    contextWindow: row.contextWindow,
    enabled: row.enabled,
    metadata: JSON.parse(row.metadata),
    lastSeen: row.lastSeen,
    expiresAt: row.expiresAt,
  }))
}

/**
 * Get a specific cached model.
 */
export async function getCachedModel(providerKey: string, modelId: string): Promise<ModelCacheEntry | null> {
  const row = await prisma.modelDiscoveryCache.findFirst({
    where: {
      providerKey,
      modelId,
    },
  })

  if (!row) return null

  return {
    providerKey: row.providerKey,
    modelId: row.modelId,
    capabilities: JSON.parse(row.capabilities),
    costTier: row.costTier,
    latencyTier: row.latencyTier,
    contextWindow: row.contextWindow,
    enabled: row.enabled,
    metadata: JSON.parse(row.metadata),
    lastSeen: row.lastSeen,
    expiresAt: row.expiresAt,
  }
}

/**
 * Upsert a model in the discovery cache.
 */
export async function upsertCachedModel(entry: Omit<ModelCacheEntry, 'lastSeen'>): Promise<void> {
  const existing = await prisma.modelDiscoveryCache.findFirst({
    where: {
      providerKey: entry.providerKey,
      modelId: entry.modelId,
    },
  })

  if (existing) {
    await prisma.modelDiscoveryCache.update({
      where: { id: existing.id },
      data: {
        capabilities: JSON.stringify(entry.capabilities),
        costTier: entry.costTier,
        latencyTier: entry.latencyTier,
        contextWindow: entry.contextWindow,
        enabled: entry.enabled,
        metadata: JSON.stringify(entry.metadata),
        lastSeen: new Date(),
        expiresAt: entry.expiresAt,
      },
    })
  } else {
    await prisma.modelDiscoveryCache.create({
      data: {
        providerKey: entry.providerKey,
        modelId: entry.modelId,
        capabilities: JSON.stringify(entry.capabilities),
        costTier: entry.costTier,
        latencyTier: entry.latencyTier,
        contextWindow: entry.contextWindow,
        enabled: entry.enabled,
        metadata: JSON.stringify(entry.metadata),
        expiresAt: entry.expiresAt,
      },
    })
  }
}

// ── Budget Profiles ───────────────────────────────────────────────────────────

async function loadBudgetProfileCache(): Promise<Map<string, BudgetProfileEntry>> {
  if (isCacheValid() && budgetProfileCache) return budgetProfileCache

  const rows = await prisma.budgetProfile.findMany()

  budgetProfileCache = new Map()
  for (const row of rows) {
    budgetProfileCache.set(row.profileKey, {
      profileKey: row.profileKey,
      displayName: row.displayName,
      costTier: row.costTier,
      qualityPreference: row.qualityPreference,
      latencyPreference: row.latencyPreference,
      maxCostPerRequest: row.maxCostPerRequest,
      maxFallbackDepth: row.maxFallbackDepth,
      allowPremium: row.allowPremium,
      allowStreaming: row.allowStreaming,
      allowLongRunningJobs: row.allowLongRunningJobs,
    })
  }

  cacheAge = Date.now()
  return budgetProfileCache
}

/**
 * Get a budget profile by key.
 * Returns null if the profile doesn't exist.
 */
export async function getBudgetProfile(key: string): Promise<BudgetProfileEntry | null> {
  const cache = await loadBudgetProfileCache()
  return cache.get(key) ?? null
}

/**
 * Get all budget profiles.
 */
export async function getAllBudgetProfiles(): Promise<BudgetProfileEntry[]> {
  const cache = await loadBudgetProfileCache()
  return Array.from(cache.values())
}

/**
 * Check if a model's cost tier is within the budget profile's limits.
 */
export async function isWithinBudget(
  profileKey: string,
  costTier: string,
): Promise<boolean> {
  const profile = await getBudgetProfile(profileKey)
  if (!profile) return true // No profile = no restriction

  const costTierOrder: Record<string, number> = {
    free: 0,
    very_low: 1,
    low: 2,
    medium: 3,
    high: 4,
    premium: 5,
  }

  const modelCost = costTierOrder[costTier] ?? 3
  const maxCost = costTierOrder[profile.costTier] ?? 3

  return modelCost <= maxCost
}

// ── Cache Management ──────────────────────────────────────────────────────────

/**
 * Force-refresh the registry cache.
 * Call after seeding or updating registry tables.
 */
export function refreshRegistryCache(): void {
  invalidateCache()
}
