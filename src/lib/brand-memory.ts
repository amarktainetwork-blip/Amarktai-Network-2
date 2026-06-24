/**
 * @module brand-memory
 * @description Brand memory for the AmarktAI Network.
 *
 * Stores brand voice, colours, tone, audience, guidelines, content rules.
 *
 * ACTIVE PROVIDERS: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrandMemory {
  id: string
  brandName: string
  description: string
  audience: string
  voice: string
  tone: string
  colors: BrandColors
  rules: BrandRules
  campaignMemory: CampaignMemory[]
  referenceMaterial: string[]
  assetsMetadata: BrandAsset[]
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

// ── Brand Memory Operations ───────────────────────────────────────────────────

export interface BrandMemoryOperations {
  create(brand: Omit<BrandMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrandMemory>
  update(id: string, updates: Partial<BrandMemory>): Promise<BrandMemory>
  get(id: string): Promise<BrandMemory | null>
  list(): Promise<BrandMemory[]>
  delete(id: string): Promise<boolean>
  addCampaign(brandId: string, campaign: Omit<CampaignMemory, 'id' | 'date'>): Promise<BrandMemory>
  addAsset(brandId: string, asset: Omit<BrandAsset, 'id'>): Promise<BrandMemory>
}

// ── Brand Memory Implementation ───────────────────────────────────────────────

export class BrandMemoryEngine implements BrandMemoryOperations {
  private brands: Map<string, BrandMemory> = new Map()

  async create(brand: Omit<BrandMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrandMemory> {
    const id = `brand_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const now = new Date()
    const newBrand: BrandMemory = {
      ...brand,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.brands.set(id, newBrand)
    return newBrand
  }

  async update(id: string, updates: Partial<BrandMemory>): Promise<BrandMemory> {
    const existing = this.brands.get(id)
    if (!existing) throw new Error(`Brand ${id} not found`)
    const updated: BrandMemory = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.brands.set(id, updated)
    return updated
  }

  async get(id: string): Promise<BrandMemory | null> {
    return this.brands.get(id) ?? null
  }

  async list(): Promise<BrandMemory[]> {
    return Array.from(this.brands.values())
  }

  async delete(id: string): Promise<boolean> {
    return this.brands.delete(id)
  }

  async addCampaign(brandId: string, campaign: Omit<CampaignMemory, 'id' | 'date'>): Promise<BrandMemory> {
    const brand = this.brands.get(brandId)
    if (!brand) throw new Error(`Brand ${brandId} not found`)

    const newCampaign: CampaignMemory = {
      ...campaign,
      id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date(),
    }

    brand.campaignMemory.push(newCampaign)
    brand.updatedAt = new Date()
    this.brands.set(brandId, brand)
    return brand
  }

  async addAsset(brandId: string, asset: Omit<BrandAsset, 'id'>): Promise<BrandMemory> {
    const brand = this.brands.get(brandId)
    if (!brand) throw new Error(`Brand ${brandId} not found`)

    const newAsset: BrandAsset = {
      ...asset,
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }

    brand.assetsMetadata.push(newAsset)
    brand.updatedAt = new Date()
    this.brands.set(brandId, brand)
    return brand
  }
}

// ── Singleton Instance ────────────────────────────────────────────────────────

export const brandMemoryEngine = new BrandMemoryEngine()
