/**
 * @module memory-capability
 * @description Memory architecture for the AmarktAI Network.
 *
 * Memory levels:
 * - User Memory: preferences, writing style, behaviour, settings
 * - Workspace Memory: business info, project info, campaign info, workspace context
 * - App Memory: app-specific knowledge, entities
 * - Brand Memory: brand voice, colours, tone, audience, guidelines, content rules
 * - Character Memory: avatar info, adult character info, creator info
 *
 * ACTIVE PROVIDERS: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryLevel = 'user' | 'workspace' | 'app' | 'brand' | 'character'

export type MemoryCategory =
  | 'preference'
  | 'behavior'
  | 'knowledge'
  | 'entity'
  | 'context'
  | 'rule'
  | 'style'
  | 'relationship'

export interface MemoryEntry {
  id: string
  level: MemoryLevel
  category: MemoryCategory
  key: string
  content: string
  importance: number // 0.0 - 1.0
  metadata: Record<string, unknown>
  relationships: string[] // IDs of related memories
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
  category: MemoryCategory
  count: number
  topEntries: MemoryEntry[]
  lastUpdated: Date
}

// ── Memory Operations ─────────────────────────────────────────────────────────

export interface MemoryOperations {
  create(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry>
  update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry>
  search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]>
  delete(id: string): Promise<boolean>
  getSummary(level?: MemoryLevel): Promise<MemorySummary[]>
  getRelated(id: string): Promise<MemoryEntry[]>
}

export interface MemorySearchOptions {
  level?: MemoryLevel
  category?: MemoryCategory
  limit?: number
  minImportance?: number
  includeExpired?: boolean
}

// ── Memory Implementation ─────────────────────────────────────────────────────

export class MemoryEngine implements MemoryOperations {
  private entries: Map<string, MemoryEntry> = new Map()

  async create(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const now = new Date()
    const newEntry: MemoryEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.entries.set(id, newEntry)
    return newEntry
  }

  async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry> {
    const existing = this.entries.get(id)
    if (!existing) throw new Error(`Memory entry ${id} not found`)
    const updated: MemoryEntry = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.entries.set(id, updated)
    return updated
  }

  async search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = []
    const queryLower = query.toLowerCase()

    for (const entry of this.entries.values()) {
      // Filter by level
      if (options?.level && entry.level !== options.level) continue
      // Filter by category
      if (options?.category && entry.category !== options.category) continue
      // Filter by importance
      if (options?.minImportance && entry.importance < options.minImportance) continue
      // Filter expired
      if (!options?.includeExpired && entry.expiresAt && entry.expiresAt < new Date()) continue

      // Simple relevance scoring
      const contentLower = entry.content.toLowerCase()
      const keyLower = entry.key.toLowerCase()
      let score = 0

      if (contentLower.includes(queryLower)) score += 1
      if (keyLower.includes(queryLower)) score += 0.5
      if (entry.metadata && JSON.stringify(entry.metadata).toLowerCase().includes(queryLower)) score += 0.3

      if (score > 0) {
        results.push({
          entry,
          score: score * entry.importance,
          relevance: score,
        })
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit)
    }

    return results
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id)
  }

  async getSummary(level?: MemoryLevel): Promise<MemorySummary[]> {
    const summaries: Map<string, MemorySummary> = new Map()

    for (const entry of this.entries.values()) {
      if (level && entry.level !== level) continue

      const key = `${entry.level}:${entry.category}`
      if (!summaries.has(key)) {
        summaries.set(key, {
          level: entry.level,
          category: entry.category,
          count: 0,
          topEntries: [],
          lastUpdated: entry.updatedAt,
        })
      }

      const summary = summaries.get(key)!
      summary.count++
      if (summary.topEntries.length < 5) {
        summary.topEntries.push(entry)
      }
      if (entry.updatedAt > summary.lastUpdated) {
        summary.lastUpdated = entry.updatedAt
      }
    }

    return Array.from(summaries.values())
  }

  async getRelated(id: string): Promise<MemoryEntry[]> {
    const entry = this.entries.get(id)
    if (!entry) return []

    return entry.relationships
      .map(relId => this.entries.get(relId))
      .filter((e): e is MemoryEntry => e !== undefined)
  }
}

// ── Singleton Instance ────────────────────────────────────────────────────────

export const memoryEngine = new MemoryEngine()
