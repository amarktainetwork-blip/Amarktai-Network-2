/**
 * @module memory-capability
 * @description Memory architecture for the AmarktAI Network.
 *
 * Persistence: Prisma `MemoryEntry` table (source of truth).
 * Cache: Redis (optional, gracefully absent).
 * In-process Map: NOT the source of truth — used only as a hot read cache.
 *
 * Memory scopes:
 * - user       — user preferences, writing style, behaviour, settings
 * - workspace  — business info, project info, workspace context
 * - app        — app-specific knowledge, entities
 * - brand      — brand voice, tone, audience, guidelines (also see brand-memory.ts)
 * - character  — avatar/character personality, appearance, relationship, style
 * - agent      — agent memory, learned patterns
 * - avatar     — generated asset references, style consistency
 * - adult      — adult character memory (scoped, permission-gated)
 *
 * Key format: `{level}:{appSlug}:{scopeId}:{category}:{userKey}`
 * This namespacing allows shared table with scope isolation.
 *
 * Server-side only.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryLevel =
  | 'user'
  | 'workspace'
  | 'app'
  | 'brand'
  | 'character'
  | 'agent'
  | 'avatar'
  | 'adult'

export type MemoryCategory =
  | 'preference'
  | 'behavior'
  | 'knowledge'
  | 'entity'
  | 'context'
  | 'rule'
  | 'style'
  | 'relationship'
  | 'asset'
  | 'summary'
  | 'learned'

export interface MemoryScope {
  /** App slug — always required for DB isolation */
  appSlug: string
  level: MemoryLevel
  /** userId, workspaceId, brandId, characterId, agentId, avatarId, etc. */
  scopeId?: string
}

export interface MemoryEntry {
  /** DB numeric id */
  dbId?: number
  /** Composite string id: `{level}:{appSlug}:{scopeId}:{category}:{key}` */
  id: string
  level: MemoryLevel
  appSlug: string
  scopeId?: string
  category: MemoryCategory
  key: string
  content: string
  importance: number
  tags: string[]
  metadata: Record<string, unknown>
  relationships: string[]
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

export interface MemorySearchResult {
  entry: MemoryEntry
  score: number
  relevance: number
}

export interface MemorySummary {
  level: MemoryLevel
  appSlug: string
  category: MemoryCategory
  count: number
  topEntries: MemoryEntry[]
  lastUpdated: Date
}

export interface MemorySearchOptions {
  level?: MemoryLevel
  appSlug?: string
  scopeId?: string
  category?: MemoryCategory
  tags?: string[]
  limit?: number
  minImportance?: number
  includeExpired?: boolean
}

// ── ID helpers ────────────────────────────────────────────────────────────────

function buildCompositeId(scope: MemoryScope, category: MemoryCategory, key: string): string {
  return `${scope.level}:${scope.appSlug}:${scope.scopeId ?? '__global'}:${category}:${key}`
}

function buildDbKey(scope: MemoryScope, category: MemoryCategory, key: string): string {
  return `${scope.level}:${scope.appSlug}:${scope.scopeId ?? '__global'}:${category}:${key}`
}

// ── DB serialization ──────────────────────────────────────────────────────────

interface MemoryDbPayload {
  level: string
  appSlug: string
  scopeId?: string
  category: string
  userKey: string
  content: string
  importance: number
  tags: string[]
  metadata: Record<string, unknown>
  relationships: string[]
  expiresAt?: string
}

function serializeToDb(
  scope: MemoryScope,
  category: MemoryCategory,
  key: string,
  content: string,
  opts: {
    importance?: number
    tags?: string[]
    metadata?: Record<string, unknown>
    relationships?: string[]
    expiresAt?: Date
  },
): { key: string; memoryType: string; content: string; importance: number; expiresAt?: Date } {
  const payload: MemoryDbPayload = {
    level: scope.level,
    appSlug: scope.appSlug,
    scopeId: scope.scopeId,
    category,
    userKey: key,
    content,
    importance: opts.importance ?? 0.5,
    tags: opts.tags ?? [],
    metadata: opts.metadata ?? {},
    relationships: opts.relationships ?? [],
    expiresAt: opts.expiresAt?.toISOString(),
  }
  return {
    key: buildDbKey(scope, category, key),
    memoryType: scope.level,
    content: JSON.stringify(payload),
    importance: opts.importance ?? 0.5,
    expiresAt: opts.expiresAt,
  }
}

function deserializeFromDb(row: { id: number; key: string; memoryType: string; content: string; importance: number; expiresAt: Date | null; createdAt: Date; updatedAt?: Date }): MemoryEntry | null {
  try {
    const payload = JSON.parse(row.content) as MemoryDbPayload
    return {
      dbId: row.id,
      id: row.key,
      level: (payload.level as MemoryLevel) ?? (row.memoryType as MemoryLevel),
      appSlug: payload.appSlug ?? '',
      scopeId: payload.scopeId,
      category: (payload.category as MemoryCategory) ?? 'knowledge',
      key: payload.userKey ?? row.key,
      content: payload.content,
      importance: payload.importance ?? row.importance,
      tags: payload.tags ?? [],
      metadata: payload.metadata ?? {},
      relationships: payload.relationships ?? [],
      createdAt: row.createdAt,
      updatedAt: (row as { updatedAt?: Date }).updatedAt ?? row.createdAt,
      expiresAt: row.expiresAt ?? undefined,
    }
  } catch {
    // Legacy row with plain content — treat as knowledge entry
    return {
      dbId: row.id,
      id: row.key,
      level: row.memoryType as MemoryLevel,
      appSlug: '',
      category: 'knowledge',
      key: row.key,
      content: row.content,
      importance: row.importance,
      tags: [],
      metadata: {},
      relationships: [],
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      expiresAt: row.expiresAt ?? undefined,
    }
  }
}

// ── MemoryEngine — DB-backed ──────────────────────────────────────────────────

export class MemoryEngine {
  /** Small in-process hot cache — NOT the source of truth */
  private readonly _cache: Map<string, MemoryEntry> = new Map()
  private readonly MAX_CACHE = 200

