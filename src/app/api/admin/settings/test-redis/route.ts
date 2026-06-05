/**
 * POST /api/admin/settings/test-redis
 *
 * Tests the Redis connection using the configured REDIS_URL.
 * Returns real results — never faked.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redisUrl = process.env.REDIS_URL?.trim()

  if (!redisUrl) {
    return NextResponse.json({
      success: false,
      error: 'REDIS_URL is not configured',
      nextAction: 'Set REDIS_URL in environment or Settings',
    })
  }

  const start = Date.now()
  try {
    // Validate URL format
    const parsed = new URL(redisUrl)
    const isValid = parsed.protocol === 'redis:' || parsed.protocol === 'rediss:'
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: `REDIS_URL has unexpected protocol: ${parsed.protocol}`,
        nextAction: 'Set a valid redis:// or rediss:// URL',
      })
    }

    // Attempt a lightweight dynamic-import probe via ioredis if installed.
    let connected = false
    let note = 'URL format valid — no runtime Redis client available for deep test'

    // Try ioredis if available
    try {
      const ioredisModule = await import('ioredis').catch(() => null)
      if (!ioredisModule) {
        note = 'ioredis not installed — URL format valid but not deep-tested'
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const RedisClass = (ioredisModule as any).default ?? ioredisModule
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const client = new (RedisClass as any)(redisUrl, { lazyConnect: true, connectTimeout: 5_000 })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await client.connect()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await client.ping()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await client.quit()
        connected = true
        note = 'PING/PONG succeeded via ioredis'
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json({
        success: false,
        error: msg,
        latencyMs: Date.now() - start,
        nextAction: 'Check REDIS_URL is reachable from the VPS',
      })
    }

    return NextResponse.json({ success: true, connected, note, latencyMs: Date.now() - start })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redis connection test failed'
    return NextResponse.json({
      success: false,
      error: message,
      latencyMs: Date.now() - start,
      nextAction: 'Check REDIS_URL and ensure Redis is running',
    })
  }
}
