/**
 * Amarktai Network — AI Provider Vault Utilities
 *
 * Server-side only helper functions for AI provider key masking and health checks.
 * This file MUST NOT be imported from client components.
 *
 * APPROVED DIRECT PROVIDERS (Agent Contract v2.0.0 §2):
 *   genx        — Primary AI gateway (OpenAI-compatible, routes to GPT-4o, Claude, Gemini, etc.)
 *   groq        — Ultra-low-latency inference
 *   together    — Open-source model hosting (Llama, FLUX, etc.)
 *   huggingface — Open-source models, embeddings, MMS-TTS, STT
 *   qwen        — Alibaba Cloud: Qwen chat, WanX image/video
 *   mimo        — Xiaomi MiMo reasoning model
 *
 * PROHIBITED PROVIDERS (must not appear as direct integrations):
 *   openai, anthropic, gemini, grok, deepseek, openrouter,
 *   cohere, mistral, nvidia, replicate, suno, udio, minimax
 *   → Route all of these through GenX using their model labels.
 */

import { decryptVaultKey } from '@/lib/crypto-vault'

/**
 * Generate a safe masked preview of an API key.
 * Shows prefix (up to 8 chars or up to the first '-') and last 4 chars.
 * Example: "sk-proj-••••••••••••abcd"
 */
export function maskApiKey(key: string): string {
  if (!key) return ''
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  // Try to preserve the common prefix pattern (e.g. "sk-", "sk-proj-", "Bearer ")
  const dashIdx = trimmed.lastIndexOf('-', 10) // search only the first ~10 chars for a prefix separator
  const prefixLen = dashIdx > 0 ? dashIdx + 1 : Math.min(7, trimmed.length - 4)
  const prefix = trimmed.substring(0, prefixLen)
  const suffix = trimmed.slice(-4)
  return `${prefix}${'•'.repeat(12)}${suffix}`
}

export interface HealthCheckResult {
  status: 'healthy' | 'configured' | 'degraded' | 'error' | 'unconfigured' | 'disabled'
  message: string
}

export type ProviderOperationalState = 'WORKING' | 'MISCONFIGURED' | 'UNAVAILABLE'

export function mapHealthStatusToTruthState(
  status: HealthCheckResult['status'],
): ProviderOperationalState {
  if (status === 'healthy') return 'WORKING'
  if (status === 'error' || status === 'unconfigured') return 'MISCONFIGURED'
  return 'UNAVAILABLE'
}

const BEARER_PREFIX = 'bearer '

function normalizeApiKey(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase().startsWith(BEARER_PREFIX)) {
    return trimmed.slice(BEARER_PREFIX.length).trim()
  }
  return trimmed
}

function resolveStoredApiKey(rawStoredKey: string): string {
  const decrypted = decryptVaultKey(rawStoredKey)
  if (decrypted === null && rawStoredKey.startsWith('v1:')) {
    console.warn('[providers] Encrypted provider key could not be decrypted for health check.')
  }
  const candidate = decrypted ?? rawStoredKey
  return normalizeApiKey(candidate)
}

const HF_HEALTHCHECK_MODEL = 'distilbert-base-uncased-finetuned-sst-2-english'

/**
 * Run a live health check for the given provider.
 * Returns a truthful status — never fakes healthy.
 */