  // ── Store ─────────────────────────────────────────────────────────────────

  async store(
    scope: MemoryScope,
    category: MemoryCategory,
    key: string,
    content: string,
    opts: {
      importance?: number
      tags?: string[]
      metadata?: Record<string, unknown>
      relationships?: string[]
      expiresAt?: Date
    } = {},
  ): Promise<MemoryEntry> {
    const compositeKey = buildCompositeId(scope, category, key)
    const dbData = serializeToDb(scope, category, key, content, opts)

    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.memoryEntry.upsert({
        where: { id: undefined as unknown as number }, // handled via key lookup below
        create: {
          appSlug: scope.appSlug,
          memoryType: scope.level,
          key: dbData.key,
          content: dbData.content,
          importance: dbData.importance,
          expiresAt: opts.expiresAt,
        },
        update: {
          content: dbData.content,
          importance: dbData.importance,
          expiresAt: opts.expiresAt,
        },
      }).catch(async () => {
        // Upsert by id is not straightforward — do findFirst + create/update
        const existing = await prisma.memoryEntry.findFirst({
          where: { appSlug: scope.appSlug, key: dbData.key },
        })
        if (existing) {
          return prisma.memoryEntry.update({
            where: { id: existing.id },
            data: { content: dbData.content, importance: dbData.importance, expiresAt: opts.expiresAt },
          })
        }
        return prisma.memoryEntry.create({
          data: {
            appSlug: scope.appSlug,
            memoryType: scope.level,
            key: dbData.key,
            content: dbData.content,
            importance: dbData.importance,
            expiresAt: opts.expiresAt,
          },
        })
      })

      const entry = deserializeFromDb(row)!
      this._setCache(compositeKey, entry)
      return entry
    } catch (err) {
      // DB unavailable — use cache only and warn
      console.warn('[MemoryEngine] DB unavailable, storing in-memory only:', err instanceof Error ? err.message : err)
      const now = new Date()
      const entry: MemoryEntry = {
        id: compositeKey,
        level: scope.level,
        appSlug: scope.appSlug,
        scopeId: scope.scopeId,
        category,
        key,
        content,
        importance: opts.importance ?? 0.5,
        tags: opts.tags ?? [],
        metadata: opts.metadata ?? {},
        relationships: opts.relationships ?? [],
        createdAt: now,
        updatedAt: now,
        expiresAt: opts.expiresAt,
      }
      this._setCache(compositeKey, entry)
      return entry
    }
  }

  // ── Retrieve ──────────────────────────────────────────────────────────────

