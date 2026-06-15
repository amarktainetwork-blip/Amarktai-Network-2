type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class ProviderDiscoveryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()

  get(key: string): T | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): T {
    this.entries.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlMs) })
    return value
  }

  delete(key: string) {
    this.entries.delete(key)
  }

  deletePrefix(prefix: string) {
    for (const key of this.entries.keys()) {
      if (key === prefix || key.startsWith(`${prefix}:`)) this.entries.delete(key)
    }
  }

  clear() {
    this.entries.clear()
  }
}