export async function runProviderHealthCheck(
  providerKey: string,
  apiKey: string,
  baseUrl: string,
): Promise<HealthCheckResult> {
  if (!apiKey) return { status: 'unconfigured', message: 'No API key configured' }
  const resolvedApiKey = resolveStoredApiKey(apiKey)
  if (!resolvedApiKey || resolvedApiKey.startsWith('v1:')) {
    return {
      status: 'error',
      message: 'Stored API key could not be decrypted. Verify VAULT_ENCRYPTION_KEY configuration.',
    }
  }

  const timeout = 10_000 // 10 s

  try {
    switch (providerKey) {
      // ── GenX (Primary Gateway) ────────────────────────────────────────────
      case 'genx': {
        const endpoint = `${baseUrl || 'https://query.genx.sh'}/api/v1/models`
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${resolvedApiKey}` },
          signal: AbortSignal.timeout(timeout),
        })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const count = Array.isArray(data?.models) ? data.models.length : '?'
          return { status: 'healthy', message: `Connected · GenX catalog responding (${count} models)` }
        }
        if (res.status === 401) return { status: 'error', message: 'Invalid GenX API key (401 Unauthorized)' }
        if (res.status === 429) return { status: 'degraded', message: 'GenX rate limited (429)' }
        return { status: 'degraded', message: `HTTP ${res.status} from GenX catalog endpoint` }
      }

      // ── Groq ─────────────────────────────────────────────────────────────
      case 'groq': {
        const endpoint = `${baseUrl || 'https://api.groq.com/openai'}/v1/chat/completions`
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${resolvedApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'health check' }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(timeout),
        })
        if (res.ok) return { status: 'healthy', message: 'Connected · Groq execution path responding' }
        if (res.status === 401) return { status: 'error', message: 'Invalid API key (401 Unauthorized)' }
        if (res.status === 429) return { status: 'degraded', message: 'Rate limited (429)' }
        return { status: 'degraded', message: `HTTP ${res.status} from Groq API` }
      }

      // ── Together AI ───────────────────────────────────────────────────────
      case 'together': {
        const endpoint = `${baseUrl || 'https://api.together.xyz'}/v1/models`
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${resolvedApiKey}` },
          signal: AbortSignal.timeout(timeout),
        })
        if (res.ok) return { status: 'healthy', message: 'Connected · Together AI API responding' }
        if (res.status === 401) return { status: 'error', message: 'Invalid API key (401 Unauthorized)' }
        if (res.status === 429) return { status: 'degraded', message: 'Rate limited (429)' }
        return { status: 'degraded', message: `HTTP ${res.status} from Together AI API` }
      }

      // ── Hugging Face ──────────────────────────────────────────────────────
      case 'huggingface': {
        const whoamiRes = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { Authorization: `Bearer ${resolvedApiKey}` },
          signal: AbortSignal.timeout(timeout),
        })
        if (whoamiRes.ok) {
          return { status: 'healthy', message: 'Connected · Hugging Face account endpoint responding' }
        }

        // Some tokens can run inference even when whoami is restricted; verify
        // the exact path used by runtime image/audio routes before marking invalid.
        const inferenceRes = await fetch(
          `https://api-inference.huggingface.co/models/${HF_HEALTHCHECK_MODEL}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resolvedApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: 'health check' }),
            signal: AbortSignal.timeout(timeout),
          },
        )

        if (inferenceRes.ok || inferenceRes.status === 503) {
          return {
            status: 'degraded',
            message:
              `Account endpoint HTTP ${whoamiRes.status}, but inference access is valid. ` +
              'Token is usable for runtime Hugging Face inference routes.',
          }
        }
        if (inferenceRes.status === 401 || inferenceRes.status === 403) {
          return {
            status: 'error',
            message:
              `Hugging Face token rejected by inference endpoint (HTTP ${inferenceRes.status}). ` +
              'Invalid token or missing model/inference access scope.',
          }
        }

        return {
          status: 'degraded',
          message:
            `Hugging Face health check mismatch: whoami HTTP ${whoamiRes.status}, ` +
            `inference HTTP ${inferenceRes.status}.`,
        }
      }

      // ── Qwen / DashScope / WanX ───────────────────────────────────────────
      case 'qwen': {
        const endpoint = `${baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode'}/v1/models`
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${resolvedApiKey}` },
          signal: AbortSignal.timeout(timeout),
        })
        if (res.ok) return { status: 'healthy', message: 'Connected · Qwen/DashScope API responding' }
        if (res.status === 401) return { status: 'error', message: 'Invalid API key (401 Unauthorized)' }
        if (res.status === 429) return { status: 'degraded', message: 'Rate limited (429)' }
        return { status: 'degraded', message: `HTTP ${res.status} from Qwen/DashScope API` }
      }

      // ── MiMo (Xiaomi) ─────────────────────────────────────────────────────
      case 'mimo': {
        const endpoint = `${baseUrl || 'https://api.mimo.ai'}/v1/models`
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${resolvedApiKey}` },
          signal: AbortSignal.timeout(timeout),
        })
        if (res.ok) return { status: 'healthy', message: 'Connected · MiMo API responding' }
        if (res.status === 401) return { status: 'error', message: 'Invalid MiMo API key (401 Unauthorized)' }
        if (res.status === 429) return { status: 'degraded', message: 'Rate limited (429)' }
        return { status: 'degraded', message: `HTTP ${res.status} from MiMo API` }
      }

      // ── Prohibited providers — route these through GenX ───────────────────
      case 'openai':
      case 'anthropic':
      case 'gemini':
      case 'grok':
      case 'deepseek':
      case 'openrouter':
      case 'cohere':
      case 'mistral':
      case 'nvidia':
        return {
          status: 'error',
          message: `Provider "${providerKey}" is prohibited per Agent Contract §2.1. Route through GenX instead.`,
        }

      default:
        return { status: 'configured', message: 'Key configured · connectivity not validated' }
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return { status: 'degraded', message: 'Health check timed out (>10 s)' }
      }
      return { status: 'degraded', message: `Health check failed: ${err.message}` }
    }
    return { status: 'degraded', message: 'Health check failed: unknown error' }
  }
}
