/**
 * @module brand-memory
 * @description Brand Memory for the AmarktAI Network.
 *
 * Persistence: Prisma `MemoryEntry` table with memoryType='brand'.
 * Each brand profile is stored as a single JSON row per brand ID.
 * Brand sub-entities (campaigns, assets) are stored as separate rows.
 *
 * Brand profiles are scoped to an appSlug.
 * The brand ID is stored in the `key` field: `brand:{appSlug}:{brandId}:profile`
 *
 * Server-side only.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrandMemory {
  id: string
  appSlug: string
  brandName: string
  description: string
  audience: string
  voice: string
  tone: string
  colors: BrandColors
  visualStyle?: string
  rules: BrandRules
  products: string[]
  services: string[]
  campaignMemory: CampaignMemory[]
  referenceMaterial: string[]
  assetsMetadata: BrandAsset[]
  generatedContentRefs: string[]
  createdAt: Date
  updatedAt: Date
}

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export interface BrandRules {
  dos: string[]
  donts: string[]
  contentGuidelines: string[]
  toneGuidelines: string[]
}

export interface CampaignMemory {
  id: string
  name: string
  description: string
  results: string
  lessons: string
  date: Date
}

export interface BrandAsset {
  id: string
  type: 'logo' | 'image' | 'video' | 'document'
  name: string
  url: string
  metadata: Record<string, unknown>
}

// ── Key builder ───────────────────────────────────────────────────────────────

function brandKey(appSlug: string, brandId: string): string {
  return `brand:${appSlug}:${brandId}:profile`
}

function _parseBrandId(key: string): string {
  // key format: brand:{appSlug}:{brandId}:profile
  const parts = key.split(':')
  return parts[2] ?? key
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function dbUpsertBrand(appSlug: string, brandId: string, data: BrandMemory): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const key = brandKey(appSlug, brandId)
  const content = JSON.stringify(data)
  const existing = await prisma.memoryEntry.findFirst({
    where: { appSlug, key },
  })
  if (existing) {
    await prisma.memoryEntry.update({
      where: { id: existing.id },
      data: { content, importance: 1.0 },
    })
  } else {
    await prisma.memoryEntry.create({
      data: { appSlug, memoryType: 'brand', key, content, importance: 1.0 },
    })
  }
}

async function dbGetBrand(appSlug: string, brandId: string): Promise<BrandMemory | null> {
  const { prisma } = await import('@/lib/prisma')
  const key = brandKey(appSlug, brandId)
  const row = await prisma.memoryEntry.findFirst({
    where: { appSlug, key },
  })
  if (!row) return null
  try {
    return JSON.parse(row.content) as BrandMemory
  } catch {
    return null
  }
}

async function dbDeleteBrand(appSlug: string, brandId: string): Promise<boolean> {
  const { prisma } = await import('@/lib/prisma')
  const key = brandKey(appSlug, brandId)
  const row = await prisma.memoryEntry.findFirst({ where: { appSlug, key } })
  if (!row) return false
  await prisma.memoryEntry.delete({ where: { id: row.id } })
  return true
}

async function dbListBrands(appSlug: string): Promise<BrandMemory[]> {
  const { prisma } = await import('@/lib/prisma')
  const prefix = `brand:${appSlug}:`
  const rows = await prisma.memoryEntry.findMany({
    where: { appSlug, memoryType: 'brand', key: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
  })
  const brands: BrandMemory[] = []
  for (const row of rows) {
    if (!row.key.endsWith(':profile')) continue
    try {
      brands.push(JSON.parse(row.content) as BrandMemory)
    } catch {
      // skip malformed rows
    }
  }
  return brands
}

// ── BrandMemoryEngine — DB-backed ─────────────────────────────────────────────

export class BrandMemoryEngine {
  /** Small hot cache — NOT source of truth */
  private readonly _cache: Map<string, BrandMemory> = new Map()

  async create(appSlug: string, brand: Omit<BrandMemory, 'id' | 'appSlug' | 'createdAt' | 'updatedAt'>): Promise<BrandMemory> {
    const id = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const now = new Date()
    const newBrand: BrandMemory = {
      ...brand,
      id,
      appSlug,
      products: brand.products ?? [],
      services: brand.services ?? [],
      visualStyle: brand.visualStyle,
      generatedContentRefs: brand.generatedContentRefs ?? [],
      createdAt: now,
      updatedAt: now,
    }
    try {
      await dbUpsertBrand(appSlug, id, newBrand)
    } catch (err) {
      console.warn('[BrandMemoryEngine] DB unavailable, using cache:', err instanceof Error ? err.message : err)
    }
    this._cache.set(`${appSlug}:${id}`, newBrand)
    return newBrand
  }

  async update(appSlug: string, id: string, updates: Partial<BrandMemory>): Promise<BrandMemory> {
    const existing = await this.get(appSlug, id)
    if (!existing) throw new Error(`Brand ${id} not found for appSlug ${appSlug}`)
    const updated: BrandMemory = {
      ...existing,
      ...updates,
      id: existing.id,
      appSlug: existing.appSlug,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    try {
      await dbUpsertBrand(appSlug, id, updated)
    } catch (err) {
      console.warn('[BrandMemoryEngine] DB unavailable, using cache:', err instanceof Error ? err.message : err)
    }
    this._cache.set(`${appSlug}:${id}`, updated)
    return updated
  }

  async get(appSlug: string, id: string): Promise<BrandMemory | null> {
    // Cache hit
    const cached = this._cache.get(`${appSlug}:${id}`)
    if (cached) return cached

    try {
      const brand = await dbGetBrand(appSlug, id)
      if (brand) this._cache.set(`${appSlug}:${id}`, brand)
      return brand
    } catch {
      return this._cache.get(`${appSlug}:${id}`) ?? null
    }
  }

  async list(appSlug: string): Promise<BrandMemory[]> {
    try {
      const brands = await dbListBrands(appSlug)
      for (const b of brands) this._cache.set(`${appSlug}:${b.id}`, b)
      return brands
    } catch {
      // Fall back to cache
      return Array.from(this._cache.values()).filter(b => b.appSlug === appSlug)
    }
  }

  async delete(appSlug: string, id: string): Promise<boolean> {
    this._cache.delete(`${appSlug}:${id}`)
    try {
      return await dbDeleteBrand(appSlug, id)
    } catch {
      return false
    }
  }

  async addCampaign(appSlug: string, brandId: string, campaign: Omit<CampaignMemory, 'id' | 'date'>): Promise<BrandMemory> {
    const brand = await this.get(appSlug, brandId)
    if (!brand) throw new Error(`Brand ${brandId} not found`)
    const newCampaign: CampaignMemory = {
      ...campaign,
      id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date(),
    }
    brand.campaignMemory.push(newCampaign)
    return this.update(appSlug, brandId, { campaignMemory: brand.campaignMemory })
  }

  async addAsset(appSlug: string, brandId: string, asset: Omit<BrandAsset, 'id'>): Promise<BrandMemory> {
    const brand = await this.get(appSlug, brandId)
    if (!brand) throw new Error(`Brand ${brandId} not found`)
    const newAsset: BrandAsset = {
      ...asset,
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }
    brand.assetsMetadata.push(newAsset)
    return this.update(appSlug, brandId, { assetsMetadata: brand.assetsMetadata })
  }

  /** For testing only */
  _flushCache(): void {
    this._cache.clear()
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const brandMemoryEngine = new BrandMemoryEngine()
