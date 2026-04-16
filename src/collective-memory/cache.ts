interface Entry<T> {
  value: T
  expiresAt: number
}

/** Simple in-memory TTL cache. Expired entries are evicted on read. */
export class TTLCache<T> {
  private readonly store = new Map<string, Entry<T>>()
  private readonly ttlMs: number

  constructor(ttlMinutes = 30) {
    this.ttlMs = ttlMinutes * 60_000
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }
}