  async retrieve(scope: MemoryScope, category: MemoryCategory, key: string): Promise<MemoryEntry | null> {
    const compositeKey = buildCompositeId(scope, category, key)

    // Hot cache check
    const cached = this._cache.get(compositeKey)
    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) return cached

    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.memoryEntry.findFirst({
        where: {
          appSlug: scope.appSlug,
          key: compositeKey,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      })
      if (!row) return null
      const entry = deserializeFromDb(row)
      if (entry) this._setCache(compositeKey, entry)
      return entry
    } catch {
      return this._cache.get(compositeKey) ?? null
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async search(query: string, opts: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    try {
      const { prisma } = await import('@/lib/prisma')
      const where = {
        ...(opts.appSlug ? { appSlug: opts.appSlug } : {}),
        ...(opts.level ? { memoryType: opts.level } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(opts.minImportance ? { importance: { gte: opts.minImportance } } : {}),
      }

      const rows = await prisma.memoryEntry.findMany({
        where,
        orderBy: { importance: 'desc' },
        take: (opts.limit ?? 20) * 3, // over-fetch for keyword filtering
      })

      const queryLower = query.toLowerCase()
      const results: MemorySearchResult[] = []

      for (const row of rows) {
        const entry = deserializeFromDb(row)
        if (!entry) continue
        if (opts.scopeId && entry.scopeId !== opts.scopeId) continue
        if (opts.category && entry.category !== opts.category) continue
        if (opts.tags?.length) {
          const hasTag = opts.tags.some(t => entry.tags.includes(t))
          if (!hasTag) continue
        }

        const haystack = `${entry.key} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase()
        const queryWords = queryLower.split(/\s+/).filter(Boolean)
        let score = 0
        for (const word of queryWords) {
          if (haystack.includes(word)) score += 1 / queryWords.length
        }
        if (score > 0 || query === '') {
          results.push({ entry, score: score * entry.importance, relevance: score })
        }
      }

      results.sort((a, b) => b.score - a.score)
      return results.slice(0, opts.limit ?? 20)
    } catch {
      // DB unavailable — search in-process cache
      const queryLower = query.toLowerCase()
      const results: MemorySearchResult[] = []
      for (const entry of this._cache.values()) {
        if (opts.appSlug && entry.appSlug !== opts.appSlug) continue
        if (opts.level && entry.level !== opts.level) continue
        if (!opts.includeExpired && entry.expiresAt && entry.expiresAt < new Date()) continue
        const haystack = `${entry.key} ${entry.content}`.toLowerCase()
        const score = haystack.includes(queryLower) ? 1 * entry.importance : 0
        if (score > 0) results.push({ entry, score, relevance: score > 0 ? 1 : 0 })
      }
      return results.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 20)
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    scope: MemoryScope,
    category: MemoryCategory,
    key: string,
    updates: { content?: string; importance?: number; tags?: string[]; metadata?: Record<string, unknown> },
  ): Promise<MemoryEntry | null> {
    const existing = await this.retrieve(scope, category, key)
    if (!existing) return null
    return this.store(scope, category, key, updates.content ?? existing.content, {
      importance: updates.importance ?? existing.importance,
      tags: updates.tags ?? existing.tags,
      metadata: { ...existing.metadata, ...updates.metadata },
      relationships: existing.relationships,
      expiresAt: existing.expiresAt,
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(scope: MemoryScope, category: MemoryCategory, key: string): Promise<boolean> {
    const compositeKey = buildCompositeId(scope, category, key)
    this._cache.delete(compositeKey)
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.memoryEntry.findFirst({
        where: { appSlug: scope.appSlug, key: compositeKey },
      })
      if (!row) return false
      await prisma.memoryEntry.delete({ where: { id: row.id } })
      return true
    } catch {
      return false
    }
  }

  // ── Get related ───────────────────────────────────────────────────────────

  async getRelated(scope: MemoryScope, category: MemoryCategory, key: string): Promise<MemoryEntry[]> {
    const entry = await this.retrieve(scope, category, key)
    if (!entry || !entry.relationships.length) return []
    const related: MemoryEntry[] = []
    for (const relId of entry.relationships) {
      const parts = relId.split(':')
      if (parts.length < 5) continue
      const [level, appSlug, scopeId, cat, relKey] = parts
      const relEntry = await this.retrieve(
        { level: level as MemoryLevel, appSlug, scopeId: scopeId === '__global' ? undefined : scopeId },
        cat as MemoryCategory,
        relKey,
      )
      if (relEntry) related.push(relEntry)
    }
    return related
  }

  // ── Summarize ─────────────────────────────────────────────────────────────

  async summarize(scope: MemoryScope, level?: MemoryLevel): Promise<MemorySummary[]> {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.memoryEntry.findMany({
        where: {
          appSlug: scope.appSlug,
          ...(level ? { memoryType: level } : { memoryType: scope.level }),
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { importance: 'desc' },
        take: 100,
      })

      const summaryMap = new Map<string, MemorySummary>()
      for (const row of rows) {
        const entry = deserializeFromDb(row)
        if (!entry) continue
        const mapKey = `${entry.level}:${entry.category}`
        if (!summaryMap.has(mapKey)) {
          summaryMap.set(mapKey, {
            level: entry.level,
            appSlug: scope.appSlug,
            category: entry.category,
            count: 0,
            topEntries: [],
            lastUpdated: entry.updatedAt,
          })
        }
        const s = summaryMap.get(mapKey)!
        s.count++
        if (s.topEntries.length < 5) s.topEntries.push(entry)
        if (entry.updatedAt > s.lastUpdated) s.lastUpdated = entry.updatedAt
      }
      return Array.from(summaryMap.values())
    } catch {
      return []
    }
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────

  private _setCache(key: string, entry: MemoryEntry): void {
    if (this._cache.size >= this.MAX_CACHE) {
      const firstKey = this._cache.keys().next().value
      if (firstKey) this._cache.delete(firstKey)
    }
    this._cache.set(key, entry)
  }

  /** For testing only — flush the hot cache */
  _flushCache(): void {
    this._cache.clear()
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const memoryEngine = new MemoryEngine()
