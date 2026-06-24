/**
 * Brand Memory Tests — persistent DB-backed storage
 *
 * Covers:
 *  - create/get/update/list/delete with mocked Prisma
 *  - addCampaign / addAsset
 *  - appSlug isolation
 *  - new engine instance reads from DB (cache NOT source of truth)
 *  - DB unavailable falls back to cache gracefully
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { BrandMemoryEngine, type BrandMemory } from '../brand-memory'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBrand(overrides: Partial<BrandMemory> = {}): Omit<BrandMemory, 'id' | 'appSlug' | 'createdAt' | 'updatedAt'> {
  return {
    brandName: 'AcmeCo',
    description: 'A fictional test brand',
    audience: 'Tech-savvy professionals',
    voice: 'Confident and clear',
    tone: 'Professional yet friendly',
    colors: { primary: '#0066FF', secondary: '#00CCAA', accent: '#FF6600', background: '#FFFFFF', text: '#111111' },
    rules: { dos: ['Be clear'], donts: ['Use jargon'], contentGuidelines: ['Keep it short'], toneGuidelines: ['Stay professional'] },
    products: ['Product A', 'Product B'],
    services: ['Consulting'],
    campaignMemory: [],
    referenceMaterial: [],
    assetsMetadata: [],
    generatedContentRefs: [],
    ...overrides,
  }
}

function makeDbRow(id: string, appSlug: string, content: unknown) {
  const now = new Date()
  return {
    id: 1,
    appSlug,
    memoryType: 'brand',
    key: `brand:${appSlug}:${id}:profile`,
    content: JSON.stringify(content),
    importance: 1.0,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

describe('BrandMemoryEngine — create', () => {
  afterEach(() => vi.resetModules())

  it('creates brand and persists to DB', async () => {
    const created: BrandMemory = { ...makeBrand(), id: 'brand_test', appSlug: 'my-app', createdAt: new Date(), updatedAt: new Date() }
    const createCall = vi.fn(async () => makeDbRow('brand_test', 'my-app', created))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => null),
          create: createCall,
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const brand = await engine.create('my-app', makeBrand())

    expect(brand.brandName).toBe('AcmeCo')
    expect(brand.appSlug).toBe('my-app')
    expect(brand.id).toMatch(/^brand_/)
    expect(createCall).toHaveBeenCalledOnce()
  })

  it('returns created brand even when DB unavailable (cache fallback)', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => { throw new Error('DB down') }),
          create: vi.fn(async () => { throw new Error('DB down') }),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const brand = await engine.create('my-app', makeBrand())
    expect(brand.brandName).toBe('AcmeCo')
  })
})

// ── Get ───────────────────────────────────────────────────────────────────────

describe('BrandMemoryEngine — get', () => {
  afterEach(() => vi.resetModules())

  it('gets brand from DB on cache miss', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'brand_1', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => makeDbRow('brand_1', 'app1', brandData)),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const brand = await engine.get('app1', 'brand_1')
    expect(brand).not.toBeNull()
    expect(brand!.brandName).toBe('AcmeCo')
  })

  it('returns null when brand not found', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const engine = new BrandMemoryEngine()
    const brand = await engine.get('app1', 'nonexistent')
    expect(brand).toBeNull()
  })

  it('new engine instance reads from DB (cache NOT source of truth)', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'brand_2', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    const findFirst = vi.fn(async () => makeDbRow('brand_2', 'app1', brandData))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst },
      },
    }))

    const engine1 = new BrandMemoryEngine()
    await engine1.get('app1', 'brand_2')

    // New engine instance — no shared cache
    const engine2 = new BrandMemoryEngine()
    engine2._flushCache()
    await engine2.get('app1', 'brand_2')

    expect(findFirst.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Update ────────────────────────────────────────────────────────────────────

describe('BrandMemoryEngine — update', () => {
  afterEach(() => vi.resetModules())

  it('updates brand fields and persists', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'brand_3', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    const updateCall = vi.fn(async (args: { data: { content: string } }) => makeDbRow('brand_3', 'app1', JSON.parse(args.data.content)))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => makeDbRow('brand_3', 'app1', brandData)),
          update: updateCall,
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const updated = await engine.update('app1', 'brand_3', { tone: 'Casual and warm' })
    expect(updated.tone).toBe('Casual and warm')
    expect(updateCall).toHaveBeenCalledOnce()
  })

  it('throws when brand not found for update', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const engine = new BrandMemoryEngine()
    await expect(engine.update('app1', 'nonexistent', { tone: 'x' })).rejects.toThrow('not found')
  })
})

// ── List ──────────────────────────────────────────────────────────────────────

describe('BrandMemoryEngine — list', () => {
  afterEach(() => vi.resetModules())

  it('lists all brands for an appSlug', async () => {
    const b1: BrandMemory = { ...makeBrand({ brandName: 'Brand A' }), id: 'b1', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    const b2: BrandMemory = { ...makeBrand({ brandName: 'Brand B' }), id: 'b2', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findMany: vi.fn(async () => [
            makeDbRow('b1', 'app1', b1),
            makeDbRow('b2', 'app1', b2),
          ]),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const brands = await engine.list('app1')
    expect(brands.length).toBe(2)
    expect(brands.map(b => b.brandName)).toContain('Brand A')
    expect(brands.map(b => b.brandName)).toContain('Brand B')
  })

  it('returns empty array when no brands', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => []) },
      },
    }))

    const brands = await new BrandMemoryEngine().list('app1')
    expect(brands).toHaveLength(0)
  })
})

// ── Delete ────────────────────────────────────────────────────────────────────

describe('BrandMemoryEngine — delete', () => {
  afterEach(() => vi.resetModules())

  it('deletes brand from DB and cache', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'b_del', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    const deleteCall = vi.fn(async () => makeDbRow('b_del', 'app1', brandData))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => makeDbRow('b_del', 'app1', brandData)),
          delete: deleteCall,
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const result = await engine.delete('app1', 'b_del')
    expect(result).toBe(true)
    expect(deleteCall).toHaveBeenCalledOnce()
  })

  it('returns false when brand not found', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const result = await new BrandMemoryEngine().delete('app1', 'nope')
    expect(result).toBe(false)
  })
})

// ── addCampaign / addAsset ────────────────────────────────────────────────────

describe('BrandMemoryEngine — addCampaign and addAsset', () => {
  afterEach(() => vi.resetModules())

  it('addCampaign appends campaign to brand', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'b_camp', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => makeDbRow('b_camp', 'app1', brandData)),
          update: vi.fn(async (args: { data: { content: string } }) => makeDbRow('b_camp', 'app1', JSON.parse(args.data.content))),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const updated = await engine.addCampaign('app1', 'b_camp', {
      name: 'Summer Launch',
      description: 'Summer product launch',
      results: 'Great engagement',
      lessons: 'Start earlier next time',
    })
    expect(updated.campaignMemory).toHaveLength(1)
    expect(updated.campaignMemory[0].name).toBe('Summer Launch')
  })

  it('addAsset appends asset to brand', async () => {
    const brandData: BrandMemory = { ...makeBrand(), id: 'b_asset', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() }
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => makeDbRow('b_asset', 'app1', brandData)),
          update: vi.fn(async (args: { data: { content: string } }) => makeDbRow('b_asset', 'app1', JSON.parse(args.data.content))),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const updated = await engine.addAsset('app1', 'b_asset', {
      type: 'logo',
      name: 'Main Logo',
      url: 'https://cdn.example.com/logo.png',
      metadata: { width: 512, height: 512 },
    })
    expect(updated.assetsMetadata).toHaveLength(1)
    expect(updated.assetsMetadata[0].name).toBe('Main Logo')
    expect(updated.assetsMetadata[0].id).toMatch(/^asset_/)
  })

  it('addCampaign throws when brand not found', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const engine = new BrandMemoryEngine()
    await expect(engine.addCampaign('app1', 'nonexistent', { name: 'x', description: 'x', results: 'x', lessons: 'x' })).rejects.toThrow('not found')
  })
})

// ── appSlug isolation ─────────────────────────────────────────────────────────

describe('BrandMemoryEngine — appSlug isolation', () => {
  afterEach(() => vi.resetModules())

  it('brand from app1 not visible to app2', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async (args: { where: { appSlug: string } }) => {
            if (args.where.appSlug === 'app1') return makeDbRow('b1', 'app1', { ...makeBrand(), id: 'b1', appSlug: 'app1', createdAt: new Date(), updatedAt: new Date() })
            return null
          }),
        },
      },
    }))

    const engine = new BrandMemoryEngine()
    const app1Brand = await engine.get('app1', 'b1')
    const app2Brand = await engine.get('app2', 'b1')
    expect(app1Brand).not.toBeNull()
    expect(app2Brand).toBeNull()
  })
})
