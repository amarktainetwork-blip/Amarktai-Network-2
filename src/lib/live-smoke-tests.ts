/**
 * @module live-smoke-tests
 * @description Live provider smoke test framework for AmarktAI Network V1.
 *
 * Each smoke test:
 *   - Checks whether the provider credential is configured.
 *   - If configured, performs a minimal live API call (cheapest/fastest possible).
 *   - Reports latency, result, and safe error reason.
 *   - Never exposes secrets or raw API responses.
 *   - Reports "not_configured" when credentials are missing — never "failed".
 *
 * Providers covered:
 *   - GenX
 *   - Hugging Face
 *   - Qwen / DashScope
 *   - Xiaomi MiMo
 *   - Groq
 *   - Together AI
 *
 * Server-side only — do NOT import from client components.
 */

import { getProviderMeshNode, sanitizeProviderError, type ApprovedDirectProviderId } from '@/lib/provider-mesh'
import { isUsableServiceKey } from '@/lib/service-vault'
import { getMeshCredential } from '@/lib/provider-mesh-status'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SmokeTestStatus =
  | 'pass'
  | 'fail'
  | 'not_configured'
  | 'skipped'

export type CapabilityGroupSmokeStatus = 'testable' | 'not_testable' | 'not_configured'

export interface ProviderSmokeResult {
  provider: ApprovedDirectProviderId
  displayName: string
  configured: boolean
  testable: boolean
  status: SmokeTestStatus
  latencyMs: number | null
  safeErrorReason: string | null
  testedAt: string | null
  supportedCapabilityGroups: string[]
  smokeCapability: string | null
  smokeModel: string | null
}

// ── Provider capability group map ─────────────────────────────────────────────

const PROVIDER_CAPABILITY_GROUPS: Record<ApprovedDirectProviderId, string[]> = {
  genx: ['text', 'image', 'video', 'audio', 'tts', 'stt', 'music', 'avatar'],
  huggingface: ['text', 'image', 'audio', 'stt', 'embeddings'],
  qwen: ['text', 'image', 'video', 'audio', 'embeddings'],
  mimo: ['text', 'reasoning', 'vision', 'audio', 'tts', 'stt'],
  groq: ['text', 'reasoning', 'stt', 'tts'],
  together: ['text', 'image', 'embeddings', 'rerank'],
}

// ── Smoke test probe definitions ──────────────────────────────────────────────

/**
 * Minimal chat/text probe — single-token response, cheapest possible.
 */
async function probeTextProvider(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; latencyMs: number; error: string | null }> {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        max_tokens: 4,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const latencyMs = Date.now() - start
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, latencyMs, error: sanitizeProviderError(new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)) }
    }
    return { ok: true, latencyMs, error: null }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: sanitizeProviderError(err) }
  }
}

/**
 * GenX smoke test — uses the GenX /chat/completions endpoint with the smallest model.
 */
async function smokeTestGenX(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const baseUrl = process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || 'https://query.genx.sh'
  const model = process.env.GENX_SMOKE_MODEL?.trim() || 'genx-mini'
  const result = await probeTextProvider(baseUrl, apiKey, model)
  return { ...result, model }
}

/**
 * Hugging Face smoke test — uses the HF Inference API with a small text model.
 */
async function smokeTestHuggingFace(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const model = process.env.HF_SMOKE_MODEL?.trim() || 'HuggingFaceTB/SmolLM2-135M-Instruct'
  const start = Date.now()
  try {
    const res = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        max_tokens: 4,
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    })
    const latencyMs = Date.now() - start
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, latencyMs, error: sanitizeProviderError(new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)), model }
    }
    return { ok: true, latencyMs, error: null, model }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: sanitizeProviderError(err), model }
  }
}

/**
 * Qwen / DashScope smoke test — uses the DashScope compatible OpenAI endpoint.
 */
async function smokeTestQwen(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const model = process.env.QWEN_SMOKE_MODEL?.trim() || 'qwen-turbo'
  const result = await probeTextProvider('https://dashscope-intl.aliyuncs.com/compatible-mode/v1', apiKey, model)
  return { ...result, model }
}

/**
 * MiMo smoke test — uses the Xiaomi MiMo OpenAI-compatible endpoint.
 */
async function smokeTestMiMo(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const model = process.env.MIMO_SMOKE_MODEL?.trim() || 'MiMo-7B-RL'
  const result = await probeTextProvider('https://api.xiaomimimo.com/v1', apiKey, model)
  return { ...result, model }
}

/**
 * Groq smoke test — uses the Groq OpenAI-compatible endpoint with a fast model.
 */
