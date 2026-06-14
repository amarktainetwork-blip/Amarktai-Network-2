import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { maskApiKey } from '@/lib/providers'
import { validateConfig, classifyDbError, configErrorResponse } from '@/lib/config-validator'
import { encryptVaultKey } from '@/lib/crypto-vault'
import { getCanonicalProvider } from '@/lib/provider-catalog'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'
import {
  PROVIDER_REGISTRY,
  getProviderReadiness,
} from '@/lib/provider-registry'

const createSchema = z.object({
  providerKey: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  enabled: z.boolean().default(false),
  apiKey: z.string().default(''),
  baseUrl: z.string().default(''),
  defaultModel: z.string().default(''),
  fallbackModel: z.string().default(''),
  notes: z.string().default(''),
  sortOrder: z.number().int().default(99),
})

/** GET /api/admin/providers — all providers, raw key NEVER returned */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = validateConfig()
  if (!cfg.valid) {
    return NextResponse.json({ ...configErrorResponse(cfg), providers: [] }, { status: 503 })
  }

  try {
    const providers = await prisma.aiProvider.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        providerKey: true,
        displayName: true,
        enabled: true,
        maskedPreview: true,
        baseUrl: true,
        defaultModel: true,
        fallbackModel: true,
        healthStatus: true,
        healthMessage: true,
        lastCheckedAt: true,
        notes: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        // apiKey intentionally excluded
      },
    })
    const rows = new Map(
      providers
        .filter((provider) => isApprovedDirectProvider(provider.providerKey))
        .map((provider) => [provider.providerKey, provider]),
    )
    const augmented = await Promise.all(PROVIDER_REGISTRY.map(async (provider) => {
      const row = rows.get(provider.id)
      const catalog = getCanonicalProvider(provider.id)
      const readiness = await getProviderReadiness(provider.id)
      return {
        id: row?.id ?? `canonical:${provider.id}`,
        providerKey: provider.id,
        displayName: provider.displayName,
        enabled: row?.enabled ?? readiness.configured,
        maskedPreview: row?.maskedPreview ?? '',
        baseUrl: row?.baseUrl || readiness.baseUrl,
        defaultModel: row?.defaultModel || provider.defaultModelsByCapability.text || '',
        fallbackModel: row?.fallbackModel ?? '',
        healthStatus: readiness.state,
        healthMessage: readiness.message,
        lastCheckedAt: readiness.checkedAt,
        notes: row?.notes ?? '',
        sortOrder: row?.sortOrder ?? 99,
        createdAt: row?.createdAt ?? null,
        updatedAt: row?.updatedAt ?? null,
        dbRowExists: Boolean(row),
        configured: readiness.configured,
        supportedModels: provider.supportedModels,
        launchRequired: catalog?.launchRequired ?? false,
      }
    }))
    return NextResponse.json(augmented)
  } catch (error) {
    const { category, message } = classifyDbError(error)
    console.error('[providers] GET failed:', category, message)
    return NextResponse.json(
      { error: message, category },
      { status: category === 'config_invalid' ? 503 : 500 },
    )
  }
}

/** POST /api/admin/providers — create a new provider (admin use only) */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = validateConfig()
  if (!cfg.valid) {
    return NextResponse.json({ ...configErrorResponse(cfg) }, { status: 503 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const catalog = getCanonicalProvider(data.providerKey)
    if (!catalog || !isApprovedDirectProvider(data.providerKey)) {
      return NextResponse.json({ error: 'Provider is not approved for direct configuration' }, { status: 422 })
    }
    const normalizedApiKey = data.apiKey.trim()
    const masked = maskApiKey(normalizedApiKey)
    const encryptedKey = normalizedApiKey ? encryptVaultKey(normalizedApiKey) : ''
    const provider = await prisma.aiProvider.create({
      data: {
        ...data,
        displayName: catalog.displayName,
        baseUrl: catalog.defaultBaseUrl,
        sortOrder: catalog.sortOrder,
        apiKey: encryptedKey,
        maskedPreview: masked,
        healthStatus: normalizedApiKey ? 'configured' : 'unconfigured',
        healthMessage: normalizedApiKey ? 'Key configured · not yet tested' : 'No API key configured',
      },
    })
    // Return without raw key
    const { apiKey: _omit, ...safe } = provider
    return NextResponse.json(safe, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    const { category, message } = classifyDbError(error)
    console.error('[providers] POST failed:', category, message)
    return NextResponse.json(
      { error: message, category },
      { status: category === 'config_invalid' ? 503 : 500 },
    )
  }
}
