import { callUniversalProvider, type UniversalProviderRequest } from '@/lib/universal-provider-call'
import { getProviderReadiness } from '@/lib/provider-registry'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export type GatewayPolicy = 'cheap' | 'balanced' | 'premium' | 'auto'

export interface GatewayRoute {
  alias: string
  provider: ApprovedDirectProviderId
  model: string
  timeoutMs: number
  maxRetries: number
  estimatedInputCostPerMillion: number | null
  estimatedOutputCostPerMillion: number | null
}

export interface GatewayAttempt {
  provider: ApprovedDirectProviderId
  model: string
  alias: string
  status: 'completed' | 'failed' | 'skipped'
  latencyMs: number
  error: string | null
}

const ALIASES: Readonly<Record<string, readonly GatewayRoute[]>> = {
  'text.fast': [
    route('text.fast', 'genx', 'gpt-5.4-mini', 20_000, 1),
    route('text.fast', 'groq', 'llama-3.3-70b-versatile', 18_000, 1),
    route('text.fast', 'mimo', 'mimo-v2.5', 30_000, 1),
  ],
  'text.balanced': [
    route('text.balanced', 'genx', 'gpt-5.4-mini', 30_000, 1),
    route('text.balanced', 'together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 35_000, 1),
    route('text.balanced', 'groq', 'llama-3.3-70b-versatile', 20_000, 1),
    route('text.balanced', 'mimo', 'mimo-v2.5', 35_000, 1),
  ],
  'text.premium': [
    route('text.premium', 'genx', 'gpt-5.4-mini', 40_000, 1),
    route('text.premium', 'mimo', 'mimo-v2.5-pro', 45_000, 1),
    route('text.premium', 'together', 'deepseek-ai/DeepSeek-R1', 50_000, 1),
  ],
}

export function listGatewayAliases() {
  return Object.entries(ALIASES).map(([alias, routes]) => ({ alias, routes }))
}

export async function executeProviderGateway(input: {
  alias?: string
  policy?: GatewayPolicy
  message: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  routes?: GatewayRoute[]
}) {
  const alias = input.alias ?? aliasForPolicy(input.policy ?? 'auto')
  const routes = input.routes ?? [...(ALIASES[alias] ?? ALIASES['text.balanced'])]
  const attempts: GatewayAttempt[] = []
  for (const candidate of routes) {
    const readiness = await getProviderReadiness(candidate.provider)
    if (!['ready', 'configured_untested'].includes(readiness.state)) {
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        alias: candidate.alias,
        status: 'skipped',
        latencyMs: 0,
        error: readiness.message,
      })
      continue
    }
    for (let attemptNumber = 0; attemptNumber <= candidate.maxRetries; attemptNumber += 1) {
      const request: UniversalProviderRequest = {
        providerKey: candidate.provider,
        model: candidate.model,
        message: input.message,
        systemPrompt: input.systemPrompt,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
        timeoutMs: candidate.timeoutMs,
      }
      const result = await callUniversalProvider(request)
      attempts.push({
        provider: candidate.provider,
        model: result.model,
        alias: candidate.alias,
        status: result.ok && result.output ? 'completed' : 'failed',
        latencyMs: result.latencyMs,
        error: result.error,
      })
      if (result.ok && result.output) {
        return {
          success: true,
          output: result.output,
          provider: candidate.provider,
          model: result.model,
          alias,
          attempts,
          cost: {
            inputPerMillion: candidate.estimatedInputCostPerMillion,
            outputPerMillion: candidate.estimatedOutputCostPerMillion,
          },
        }
      }
      if (!isRetryable(result.error)) break
    }
  }
  return {
    success: false,
    output: null,
    provider: null,
    model: null,
    alias,
    attempts,
    error: attempts.at(-1)?.error ?? 'No configured gateway route completed.',
  }
}

function route(
  alias: string,
  provider: ApprovedDirectProviderId,
  model: string,
  timeoutMs: number,
  maxRetries: number,
): GatewayRoute {
  return {
    alias,
    provider,
    model,
    timeoutMs,
    maxRetries,
    estimatedInputCostPerMillion: null,
    estimatedOutputCostPerMillion: null,
  }
}

function aliasForPolicy(policy: GatewayPolicy) {
  if (policy === 'cheap') return 'text.fast'
  if (policy === 'premium') return 'text.premium'
  return 'text.balanced'
}

function isRetryable(error: string | null) {
  return Boolean(error && /(timeout|429|rate|5\d\d|temporar|network|fetch)/i.test(error))
}
