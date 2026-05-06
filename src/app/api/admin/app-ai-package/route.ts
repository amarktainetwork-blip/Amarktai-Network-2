import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { deleteAppAiPackage, getAppAiPackage, listAppAiPackages, saveAppAiPackage } from '@/lib/app-ai-package-store'
import { isApprovedAIProvider } from '@/lib/approved-ai-catalog'
import { confirmAppAiPackage, type AppAiPackage } from '@/lib/app-ai-package'

const selectionSchema = z.object({
  capabilityId: z.string(),
  provider: z.string(),
  modelId: z.string(),
  endpointUrl: z.string().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModelId: z.string().optional(),
  notes: z.string().optional(),
})

const permissionsSchema = z.object({
  canChat: z.boolean(),
  canUseTools: z.boolean(),
  canUseRepo: z.boolean(),
  canUseMedia: z.boolean(),
  canUseVoice: z.boolean(),
  canUseAdult: z.boolean(),
  canSendMarketing: z.boolean(),
  requiresApprovalForSpend: z.boolean(),
  requiresApprovalForExternalActions: z.boolean(),
})

const packageSchema = z.object({
  appSlug: z.string().min(1),
  appName: z.string().min(1),
  domain: z.string().optional(),
  appType: z.enum(['coding', 'marketing', 'companion', 'avatar/video', 'research', 'operations', 'custom']).or(z.string().min(1)),
  safetyProfile: z.string().min(1),
  enabledCapabilityIds: z.array(z.string()).default([]),
  allowedCapabilities: z.array(z.string()).optional(),
  modelStrategy: z.enum(['cheap', 'balanced', 'premium', 'custom']).optional(),
  selections: z.array(selectionSchema).default([]),
  fallbackSelections: z.array(selectionSchema).optional(),
  voice: z.object({ provider: z.string(), modelId: z.string(), voiceId: z.string().optional(), label: z.string().optional() }).optional(),
  crawler: z.object({ provider: z.enum(['firecrawl', 'crawl4ai', 'playwright', 'manual']), websiteUrl: z.string().optional(), lastCrawledAt: z.string().optional() }).optional(),
  budget: z.object({
    mode: z.enum(['cheap', 'balanced', 'premium', 'custom']),
    monthlyUsd: z.number().optional(),
    maxPerRequestUsd: z.number().optional(),
    requiresApprovalAboveUsd: z.number().optional(),
  }).optional(),
  adultPolicy: z.enum(['off', 'allowed']).optional(),
  permissions: permissionsSchema,
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

  const invalidSelection = parsed.data.selections.find((selection) => selection.provider && !isApprovedAIProvider(selection.provider))
  if (invalidSelection) {
    return NextResponse.json({ success: false, error: `Provider is not approved: ${invalidSelection.provider}` }, { status: 422 })
  }

  const pkg = parsed.data as AppAiPackage
  const confirmation = confirmAppAiPackage(pkg)
  const stored = await saveAppAiPackage(pkg)
  return NextResponse.json({ success: true, package: stored, confirmation })
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
