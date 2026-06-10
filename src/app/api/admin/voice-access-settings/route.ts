import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type VoiceBehavior = 'talk_only' | 'talk_execute'

interface VoiceAccessSettings {
  enabled: boolean
  voiceId: string
  accent: string
  behavior: VoiceBehavior
  wakePhrase: string
}

const DEFAULT_SETTINGS: VoiceAccessSettings = {
  enabled: false,
  voiceId: 'alloy',
  accent: 'neutral',
  behavior: 'talk_only',
  wakePhrase: 'Hey AmarktAI',
}

function getSettingsKey(session: { email?: string; adminId?: number }): string {
  const identifier = session.email ?? (session.adminId != null ? String(session.adminId) : 'admin')
  return `voice-access-settings:${identifier}`
}

function parseSettings(notes: string | null | undefined): VoiceAccessSettings {
  if (!notes) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(notes) as Partial<VoiceAccessSettings>
    return {
      enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
      voiceId: parsed.voiceId ?? DEFAULT_SETTINGS.voiceId,
      accent: parsed.accent ?? DEFAULT_SETTINGS.accent,
      behavior: parsed.behavior === 'talk_execute' ? 'talk_execute' : 'talk_only',
      wakePhrase: parsed.wakePhrase ?? DEFAULT_SETTINGS.wakePhrase,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = getSettingsKey(session)
  const row = await prisma.integrationConfig.findUnique({ where: { key } })
  return NextResponse.json({ settings: parseSettings(row?.notes) })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<VoiceAccessSettings>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const normalized: VoiceAccessSettings = {
    enabled: !!body.enabled,
    voiceId: typeof body.voiceId === 'string' && body.voiceId.trim() ? body.voiceId.trim() : DEFAULT_SETTINGS.voiceId,
    accent: typeof body.accent === 'string' && body.accent.trim() ? body.accent.trim() : DEFAULT_SETTINGS.accent,
    behavior: body.behavior === 'talk_execute' ? 'talk_execute' : 'talk_only',
    wakePhrase: typeof body.wakePhrase === 'string' && body.wakePhrase.trim() ? body.wakePhrase.trim() : DEFAULT_SETTINGS.wakePhrase,
  }

  const key = getSettingsKey(session)
  await prisma.integrationConfig.upsert({
    where: { key },
    update: {
      displayName: 'Voice Access Settings',
      enabled: normalized.enabled,
      notes: JSON.stringify(normalized),
    },
    create: {
      key,
      displayName: 'Voice Access Settings',
      apiKey: '',
      apiUrl: '',
      enabled: normalized.enabled,
      notes: JSON.stringify(normalized),
    },
  })

  return NextResponse.json({ settings: normalized })
}
