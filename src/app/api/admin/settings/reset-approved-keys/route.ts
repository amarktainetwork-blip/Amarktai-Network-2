/**
 * POST /api/admin/settings/reset-approved-keys
 *
 * Clears one or more approved provider keys from the vault.
 * Supports resetting individual keys or all approved keys at once.
 *
 * Body:
 *   { confirm: "RESET_APPROVED_KEYS", keys?: string[] }  — reset specific integration keys
 *   { confirm: "RESET_APPROVED_KEYS", all?: true }       — reset ALL approved provider keys
 *
 * The confirm field is REQUIRED to prevent accidental resets.
 * This does NOT delete app data, repos, artifacts, memory, or user accounts.
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
  'groq',
  'together',
  'huggingface',
  'mimo',
]

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as { confirm?: string; keys?: string[]; all?: boolean }
    const { confirm, keys, all } = body

    // Require explicit confirmation to prevent accidental resets
    if (confirm !== 'RESET_APPROVED_KEYS') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "RESET_APPROVED_KEYS" } to proceed.' },
        { status: 400 },
      )
    }

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
      note: 'Only approved provider keys were cleared. App data, repos, artifacts, memory, and user accounts are unaffected.',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reset keys' }, { status: 500 })
  }
}
