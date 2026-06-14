/**
 * Amarktai Brain Gateway — Core Library
 *
 * Single source of truth for:
 *   - Brain request / response type contracts
 *   - App authentication against the app registry
 *   - Routing policy skeleton (extensible)
 *   - Provider abstraction layer (pluggable adapters)
 *   - Brain event logging
 *
 * Server-side only. Never import from client components.
 */

import { prisma } from '@/lib/prisma'
import { timingSafeEqual } from 'crypto'
import { getDefaultModelForProvider, MODEL_REGISTRY } from '@/lib/model-registry'
import { isUsableServiceKey } from '@/lib/service-vault'
import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
import { getMeshCredential } from '@/lib/provider-mesh-status'

// ── Request / Response Contracts ─────────────────────────────────────────────

export interface BrainRequestInput {
  appId: string              // product slug (e.g. "amarktai-crypto")
  appSecret: string          // product.appSecret
  externalUserId?: string    // caller-supplied user ID (for future memory/personalisation)
  taskType: string           // e.g. 'chat' | 'analysis' | 'content' | 'support'
  message: string            // the prompt / payload
  metadata?: Record<string, unknown>
  requestMode?: 'sync' | 'async'  // 'async' queues via batch-processor; 'sync' (default) returns immediately
  traceId?: string           // caller-supplied trace ID; generated if omitted
}

export interface BrainResponse {
  success: boolean
  traceId: string
  app: { id: number; name: string; slug: string } | null
  routedProvider: string | null
  routedModel: string | null
  taskType: string
  executionMode: string       // direct | specialist | review | consensus
  confidenceScore: number | null
  validationUsed: boolean
  consensusUsed: boolean
  output: string | null
  warnings: string[]
  errors: string[]
  latencyMs: number | null
  memoryUsed: boolean         // false until memory layer is built
  fallbackUsed: boolean
  estimatedCostUsd?: number
  cumulativeCostUsd?: number | null
  resolvedCapability?: string
  resolvedCapabilities?: string[]
  timestamp: string
}

// ── App Authentication ────────────────────────────────────────────────────────

export interface AuthResult {
  ok: boolean
  statusCode: number
  error?: string
  app?: {
    id: number
    name: string
    slug: string
    category: string
    appType: string
    aiEnabled: boolean
    connectedToBrain: boolean
    status: string
  }
}

/**
 * Authenticate a calling app against the single app registry (Product table).
 * Uses timing-safe comparison to prevent secret enumeration attacks.
 */
export async function authenticateApp(appId: string, appSecret: string): Promise<AuthResult> {
  if (!appId || !appSecret) {
    return { ok: false, statusCode: 422, error: 'Missing appId or appSecret' }
  }

  const product = await prisma.product.findUnique({
    where: { slug: appId },
    select: {
      id: true, name: true, slug: true, category: true, appType: true,
      aiEnabled: true, connectedToBrain: true, status: true, appSecret: true,
    },
  })

  if (!product) return { ok: false, statusCode: 404, error: 'App not found in registry' }

  if (!product.appSecret) {
    return { ok: false, statusCode: 409, error: 'App not configured — no app secret set' }
  }

  // Timing-safe string comparison
  let secretMatch = false
  try {
    const a = Buffer.from(product.appSecret)
    const b = Buffer.from(appSecret)
    secretMatch = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    secretMatch = false
  }

  if (!secretMatch) return { ok: false, statusCode: 401, error: 'Invalid app secret' }

  if (product.status === 'offline') {
    return { ok: false, statusCode: 409, error: 'App is currently offline' }
  }

  if (!product.aiEnabled) {
    return { ok: false, statusCode: 409, error: 'AI is not enabled for this app' }
  }

  if (!product.connectedToBrain) {
    return { ok: false, statusCode: 409, error: 'App is not connected to the Brain — enable Brain connection in app settings' }
  }

  // Return app without exposing the secret
  const { appSecret: _omit, ...safeApp } = product
  return { ok: true, statusCode: 200, app: safeApp }
}

