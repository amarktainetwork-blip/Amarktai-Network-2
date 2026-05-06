import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getMemoryStatus, saveMemory } from '@/lib/memory'
import { validateConfig, classifyDbError } from '@/lib/config-validator'
import {
  appendRecord,
  checkWritable,
  listRecords,
  getStorageRoot,
  LOCAL_STORE_FILES,
} from '@/lib/local-json-store'

interface LocalMemoryEntry {
  id: string
  appSlug: string
  userId?: string
  scope: string
  memoryType: string
  content: string
  key: string
  importance: number
  ttlDays?: number
  createdAt: string
  expiresAt?: string
}

function buildLocalStatus() {
  const storage = checkWritable(LOCAL_STORE_FILES.memory)
  const entries = listRecords<LocalMemoryEntry>(LOCAL_STORE_FILES.memory)
  const appSlugs = [...new Set(entries.map((e) => e.appSlug))]
  return {
    available: storage.writable,
    statusLabel: storage.writable ? 'working' : 'not_configured',
    storage: {
      driver: 'local_vps',
      writable: storage.writable,
      root: storage.root,
      file: LOCAL_STORE_FILES.memory,
    },
    totalEntries: entries.length,
    appSlugs,
    entries,
  }
}

/** GET /api/admin/memory — returns current memory layer status */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try DB path first if config is valid
  const cfg = validateConfig()
  if (cfg.valid) {
    try {
      const status = await getMemoryStatus()
      if (status.available) {
        // Augment DB response with local storage info
        const localEntries = listRecords<LocalMemoryEntry>(LOCAL_STORE_FILES.memory)
        const localRoot = getStorageRoot()
        return NextResponse.json({
          ...status,
          statusLabel: 'working',
          storage: {
            driver: 'db+local_vps',
            writable: true,
            root: localRoot,
            file: LOCAL_STORE_FILES.memory,
          },
          localEntries: localEntries.length,
        })
      }
    } catch {
      // Fall through to local storage
    }
  }

  // Local VPS fallback
  const localStatus = buildLocalStatus()
  return NextResponse.json(localStatus)
}

/** POST /api/admin/memory — save a memory entry */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json() as {
      appSlug?: string
      userId?: string
      scope?: string
      memoryType?: string
      content?: string
      key?: string
      importance?: number
      ttlDays?: number
    }
    const { appSlug, memoryType, content } = body
    if (!appSlug || !memoryType || !content) {
      return NextResponse.json({ error: 'appSlug, memoryType, and content are required' }, { status: 400 })
    }

    // Try DB path first
    const cfg = validateConfig()
    if (cfg.valid) {
      try {
        const ok = await saveMemory({
          appSlug,
          memoryType: memoryType as Parameters<typeof saveMemory>[0]['memoryType'],
          content,
          key: body.key,
          importance: body.importance,
          ttlDays: body.ttlDays,
        })
        if (ok) return NextResponse.json({ success: true, driver: 'db' })
      } catch {
        // Fall through to local storage
      }
    }

    // Local VPS fallback
    const now = new Date()
    const entry: Omit<LocalMemoryEntry, 'id'> = {
      appSlug,
      userId: body.userId,
      scope: body.scope ?? 'app',
      memoryType,
      content,
      key: body.key ?? '',
      importance: body.importance ?? 0.5,
      ttlDays: body.ttlDays,
      createdAt: now.toISOString(),
      expiresAt: body.ttlDays
        ? new Date(now.getTime() + body.ttlDays * 86_400_000).toISOString()
        : undefined,
    }
    const saved = appendRecord(LOCAL_STORE_FILES.memory, entry)
    return NextResponse.json({ success: true, driver: 'local_vps', id: saved.id })
  } catch (err) {
    const { message } = classifyDbError(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
