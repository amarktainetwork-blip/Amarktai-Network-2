import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'
import { getProviderMeshNode, isApprovedDirectProvider } from '@/lib/provider-mesh'
import { runProviderHealthCheck } from '@/lib/providers'
import { normalizeAdultPolicy } from '@/lib/universal-model-catalog'

const requestSchema = z.object({
  mode: z.string().optional(),
  providerType: z.string().optional(),
  model: z.string().optional(),
  outputType: z.enum(['text', 'image', 'video', 'audio']).optional(),
})

const ADULT_PROVIDER_IDS = new Set(['genx', 'huggingface', 'together'])

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ success: false, status: 'BLOCKED', error: 'Invalid adult test request' }, { status: 422 })
  }

  const stored = await prisma.integrationConfig.findUnique({ where: { key: 'adult_mode' } }).catch(() => null)
  let storedNotes: Record<string, string> = {}
  try {
    storedNotes = JSON.parse(stored?.notes ?? '{}') as Record<string, string>
  } catch {
    storedNotes = {}
  }

  const policy = normalizeAdultPolicy(parsed.data.mode ?? storedNotes.mode)
  const provider = parsed.data.providerType ?? storedNotes.providerType ?? 'huggingface'
  const outputType = parsed.data.outputType ?? storedNotes.outputType ?? 'image'
  const model = parsed.data.model ?? storedNotes.providerModel ?? null

  if (policy === 'off') {
    return NextResponse.json({
      success: false,
      status: 'BLOCKED',
      policy,
      enabled: false,
      message: 'Adult mode is off. Explicit operator opt-in is required.',
    })
  }

  if (!isApprovedDirectProvider(provider) || !ADULT_PROVIDER_IDS.has(provider)) {
    return NextResponse.json({
      success: false,
      status: 'BLOCKED',
      policy,
      provider,
      message: 'Adult mode may use only approved GenX, Hugging Face, or Together AI routes.',
    }, { status: 422 })
  }

  const node = getProviderMeshNode(provider)!
  const key = await getProviderKey(provider)
  if (!key) {
    return NextResponse.json({
      success: false,
      status: 'NEEDS_CONFIGURATION',
      policy,
      provider,
      outputType,
      model,
      message: `${node.displayName} is not configured.`,
    })
  }

  const health = await runProviderHealthCheck(provider, key, node.baseUrl)
  const ready = health.status === 'healthy'
  const status = ready ? 'DEGRADED' : health.status === 'error' ? 'BLOCKED' : 'DEGRADED'
  const message = ready
    ? `${node.displayName} is connected. Adult ${outputType} still requires an app-authorized generation request before it can be marked READY.`
    : health.message

  const notes = {
    ...storedNotes,
    mode: policy,
    providerType: provider,
    providerModel: model ?? '',
    outputType,
    lastTestStatus: status,
    lastTestAt: new Date().toISOString(),
    lastError: ready ? '' : message,
  }
  await prisma.integrationConfig.upsert({
    where: { key: 'adult_mode' },
    update: { enabled: true, notes: JSON.stringify(notes) },
    create: {
      key: 'adult_mode',
      displayName: 'Adult Mode',
      apiKey: '',
      enabled: true,
      notes: JSON.stringify(notes),
    },
  }).catch(() => null)

  return NextResponse.json({
    success: false,
    status,
    policy,
    enabled: true,
    provider,
    outputType,
    model,
    connected: ready,
    message,
  })
}