// ── Provider Abstraction ──────────────────────────────────────────────────────

/**
 * Resolve the default model for a provider.
 *
 * Delegates to the canonical model registry to avoid duplicate
 * switch-statements scattered across the codebase.
 */
function defaultModelFor(providerKey: string): string {
  return getDefaultModelForProvider(providerKey)
}

const BEARER_PREFIX = 'bearer '

function normalizeProviderApiKey(raw: string | null | undefined): string | null {
  if (!isUsableServiceKey(raw)) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith(BEARER_PREFIX)) {
    const token = trimmed.slice(BEARER_PREFIX.length).trim()
    return token || null
  }
  return trimmed
}

export interface ProviderCallResult {
  ok: boolean
  output: string | null
  error: string | null
  latencyMs: number
  model: string
  providerKey: string
}

/**
 * Compatibility lookup that delegates exclusively to provider mesh truth.
 *
 * brain/* routes — stream, tts, stt, research, suggestive-image etc.
 *
 */
export async function getVaultApiKey(providerKey: string): Promise<string | null> {
  const normalized = providerKey === 'dashscope'
    ? 'qwen'
    : providerKey === 'hf'
      ? 'huggingface'
      : providerKey
  if (!getProviderMeshNode(normalized)) return null
  return normalizeProviderApiKey(await getMeshCredential(normalized as ProviderMeshId))
}
/*

  // DB vault is the authoritative source (set via the Admin → AI Providers UI)
    // DB unavailable — fall through to env
  }

  // Env-var fallback for local dev / CI where the DB may not be provisioned
}

*/
/**
 * Together AI image generation model prefixes.
 * Models matching these prefixes require /v1/images/generations, not /v1/chat/completions.
 */
const TOGETHER_IMAGE_MODEL_PREFIXES = [
  'black-forest-labs/',
  'stabilityai/stable-diffusion',
  'stability-ai/',
]

function isTogetherImageModel(modelId: string): boolean {
  return TOGETHER_IMAGE_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix))
}

/**
 * Qwen Wanx model ID prefixes.
 * Wanx models require the DashScope AIGC endpoint (/v1/services/aigc/) —
 * NOT the compatible-mode /v1/chat/completions path.
 * They must not be routed through callProvider's standard chat branch.
 */
const QWEN_WANX_MODEL_PREFIXES = [
  'wanx',
]

function isQwenWanxModel(modelId: string): boolean {
  return QWEN_WANX_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix))
}

/**
 * Call an AI provider via the single provider vault.
 * Reads API key + base URL from the vault — never from the request.
 * Returns a normalised result. Never throws.
 *
 * @param systemPrompt - Optional system-level instructions injected via the
 *   provider's native system role (OpenAI/Groq/etc. system message, Anthropic
 *   `system` field, Gemini `systemInstruction`). Providers that lack a system
 *   role receive it prepended to the user message.
 */
