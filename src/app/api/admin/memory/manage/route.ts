import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { listRecords, writeJsonFile, LOCAL_STORE_FILES } from '@/lib/local-json-store'

interface LocalMemoryEntry {
  id: string
  appSlug: string
  memoryType: string
  key: string
  content: string
  importance: number
  createdAt: string
  expiresAt?: string
}

/**
 * POST /api/admin/memory/manage — Export all memory entries for an app.
 * DELETE /api/admin/memory/manage — Clear all memory entries for an app.
 *
 * Both require admin session authentication.
 * Query param: appSlug (required)
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appSlug = searchParams.get('appSlug')

    if (!appSlug) {
      return NextResponse.json(
        { error: 'appSlug query parameter is required' },
        { status: 400 },
      )
    }

    // Try DB first
    try {
      const entries = await prisma.memoryEntry.findMany({
        where: { appSlug },
        orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          appSlug: true,
          memoryType: true,
          key: true,
          content: true,
          importance: true,
          createdAt: true,
          expiresAt: true,
        },
      })
      return NextResponse.json({
        appSlug,
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length,
        entries,
        driver: 'db',
      })
    } catch {
      // Fall through to local storage
    }

    // Local VPS fallback
    const all = listRecords<LocalMemoryEntry>(LOCAL_STORE_FILES.memory)
    const entries = all.filter((e) => e.appSlug === appSlug)
    return NextResponse.json({
      appSlug,
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries,
      driver: 'local_vps',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Export failed', detail: String(err) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appSlug = searchParams.get('appSlug')

    if (!appSlug) {
      return NextResponse.json(
        { error: 'appSlug query parameter is required' },
        { status: 400 },
      )
    }

    // Try DB first
    try {
      const result = await prisma.memoryEntry.deleteMany({ where: { appSlug } })
      return NextResponse.json({
        success: true,
        appSlug,
        deletedCount: result.count,
        clearedAt: new Date().toISOString(),
        driver: 'db',
      })
    } catch {
      // Fall through to local storage
    }

    // Local VPS fallback
    const all = listRecords<LocalMemoryEntry>(LOCAL_STORE_FILES.memory)
    const remaining = all.filter((e) => e.appSlug !== appSlug)
    const deletedCount = all.length - remaining.length
    writeJsonFile(LOCAL_STORE_FILES.memory, remaining)
    return NextResponse.json({
      success: true,
      appSlug,
      deletedCount,
      clearedAt: new Date().toISOString(),
      driver: 'local_vps',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Clear failed', detail: String(err) },
      { status: 500 },
    )
  }
}
