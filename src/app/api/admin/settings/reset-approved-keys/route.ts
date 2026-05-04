/**
 * POST /api/admin/settings/reset-approved-keys
 *
 * Clears one or more approved provider keys from the vault.
 * Supports resetting individual keys or all approved keys at once.
 *
 * Body:
 *   { keys?: string[] }  — specific integration keys to clear (e.g. ['github', 'genx'])
 *   { all?: true }       — reset ALL approved provider keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// Approved provider integration keys that may be reset
const APPROVED_RESET_KEYS = [
  'genx',
  'github',
  'webdock',
  'firecrawl',
  'storage_config',
  'qwen',
  'minimax',
  'gemini',
  'groq',
  'together',
  'huggingface',
  'xai',
]

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as { keys?: string[]; all?: boolean }
    const { keys, all } = body

    const targetKeys = all
      ? APPROVED_RESET_KEYS
      : (keys ?? []).filter((k) => APPROVED_RESET_KEYS.includes(k))

    if (targetKeys.length === 0) {
      return NextResponse.json(
        { error: 'No valid keys specified. Provide keys[] or all:true.' },
        { status: 400 },
      )
    }

    const results: Array<{ key: string; cleared: boolean; error?: string }> = []

    for (const key of targetKeys) {
      try {
        await prisma.integrationConfig.updateMany({
          where: { key },
          data: { apiKey: '', notes: `Cleared at ${new Date().toISOString()}` },
        })
        results.push({ key, cleared: true })
      } catch (e) {
        results.push({ key, cleared: false, error: e instanceof Error ? e.message : 'Failed' })
      }
    }

    // Also clear env-style keys from AiProvider table if any match
    try {
      for (const key of targetKeys) {
        await prisma.aiProvider.updateMany({
          where: { providerKey: key },
          data: { apiKey: '', enabled: false },
        })
      }
    } catch { /* AiProvider table may not have these entries */ }

    const clearedCount = results.filter((r) => r.cleared).length

    return NextResponse.json({
      success: true,
      cleared: clearedCount,
      total: targetKeys.length,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reset keys' }, { status: 500 })
  }
}