export async function callProvider(
  providerKey: string,
  model: string,
  message: string,
  systemPrompt?: string,
): Promise<ProviderCallResult> {
  const start = Date.now()
  const meshNode = getProviderMeshNode(providerKey)
  if (!meshNode || meshNode.kind !== 'provider') {
    return {
      ok: false,
      output: null,
      error: `Provider "${providerKey}" is not approved by the provider mesh`,
      latencyMs: Date.now() - start,
      model,
      providerKey,
    }
  }

  const meshApiKey = await getVaultApiKey(providerKey)
  if (!meshApiKey) {
    return {
      ok: false, output: null,
      error: `Provider "${providerKey}" is not configured (no API key)`,
      latencyMs: Date.now() - start, model, providerKey,
    }
  }

  const resolvedApiKey = meshApiKey
  if (!resolvedApiKey) {
    return {
      ok: false, output: null,
      error: `Provider "${providerKey}" API key could not be decrypted`,
      latencyMs: Date.now() - start, model, providerKey,
    }
  }

  let resolvedModel: string
  try {
    resolvedModel = model || defaultModelFor(providerKey)
  } catch (err) {
    return {
      ok: false,
      output: null,
      error: err instanceof Error ? err.message : `No default model for provider "${providerKey}"`,
      latencyMs: Date.now() - start,
      model: model || 'unknown',
      providerKey,
    }
  }
  const timeout = 30_000

  // ── Phase 7: Strict execution guard ──────────────────────────────────────
  // Reject calls to models that are explicitly disabled in the registry.
  // A model being absent from the registry is allowed (e.g. vault-only custom
  // models) — only explicitly disabled registry entries are blocked.
  const registryEntry = MODEL_REGISTRY.find(
    (m) => m.model_id === resolvedModel && m.provider === providerKey
  )
  if (registryEntry && !registryEntry.enabled) {
    return {
      ok: false,
      output: null,
      error: `Model "${resolvedModel}" is disabled and cannot be executed. Check the model registry.`,
      latencyMs: Date.now() - start,
      model: resolvedModel,
      providerKey,
    }
  }

  try {
    switch (providerKey) {
      // ── OpenAI-compatible: OpenAI, Groq, DeepSeek, OpenRouter, Together AI, xAI/Grok, Qwen ──
      case 'genx':
      case 'groq':
      case 'together':
      case 'qwen':
      case 'mimo': {
        const base = meshNode.baseUrl.replace(/\/v1\/?$/, '')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedApiKey}`,
        }
        // ── Phase 5: Wanx guard ──────────────────────────────────────────
        // Wanx image/video models require DashScope AIGC endpoint, NOT the
        // compatible-mode chat/completions path. Return a clear error rather
        // than silently routing to the wrong endpoint.
        if (providerKey === 'qwen' && isQwenWanxModel(resolvedModel)) {
          return {
            ok: false,
            output: null,
            error: `Qwen Wanx model "${resolvedModel}" requires the DashScope AIGC endpoint which is not yet wired in callProvider. Use the specialist /api/brain/image or /api/brain/video-generate routes instead.`,
            latencyMs: Date.now() - start,
            model: resolvedModel,
            providerKey,
          }
        }
        // ── Phase 6: Together image routing ──────────────────────────────
        // Together AI image-generation models (FLUX, Stable Diffusion) use
        // /v1/images/generations, not /v1/chat/completions.
        if (providerKey === 'together' && isTogetherImageModel(resolvedModel)) {
          const imgRes = await fetch(`${base}/v1/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: resolvedModel,
              prompt: message,
              n: 1,
            }),
            signal: AbortSignal.timeout(timeout),
          })
          if (!imgRes.ok) {
            const errBody = await imgRes.json().catch(() => ({})) as { error?: { message?: string } }
            return { ok: false, output: null, error: `Together Images API HTTP ${imgRes.status}: ${errBody?.error?.message ?? 'request failed'}`, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
          }
          const imgData = await imgRes.json() as { data?: Array<{ url?: string; b64_json?: string }> }
          const imageUrl = imgData?.data?.[0]?.url ?? imgData?.data?.[0]?.b64_json ?? null
          return { ok: true, output: imageUrl, error: null, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
        }
        const res = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: resolvedModel,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: message },
            ],
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(timeout),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
          return { ok: false, output: null, error: `${providerKey} HTTP ${res.status}: ${body?.error?.message ?? 'request failed'}`, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
        }
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
        return { ok: true, output: data?.choices?.[0]?.message?.content ?? null, error: null, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
      }

      // ── Gemini ──────────────────────────────────────────────────────────────
      // ── Hugging Face Inference ──────────────────────────────────────────────
      case 'huggingface': {
        const base = meshNode.baseUrl || 'https://api-inference.huggingface.co'
        const headers: Record<string, string> = {
          Authorization: `Bearer ${resolvedApiKey}`,
        }

        // Detect task type from model name patterns to send correct payload
        const modelLower = resolvedModel.toLowerCase()
        const isEmbedding = modelLower.includes('embed') || modelLower.includes('sentence-transformer') || modelLower.includes('bge-') || modelLower.includes('e5-')
        const isTTS = modelLower.includes('tts') || modelLower.includes('bark') || modelLower.includes('speecht5') || modelLower.includes('speech-t5')
        const isSTT = modelLower.includes('whisper') || modelLower.includes('wav2vec') || modelLower.includes('stt')

        let body: string
        const contentType = 'application/json'

        if (isEmbedding) {
          // Embedding models: { inputs: string | string[] } → returns float[][]
          body = JSON.stringify({ inputs: message })
        } else if (isTTS) {
          // TTS models: { inputs: string } → returns audio bytes
          body = JSON.stringify({ inputs: message })
        } else if (isSTT) {
          // STT models: raw audio bytes (message is expected to be a base64-encoded audio)
          // For text-based calls, wrap in the standard format
          body = JSON.stringify({ inputs: message })
        } else {
          // Default: text generation with parameters for better results
          body = JSON.stringify({
            inputs: message,
            parameters: { max_new_tokens: 1024, return_full_text: false },
          })
        }
        headers['Content-Type'] = contentType

        const res = await fetch(`${base}/models/${resolvedModel}`, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(timeout),
        })
        if (!res.ok) {
          return { ok: false, output: null, error: `Hugging Face HTTP ${res.status}`, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
        }

        if (isTTS) {
          // TTS returns audio buffer — convert to base64 data URL
          const audioBuffer = await res.arrayBuffer()
          const base64 = Buffer.from(audioBuffer).toString('base64')
          return { ok: true, output: `data:audio/wav;base64,${base64}`, error: null, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
        }

        if (isEmbedding) {
          // Embedding returns float[][] — return as JSON string
          const embeddings = await res.json()
          return { ok: true, output: JSON.stringify(embeddings), error: null, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
        }

        const data = await res.json() as Array<{ generated_text?: string }> | { generated_text?: string }
        const text = Array.isArray(data) ? (data[0]?.generated_text ?? null) : (data?.generated_text ?? null)
        return { ok: true, output: text, error: null, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
      }

      // ── NVIDIA NIM (OpenAI-compatible) ──────────────────────────────────────
      // ── Anthropic (Claude) ────────────────────────────────────────────────
      // ── Cohere ────────────────────────────────────────────────────────────
      // ── Mistral AI (OpenAI-compatible) ─────────────────────────────────────
      // ── Replicate ──────────────────────────────────────────────────────────
      default:
        return { ok: false, output: null, error: `Unknown provider: "${providerKey}"`, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    const msg = isTimeout
      ? `Provider "${providerKey}" timed out after 30 s`
      : `Provider "${providerKey}" error: ${err instanceof Error ? err.message : 'unknown'}`
    return { ok: false, output: null, error: msg, latencyMs: Date.now() - start, model: resolvedModel, providerKey }
  }
}

// ── Brain Event Logging ───────────────────────────────────────────────────────

export interface BrainEventPayload {
  traceId: string
  productId: number | null
  appSlug: string
  taskType: string
  executionMode: string
  classificationJson: string    // JSON string of ClassificationResult
  routedProvider: string | null
  routedModel: string | null
  validationUsed: boolean
  consensusUsed: boolean
  confidenceScore: number | null
  success: boolean
  errorMessage: string | null
  warningsJson: string          // JSON string of string[]
  latencyMs: number | null
}

/**
 * Persist a brain event. Never throws — logging failures must not crash the gateway.
 */
export async function logBrainEvent(event: BrainEventPayload): Promise<void> {
  try {
    await prisma.brainEvent.create({ data: event })
  } catch (err) {
    console.error('[brain] Failed to persist brain event:', err)
  }
}
