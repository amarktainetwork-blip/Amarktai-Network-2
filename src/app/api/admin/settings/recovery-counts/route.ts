import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

function configuredLength(value: string | null | undefined): number {
  return value ? value.length : 0
}

function hasConfiguredValue(value: string | null | undefined): boolean {
  return configuredLength(value) > 0
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [providerRows, integrationRows, artifactCount] = await Promise.all([
      prisma.aiProvider.findMany({
        orderBy: [{ sortOrder: 'asc' }, { providerKey: 'asc' }],
        select: {
          providerKey: true,
          displayName: true,
          enabled: true,
          apiKey: true,
          maskedPreview: true,
          healthStatus: true,
          healthMessage: true,
          lastCheckedAt: true,
        },
      }),
      prisma.integrationConfig.findMany({
        orderBy: { key: 'asc' },
        select: {
          key: true,
          displayName: true,
          enabled: true,
          apiKey: true,
          apiUrl: true,
          notes: true,
          updatedAt: true,
        },
      }),
      prisma.artifact.count(),
    ])

    const providers = providerRows.map((row) => ({
      provider: row.providerKey,
      displayName: row.displayName,
      activeProvider: ACTIVE_PROVIDER_KEYS.includes(row.providerKey as (typeof ACTIVE_PROVIDER_KEYS)[number]),
      enabled: row.enabled,
      hasKey: hasConfiguredValue(row.apiKey),
      encryptedLength: configuredLength(row.apiKey),
      maskedPreview: row.maskedPreview || '',
      healthStatus: row.healthStatus,
      healthMessage: row.healthMessage,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    }))

    const integrations = integrationRows.map((row) => ({
      key: row.key,
      displayName: row.displayName,
      enabled: row.enabled,
      hasKey: hasConfiguredValue(row.apiKey),
      encryptedLength: configuredLength(row.apiKey),
      hasUrl: hasConfiguredValue(row.apiUrl),
      notesPresent: hasConfiguredValue(row.notes),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      counts: {
        providers: providerRows.length,
        activeProviders: providers.filter((row) => row.activeProvider).length,
        enabledProviders: providers.filter((row) => row.enabled).length,
        providerKeysConfigured: providers.filter((row) => row.hasKey).length,
        integrations: integrationRows.length,
        integrationKeysConfigured: integrations.filter((row) => row.hasKey).length,
        artifacts: artifactCount,
      },
      providers,
      integrations,
      legacyDatabaseCandidate: {
        checked: false,
        reason: 'No legacy database connection is configured as an application source of truth.',
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Recovery counts unavailable',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
