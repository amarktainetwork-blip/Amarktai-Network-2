import { NextRequest, NextResponse } from 'next/server'
import { callProvider } from '@/lib/brain'
import { getSession } from '@/lib/session'
import { APPROVED_DIRECT_PROVIDER_IDS, isApprovedDirectProvider } from '@/lib/provider-mesh'
import { getDefaultModelForProvider } from '@/lib/model-registry'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages?: unknown
  systemPrompt?: unknown
  provider?: unknown
}

const CHAT_PRIORITY = ['genx', 'groq', 'together', 'mimo', 'huggingface'] as const

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_json' }, { status: 400 })
  }

  const messages = Array.isArray(body.messages)
    ? (body.messages as ChatMessage[]).filter(
        message =>
          message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          message.content.trim(),
      )
    : []

  if (messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required', code: 'invalid_messages' }, { status: 400 })
  }

  const requested = typeof body.provider === 'string' ? body.provider : 'auto'
  if (requested !== 'auto' && !isApprovedDirectProvider(requested)) {
    return NextResponse.json(
      {
        error: `Provider "${requested}" is not approved. Choose one of: ${APPROVED_DIRECT_PROVIDER_IDS.join(', ')}.`,
        code: 'unknown_provider',
      },
      { status: 400 },
    )
  }

  const providers = requested === 'auto' ? CHAT_PRIORITY : [requested]
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : ''
  const transcript = messages.map(message => `${message.role}: ${message.content}`).join('\n')
  const errors: string[] = []

  for (const provider of providers) {
    const model = getDefaultModelForProvider(provider)
    const result = await callProvider(provider, model, transcript, systemPrompt)
    if (result.ok && result.output) {
      return NextResponse.json({ reply: result.output, provider, model })
    }
    errors.push(`${provider}: ${result.error ?? 'empty reply'}`)
  }

  return NextResponse.json(
    {
      error: 'No approved chat provider is currently ready.',
      code: 'no_provider_configured',
      providers_tried: errors,
    },
    { status: 503 },
  )
}
