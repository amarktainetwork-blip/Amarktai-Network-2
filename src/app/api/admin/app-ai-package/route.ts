import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { deleteAppAiPackage, getAppAiPackage, listAppAiPackages, saveAppAiPackage } from '@/lib/app-ai-package-store'

const selectionSchema = z.object({
  capabilityId: z.string(),
  provider: z.string(),
  modelId: z.string(),
  endpointUrl: z.string().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModelId: z.string().optional(),
  notes: z.string().optional(),
})

const packageSchema = z.object({
  appSlug: z.string().min(1),
  appName: z.string().min(1),
  appType: z.string().min(1),
  safetyProfile: z.string().min(1),
  enabledCapabilityIds: z.array(z.string()).default([]),
  selections: z.array(selectionSchema).default([]),
  voice: z.object({ provider: z.string(), modelId: z.string(), voiceId: z.string().optional(), label: z.string().optional() }).optional(),
  crawler: z.object({ provider: z.enum(['firecrawl', 'genx', 'manual']), websiteUrl: z.string().optional(), lastCrawledAt: z.string().optional() }).optional(),
  budget: z.object({ mode: z.enum(['cheap', 'balanced', 'premium', 'custom']), monthlyUsd: z.number().optional(), maxPerRequestUsd: z.number().optional() }).optional(),
  permissions: z.record(z.string(), z.boolean()),
  status: z.enum(['draft', 'ready', 'needs_configuration', 'blocked']),
  blockers: z.array(z.string()).default([]),
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug')
  if (appSlug) {
    const pkg = await getAppAiPackage(appSlug)
    return NextResponse.json({ success: true, package: pkg })
  }

  const packages = await listAppAiPackages()
  return NextResponse.json({ success: true, packages, count: packages.length })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = packageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid app AI package', details: parsed.error.flatten() }, { status: 422 })
  }

  const stored = await saveAppAiPackage(parsed.data)
  return NextResponse.json({ success: true, package: stored })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const appSlug = searchParams.get('appSlug')
  if (!appSlug) return NextResponse.json({ success: false, error: 'appSlug is required' }, { status: 422 })

  const deleted = await deleteAppAiPackage(appSlug)
  return NextResponse.json({ success: true, deleted })
}
