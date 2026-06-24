import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { executeProviderGateway, listGatewayAliases } from '@/lib/provider-gateway'
import { PROVIDER_REGISTRY, getProviderReadiness } from '@/lib/provider-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const health = await Promise.all(PROVIDER_REGISTRY.map((provider) => getProviderReadiness(provider.id)))
  return NextResponse.json({
    utility: 'LiteLLM-compatible normalized provider gateway',
    truthSource: 'src/lib/brain/v1-capability-matrix.ts',
    aliases: listGatewayAliases(),
    health,
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  const result = await executeProviderGateway({
    alias: typeof body.alias === 'string' ? body.alias : undefined,
    policy: ['cheap', 'balanced', 'premium', 'auto'].includes(String(body.policy))
      ? body.policy as 'cheap' | 'balanced' | 'premium' | 'auto'
      : 'auto',
    message,
    systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined,
  })
  return NextResponse.json(result, { status: result.success ? 200 : 503 })
}
