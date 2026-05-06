import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { validateConfig, classifyDbError } from '@/lib/config-validator'
import {
  listRecords,
  appendRecord,
  checkWritable,
  LOCAL_STORE_FILES,
} from '@/lib/local-json-store'

interface LocalApp {
  id: string
  slug: string
  name: string
  description: string
  status: string
  source: string
  type: string
  createdAt: string
  updatedAt: string
}

const STARTER_APPS: Omit<LocalApp, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    slug: 'amarktai-network',
    name: 'AmarktAI Network',
    description: 'The core platform app — admin console, agent orchestration, and product hub.',
    status: 'ready',
    source: 'starter_local',
    type: 'platform',
  },
  {
    slug: 'crypto-trading-app',
    name: 'Crypto Trading App',
    description: 'AI-powered crypto market analysis and trading signals.',
    status: 'ready',
    source: 'starter_local',
    type: 'finance',
  },
  {
    slug: 'marketing-app',
    name: 'Marketing App',
    description: 'AI-driven marketing content creation, scheduling, and analytics.',
    status: 'ready',
    source: 'starter_local',
    type: 'marketing',
  },
  {
    slug: 'companion-app',
    name: 'Companion App',
    description: 'AI companion and adult-capable app placeholder (configurable content policy).',
    status: 'ready',
    source: 'starter_local',
    type: 'companion',
  },
  {
    slug: 'equiprofile-saas',
    name: 'EquiProfile / SaaS',
    description: 'Equity profile and SaaS application placeholder.',
    status: 'ready',
    source: 'starter_local',
    type: 'saas',
  },
]

function seedStarterApps(): LocalApp[] {
  const now = new Date().toISOString()
  const existing = listRecords<LocalApp>(LOCAL_STORE_FILES.apps)
  if (existing.length > 0) return existing

  const seeded: LocalApp[] = []
  for (const app of STARTER_APPS) {
    const record = appendRecord<Omit<LocalApp, 'id'>>(LOCAL_STORE_FILES.apps, {
      ...app,
      createdAt: now,
      updatedAt: now,
    })
    seeded.push(record as LocalApp)
  }
  return seeded
}

/**
 * GET /api/admin/apps — Admin-authenticated apps list.
 *
 * Returns all products with integration details for admin dashboard use.
 * This mirrors /api/admin/products but lives at the path the dashboard
 * apps/[slug] page expects.
 */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = validateConfig()
  if (cfg.valid) {
    try {
      const apps = await prisma.product.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { integration: true },
      })
      if (apps.length > 0) return NextResponse.json(apps)
      // DB is valid but empty — still fall through to seed local starters
    } catch (error) {
      const { category, message } = classifyDbError(error)
      if (category === 'config_invalid') {
        // Config error — fall through to local
      } else {
        // Unexpected DB error — try local
        console.warn('[apps] DB error, falling back to local:', message)
      }
    }
  }

  // Local VPS fallback with starter data
  const localCheck = checkWritable(LOCAL_STORE_FILES.apps)
  if (!localCheck.writable) {
    return NextResponse.json({ apps: [], total: 0, driver: 'local_vps', error: 'Storage not writable' })
  }

  const apps = seedStarterApps()
  return NextResponse.json(apps)
}

/**
 * POST /api/admin/apps — Create or update an app.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, name, description, type } = body as {
    slug?: string
    name?: string
    description?: string
    type?: string
  }

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const appSlug = (slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  const now = new Date().toISOString()

  // Try DB first
  const cfg = validateConfig()
  if (cfg.valid) {
    try {
      const app = await prisma.product.upsert({
        where: { slug: appSlug },
        create: {
          slug: appSlug,
          name,
          shortDescription: description ?? '',
          appType: type ?? 'general',
        },
        update: {
          name,
          shortDescription: description ?? '',
        },
      })
      return NextResponse.json({ app, driver: 'db' }, { status: 201 })
    } catch { /* Fall through */ }
  }

  // Local VPS fallback
  const existing = listRecords<LocalApp>(LOCAL_STORE_FILES.apps)
  const idx = existing.findIndex((a) => a.slug === appSlug)
  if (idx >= 0) {
    const updated = { ...existing[idx], name, description: description ?? '', updatedAt: now }
    existing[idx] = updated
    const { writeJsonFile } = await import('@/lib/local-json-store')
    writeJsonFile(LOCAL_STORE_FILES.apps, existing)
    return NextResponse.json({ app: updated, driver: 'local_vps' }, { status: 200 })
  }

  const newApp = appendRecord<Omit<LocalApp, 'id'>>(LOCAL_STORE_FILES.apps, {
    slug: appSlug,
    name,
    description: description ?? '',
    status: 'ready',
    source: 'user_created',
    type: type ?? 'general',
    createdAt: now,
    updatedAt: now,
  })
  return NextResponse.json({ app: newApp, driver: 'local_vps' }, { status: 201 })
}
