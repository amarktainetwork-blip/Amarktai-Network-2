/**
 * Memory Capability Tests — persistent DB-backed storage
 *
 * Covers:
 *  - store/retrieve/update/delete with mocked Prisma
 *  - search by query, scope, tags, category
 *  - workspace and app memory isolation
 *  - in-memory cache is NOT source of truth (new instance reads from DB)
 *  - DB unavailable falls back to cache gracefully
 *  - character/avatar memory
 *  - agent memory
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryEngine, type MemoryScope } from '../memory-capability'

// ── DB mock factory ───────────────────────────────────────────────────────────

function makeDbRow(overrides: Partial<{
  id: number; appSlug: string; key: string; memoryType: string;
  content: string; importance: number; expiresAt: Date | null; createdAt: Date; updatedAt: Date
}> = {}) {
  const now = new Date()
  const key = overrides.key ?? 'user:app1:__global:preference:theme'
  const payload = JSON.stringify({
    level: overrides.memoryType ?? 'user',
    appSlug: overrides.appSlug ?? 'app1',
    scopeId: undefined,
    category: 'preference',
    userKey: 'theme',
    content: 'dark mode',
    importance: 0.8,
    tags: ['ui'],
    metadata: {},
    relationships: [],
  })
  return {
    id: overrides.id ?? 1,
    appSlug: overrides.appSlug ?? 'app1',
    memoryType: overrides.memoryType ?? 'user',
    key,
    content: overrides.content ?? payload,
    importance: overrides.importance ?? 0.8,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

// ── Store and retrieve ────────────────────────────────────────────────────────

describe('MemoryEngine — store and retrieve', () => {
  afterEach(() => vi.resetModules())

  it('stores entry and returns it with DB id', async () => {
    const row = makeDbRow({ id: 42 })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => row),
          update: vi.fn(async () => row),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const scope: MemoryScope = { appSlug: 'app1', level: 'user' }
    const entry = await engine.store(scope, 'preference', 'theme', 'dark mode', { importance: 0.8, tags: ['ui'] })

    expect(entry.dbId).toBe(42)
    expect(entry.content).toBe('dark mode')
    expect(entry.level).toBe('user')
    expect(entry.appSlug).toBe('app1')
    expect(entry.category).toBe('preference')
    expect(entry.key).toBe('theme')
  })

  it('retrieve returns from DB on cache miss', async () => {
    const row = makeDbRow({ id: 5 })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => row),
        },
      },
    }))

    const engine = new MemoryEngine()
    const scope: MemoryScope = { appSlug: 'app1', level: 'user' }
    const entry = await engine.retrieve(scope, 'preference', 'theme')

    expect(entry).not.toBeNull()
    expect(entry!.content).toBe('dark mode')
    expect(entry!.dbId).toBe(5)
  })

  it('retrieve returns null when not found in DB', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const engine = new MemoryEngine()
    const result = await engine.retrieve({ appSlug: 'app1', level: 'user' }, 'preference', 'nonexistent')
    expect(result).toBeNull()
  })

  it('cache hit skips DB call', async () => {
    const findFirst = vi.fn(async () => null)
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst,
          create: vi.fn(async () => makeDbRow()),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const scope: MemoryScope = { appSlug: 'app1', level: 'user' }
    // Store populates cache
    await engine.store(scope, 'preference', 'theme', 'dark mode')
    // Retrieve should use cache, not DB
    const callsBefore = findFirst.mock.calls.length
    await engine.retrieve(scope, 'preference', 'theme')
    expect(findFirst.mock.calls.length).toBe(callsBefore) // no extra DB call
  })

  it('new engine instance reads from DB (cache is NOT source of truth)', async () => {
    const row = makeDbRow({ id: 99 })
    const findFirst = vi.fn(async () => row)
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst },
      },
    }))

    // First engine
    const engine1 = new MemoryEngine()
    const entry1 = await engine1.retrieve({ appSlug: 'app1', level: 'user' }, 'preference', 'theme')
    expect(entry1).not.toBeNull()

    // Second engine — fresh instance, empty cache, must read from DB
    const engine2 = new MemoryEngine()
    engine2._flushCache()
    const entry2 = await engine2.retrieve({ appSlug: 'app1', level: 'user' }, 'preference', 'theme')
    expect(entry2).not.toBeNull()
    expect(findFirst.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Update and delete ─────────────────────────────────────────────────────────

describe('MemoryEngine — update and delete', () => {
  afterEach(() => vi.resetModules())

  it('update changes content and returns updated entry', async () => {
    const original = makeDbRow({ id: 10 })
    const updatedRow = makeDbRow({ id: 10, content: JSON.stringify({ ...JSON.parse(original.content), content: 'light mode' }) })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => original),
          update: vi.fn(async () => updatedRow),
          create: vi.fn(async () => updatedRow),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const scope: MemoryScope = { appSlug: 'app1', level: 'user' }
    const updated = await engine.update(scope, 'preference', 'theme', { content: 'light mode' })
    expect(updated).not.toBeNull()
  })

  it('update returns null when entry does not exist', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const engine = new MemoryEngine()
    const result = await engine.update({ appSlug: 'app1', level: 'user' }, 'preference', 'nonexistent', { content: 'x' })
    expect(result).toBeNull()
  })

  it('delete removes from DB and cache', async () => {
    const row = makeDbRow({ id: 7 })
    const deleteCall = vi.fn(async () => row)
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => row),
          delete: deleteCall,
        },
      },
    }))

    const engine = new MemoryEngine()
    const result = await engine.delete({ appSlug: 'app1', level: 'user' }, 'preference', 'theme')
    expect(result).toBe(true)
    expect(deleteCall).toHaveBeenCalledOnce()
  })

  it('delete returns false when entry not found', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => null) },
      },
    }))

    const result = await new MemoryEngine().delete({ appSlug: 'app1', level: 'user' }, 'preference', 'nope')
    expect(result).toBe(false)
  })
})

// ── Search ────────────────────────────────────────────────────────────────────

describe('MemoryEngine — search', () => {
  afterEach(() => vi.resetModules())

  it('returns matching results sorted by score', async () => {
    const rows = [
      makeDbRow({ id: 1, appSlug: 'app1' }),
      makeDbRow({ id: 2, appSlug: 'app1', content: JSON.stringify({ level: 'user', appSlug: 'app1', category: 'knowledge', userKey: 'color', content: 'prefers blue colors', importance: 0.9, tags: ['ui', 'colors'], metadata: {}, relationships: [] }) }),
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => rows) },
      },
    }))

    const engine = new MemoryEngine()
    const results = await engine.search('color', { appSlug: 'app1', limit: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].entry.content).toContain('color')
  })

  it('returns empty array when DB has no matches', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => []) },
      },
    }))

    const engine = new MemoryEngine()
    const results = await engine.search('nonexistent query', { appSlug: 'app1' })
    expect(results).toHaveLength(0)
  })
})

// ── Scope isolation ───────────────────────────────────────────────────────────

describe('MemoryEngine — scope isolation', () => {
  afterEach(() => vi.resetModules())

  it('workspace memory is isolated from app memory by level', async () => {
    const workspaceRow = makeDbRow({ id: 1, appSlug: 'ws1', memoryType: 'workspace', content: JSON.stringify({ level: 'workspace', appSlug: 'ws1', category: 'context', userKey: 'project', content: 'Project Alpha', importance: 0.7, tags: [], metadata: {}, relationships: [] }) })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async () => workspaceRow) },
      },
    }))

    const engine = new MemoryEngine()
    const wsEntry = await engine.retrieve({ appSlug: 'ws1', level: 'workspace' }, 'context', 'project')
    expect(wsEntry?.level).toBe('workspace')
    expect(wsEntry?.content).toBe('Project Alpha')
  })

  it('app memory is isolated from user memory by scope', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findFirst: vi.fn(async (args: { where: { appSlug: string } }) => {
          // Only return for appSlug='app2'
          if (args.where.appSlug === 'app2') return makeDbRow({ id: 2, appSlug: 'app2', memoryType: 'app' })
          return null
        }) },
      },
    }))

    const engine = new MemoryEngine()
    const app1Entry = await engine.retrieve({ appSlug: 'app1', level: 'app' }, 'knowledge', 'setting')
    const app2Entry = await engine.retrieve({ appSlug: 'app2', level: 'app' }, 'preference', 'theme')
    expect(app1Entry).toBeNull()
    expect(app2Entry).not.toBeNull()
  })
})

// ── Character/Avatar memory ───────────────────────────────────────────────────

describe('MemoryEngine — character and avatar memory', () => {
  afterEach(() => vi.resetModules())

  it('stores character memory with scopeId', async () => {
    const row = makeDbRow({ id: 20, memoryType: 'character', content: JSON.stringify({ level: 'character', appSlug: 'story-app', scopeId: 'char-milo', category: 'entity', userKey: 'personality', content: 'Brave young fox who loves adventure', importance: 0.9, tags: ['character', 'personality'], metadata: {}, relationships: [] }) })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => row),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const entry = await engine.store(
      { appSlug: 'story-app', level: 'character', scopeId: 'char-milo' },
      'entity', 'personality',
      'Brave young fox who loves adventure',
      { importance: 0.9, tags: ['character', 'personality'] },
    )
    expect(entry.level).toBe('character')
    expect(entry.content).toBe('Brave young fox who loves adventure')
  })

  it('avatar memory stores style consistency data', async () => {
    const row = makeDbRow({ id: 21, memoryType: 'avatar', content: JSON.stringify({ level: 'avatar', appSlug: 'brand-app', scopeId: 'avatar-luna', category: 'style', userKey: 'visual-style', content: 'realistic_human, dark hair, green eyes', importance: 0.8, tags: ['avatar', 'style'], metadata: { consistencySeed: 42 }, relationships: [] }) })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => row),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const entry = await engine.store(
      { appSlug: 'brand-app', level: 'avatar', scopeId: 'avatar-luna' },
      'style', 'visual-style',
      'realistic_human, dark hair, green eyes',
      { metadata: { consistencySeed: 42 }, tags: ['avatar', 'style'] },
    )
    expect(entry.level).toBe('avatar')
    expect(entry.metadata.consistencySeed).toBe(42)
  })
})

// ── Agent memory ──────────────────────────────────────────────────────────────

describe('MemoryEngine — agent memory', () => {
  afterEach(() => vi.resetModules())

  it('stores agent learned pattern', async () => {
    const row = makeDbRow({ id: 30, memoryType: 'agent', content: JSON.stringify({ level: 'agent', appSlug: 'support-app', scopeId: 'agent-cs', category: 'learned', userKey: 'response-pattern', content: 'Always greet customers by name', importance: 0.85, tags: ['agent', 'learned'], metadata: {}, relationships: [] }) })
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => row),
          upsert: vi.fn(async () => { throw new Error('use fallback') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const entry = await engine.store(
      { appSlug: 'support-app', level: 'agent', scopeId: 'agent-cs' },
      'learned', 'response-pattern',
      'Always greet customers by name',
      { importance: 0.85, tags: ['agent', 'learned'] },
    )
    expect(entry.level).toBe('agent')
    expect(entry.content).toContain('greet customers')
  })
})

// ── DB unavailable fallback ───────────────────────────────────────────────────

describe('MemoryEngine — DB unavailable', () => {
  afterEach(() => vi.resetModules())

  it('store falls back to in-memory cache when DB throws', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => { throw new Error('DB down') }),
          create: vi.fn(async () => { throw new Error('DB down') }),
          upsert: vi.fn(async () => { throw new Error('DB down') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    const entry = await engine.store(
      { appSlug: 'app1', level: 'user' },
      'preference', 'theme', 'dark mode',
    )
    // Should not throw — falls back to cache
    expect(entry.content).toBe('dark mode')
    // No dbId since DB was unavailable
    expect(entry.dbId).toBeUndefined()
  })

  it('retrieve falls back to cache when DB throws', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: {
          findFirst: vi.fn(async () => { throw new Error('DB down') }),
          create: vi.fn(async () => { throw new Error('DB down') }),
          upsert: vi.fn(async () => { throw new Error('DB down') }),
        },
      },
    }))

    const engine = new MemoryEngine()
    // Pre-populate cache via failed store (which falls back to cache)
    await engine.store({ appSlug: 'app1', level: 'user' }, 'preference', 'theme', 'cached value')
    // Retrieve should return from cache
    const result = await engine.retrieve({ appSlug: 'app1', level: 'user' }, 'preference', 'theme')
    expect(result?.content).toBe('cached value')
  })
})