async function smokeTestGroq(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const model = process.env.GROQ_SMOKE_MODEL?.trim() || 'llama-3.1-8b-instant'
  const result = await probeTextProvider('https://api.groq.com/openai/v1', apiKey, model)
  return { ...result, model }
}

/**
 * Together AI smoke test — uses the Together OpenAI-compatible endpoint.
 */
async function smokeTestTogether(apiKey: string): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  const model = process.env.TOGETHER_SMOKE_MODEL?.trim() || 'meta-llama/Llama-3.2-3B-Instruct-Turbo'
  const result = await probeTextProvider('https://api.together.xyz/v1', apiKey, model)
  return { ...result, model }
}

// ── Smoke capability map ──────────────────────────────────────────────────────

const SMOKE_CAPABILITY: Record<ApprovedDirectProviderId, string> = {
  genx: 'chat/text',
  huggingface: 'chat/text',
  qwen: 'chat/text',
  mimo: 'chat/text',
  groq: 'chat/text',
  together: 'chat/text',
}

// ── Per-provider runner ───────────────────────────────────────────────────────

async function runProviderSmokeTest(
  id: ApprovedDirectProviderId,
  apiKey: string,
): Promise<{ ok: boolean; latencyMs: number; error: string | null; model: string }> {
  switch (id) {
    case 'genx': return smokeTestGenX(apiKey)
    case 'huggingface': return smokeTestHuggingFace(apiKey)
    case 'qwen': return smokeTestQwen(apiKey)
    case 'mimo': return smokeTestMiMo(apiKey)
    case 'groq': return smokeTestGroq(apiKey)
    case 'together': return smokeTestTogether(apiKey)
    default: return { ok: false, latencyMs: 0, error: 'No smoke test defined for this provider.', model: 'unknown' }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run smoke tests for all approved AI providers.
 *
 * - If a provider is not configured, returns `not_configured` without attempting a call.
 * - If a provider is configured, performs a minimal live API call.
 * - Never exposes API keys or raw error messages.
 * - Runs all providers concurrently.
 */
export async function runAllProviderSmokeTests(): Promise<ProviderSmokeResult[]> {
  const APPROVED: ApprovedDirectProviderId[] = ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together']

  return Promise.all(APPROVED.map(async (id): Promise<ProviderSmokeResult> => {
    const node = getProviderMeshNode(id)!
    const envKey = node.envAliases.find((alias) => isUsableServiceKey(process.env[alias]))
    const vaultKey = await getMeshCredential(id).catch(() => null)
    const apiKey = (envKey ? process.env[envKey] : vaultKey) ?? null
    const configured = isUsableServiceKey(apiKey)

    if (!configured) {
      return {
        provider: id,
        displayName: node.displayName,
        configured: false,
        testable: false,
        status: 'not_configured',
        latencyMs: null,
        safeErrorReason: `Configure one of: ${node.envAliases.join(', ')}`,
        testedAt: null,
        supportedCapabilityGroups: PROVIDER_CAPABILITY_GROUPS[id] ?? [],
        smokeCapability: SMOKE_CAPABILITY[id] ?? null,
        smokeModel: null,
      }
    }

    try {
      const result = await runProviderSmokeTest(id, apiKey!)
      return {
        provider: id,
        displayName: node.displayName,
        configured: true,
        testable: true,
        status: result.ok ? 'pass' : 'fail',
        latencyMs: result.latencyMs,
        safeErrorReason: result.error,
        testedAt: new Date().toISOString(),
        supportedCapabilityGroups: PROVIDER_CAPABILITY_GROUPS[id] ?? [],
        smokeCapability: SMOKE_CAPABILITY[id] ?? null,
        smokeModel: result.model,
      }
    } catch (err) {
      return {
        provider: id,
        displayName: node.displayName,
        configured: true,
        testable: true,
        status: 'fail',
        latencyMs: null,
        safeErrorReason: sanitizeProviderError(err),
        testedAt: new Date().toISOString(),
        supportedCapabilityGroups: PROVIDER_CAPABILITY_GROUPS[id] ?? [],
        smokeCapability: SMOKE_CAPABILITY[id] ?? null,
        smokeModel: null,
      }
    }
  }))
}

/**
 * Run a smoke test for a single provider by id.
 */
export async function runProviderSmokeTestById(id: ApprovedDirectProviderId): Promise<ProviderSmokeResult> {
  const results = await runAllProviderSmokeTests()
  return results.find((r) => r.provider === id) ?? {
    provider: id,
    displayName: id,
    configured: false,
    testable: false,
    status: 'not_configured',
    latencyMs: null,
    safeErrorReason: 'Unknown provider.',
    testedAt: null,
    supportedCapabilityGroups: [],
    smokeCapability: null,
    smokeModel: null,
  }
}
