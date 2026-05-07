import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { encryptVaultKey } from '@/lib/crypto-vault'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'

const toolKeys = new Set(['github', 'firecrawl', 'crawl4ai', 'playwright', 'webdock', 'storage'])
const providerKeys = new Set(APPROVED_AI_PROVIDERS.map((provider) => provider.key))

const schema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['provider', 'tool']),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid key request' }, { status: 422 })

  const allowed = parsed.data.type === 'provider' ? providerKeys.has(parsed.data.key as never) : toolKeys.has(parsed.data.key)
  if (!allowed) return NextResponse.json({ success: false, error: 'Key is not approved for Settings' }, { status: 422 })

  await prisma.integrationConfig.upsert({
    where: { key: parsed.data.key },
    update: {
      apiKey: encryptVaultKey(parsed.data.value),
      displayName: parsed.data.label,
      enabled: true,
      notes: JSON.stringify({
        type: parsed.data.type,
        savedAt: new Date().toISOString(),
        lastTestStatus: 'needs_live_test',
      }),
    },
    create: {
      key: parsed.data.key,
      displayName: parsed.data.label,
      apiKey: encryptVaultKey(parsed.data.value),
      enabled: true,
      notes: JSON.stringify({
        type: parsed.data.type,
        savedAt: new Date().toISOString(),
        lastTestStatus: 'needs_live_test',
      }),
    },
  })

  return NextResponse.json({ success: true, masked: mask(parsed.data.value) })
}

function mask(value: string) {
  return value.length <= 8 ? 'configured' : `${value.slice(0, 4)}...${value.slice(-4)}`
}
