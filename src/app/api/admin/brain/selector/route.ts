import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CANONICAL_CAPABILITY_IDS, ROUTING_PROFILE_IDS, type ProviderId, type RoutingProfileId } from '@/lib/providers/provider-types'
import { planCanonicalExecution } from '@/lib/providers/execution'
import { listProviderTruth, isCanonicalProvider } from '@/lib/providers/registry'
import { getSession } from '@/lib/session'
import { callUniversalProvider } from '@/lib/universal-provider-call'
import { sanitizeProviderError } from '@/lib/provider-mesh'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const selectorSchema = z.object({
  capability: z.string().min(1),
  policy: z.string().default('balanced'),
  providerPin: z.string().optional().nullable(),
  modelPin: z.string().optional().nullable(),
  adult: z.boolean().optional(),
  fallbackAllowed: z.boolean().default(true),
  action: z.enum(['dry_run', 'smoke']).default('dry_run'),
})

const TEXT_SMOKE_CAPABILITIES = new Set(['chat', 'reasoning', 'coding', 'translation', 'research', 'agents'])

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    capabilities: CANONICAL_CAPABILITY_IDS,
    policies: ROUTING_PROFILE_IDS.filter((profile) => ['cheap', 'balanced', 'premium', 'pinned'].includes(profile)),
    providers: listProviderTruth().map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      capabilities: provider.capabilities,
      artifactSupport: provider.features.artifactSupport,
      asyncJobs: provider.features.asyncJobs,
      streaming: provider.features.streaming,
    })),
    rules: {
      appsRequestCapabilitiesOnly: true,
      premiumGenxFirstWhenExecutable: true,
      normalChatCreatesArtifactByDefault: false,
      durableOutputRequiresArtifactJobPreviewOrDownload: true,
      adultRequiresExplicitGate: true,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = selectorSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Brain selector request', details: parsed.error.flatten() }, { status: 422 })
  }

  const providerPin = parsed.data.providerPin?.trim()
  if (providerPin && !isCanonicalProvider(providerPin)) {
    return NextResponse.json({ error: `Unknown approved provider: ${providerPin}` }, { status: 422 })
  }

  const requestedPolicy = parsed.data.policy as RoutingProfileId
  const profile = ROUTING_PROFILE_IDS.includes(requestedPolicy) ? requestedPolicy : 'balanced'
  const preferences = {
    adult: parsed.data.adult === true,
    artifactSupport: true,
    providerPreference: providerPin ? [providerPin as ProviderId] : undefined,
    modelPreference: parsed.data.modelPin?.trim() ? [parsed.data.modelPin.trim()] : undefined,
  }
  const plan = await planCanonicalExecution({
    capability: parsed.data.capability,
    profile: providerPin ? 'pinned' : profile,
    preferences,
    fallbackAllowed: parsed.data.fallbackAllowed,
  })

  const smoke = parsed.data.action === 'smoke'
    ? await runSmoke(plan.capability, plan.selected?.provider ?? null, plan.selected?.model.id ?? null)
    : null

  return NextResponse.json({
    success: plan.code === 'ROUTE_FOUND',
    action: parsed.data.action,
    request: {
      capability: parsed.data.capability,
      policy: providerPin ? 'pinned' : profile,
      providerPin: providerPin ?? null,
      modelPin: parsed.data.modelPin?.trim() || null,
      adult: parsed.data.adult === true,
      fallbackAllowed: parsed.data.fallbackAllowed,
    },
    plan,
    smoke,
  })
}

async function runSmoke(
  capability: string,
  provider: ProviderId | null,
  model: string | null,
) {
  if (!provider || !model) {
    return {
      executed: false,
      status: 'no_route',
      error: 'No selected provider/model is available for live smoke.',
    }
  }
  if (!TEXT_SMOKE_CAPABILITIES.has(capability)) {
    return {
      executed: false,
      status: 'specialist_route_required',
      provider,
      model,
      error: 'This capability requires its specialist media/audio/video route; dry-run plan is shown, but generic chat smoke would not prove model execution.',
    }
  }
  const result = await callUniversalProvider({
    providerKey: provider,
    model,
    message: `Amarktai Brain selector smoke test for capability "${capability}". Reply with one short sentence.`,
    systemPrompt: 'You are executing an Amarktai provider/model smoke test. Reply briefly.',
    maxTokens: 120,
    temperature: 0,
    timeoutMs: 20_000,
  })
  return {
    executed: true,
    status: result.ok ? 'passed' : 'failed',
    provider: result.providerKey,
    model: result.model,
    latencyMs: result.latencyMs,
    output: result.output,
    error: result.error ? sanitizeProviderError(result.error) : null,
  }
}
