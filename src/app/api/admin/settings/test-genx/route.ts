/**
 * POST /api/admin/settings/test-genx
 *
 * Test the GenX connection using the provided or stored API key.
 * Returns real test results — never faked.
 *
 * Response fields:
 *   success          boolean  — overall success (catalog OK and at least one execution endpoint OK)
 *   catalogOk        boolean  — model catalog endpoint responded OK
 *   chatOk           boolean  — chat completions endpoint responded OK
 *   modelCount       number   — number of models in catalog
 *   testedUrls       object   — { catalog, chat } — the exact URLs tested
 *   latencyMs        number   — total test duration
 *   apiUrl           string   — masked origin (no path or key)
 *   error            string?  — top-level error if unconfigured
 *   catalogError     string?  — catalog endpoint error detail
 *   chatError        string?  — chat endpoint error detail
 *
 * This route proves key/config validity plus direct provider catalog/chat reachability.
 * It does not prove every Brain/runtime capability path (image, video, music, TTS)
 * is working end-to-end through product routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'
import { normalizeGenXBaseUrl, resolveGenXConfig } from '@/lib/genx-client'
import { normalizeProviderCatalog } from '@/lib/providers/provider-discovery'

/** Translate an HTTP status to a user-facing error string */
function httpStatusToError(status: number): string {
  if (status === 404) return 'endpoint not found'
  if (status === 401 || status === 403) return 'authentication failed — check API key'
  if (status === 429) return 'rate limited'
  if (status >= 500) return `server error (HTTP ${status})`
  return `HTTP ${status}`
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Accept inline credentials from the form (not-yet-saved values)
  let inlineKey = ''
  let inlineUrl = ''
  try {
    const body = await req.json()
    inlineKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
    inlineUrl = typeof body.apiUrl === 'string' ? body.apiUrl.trim() : ''
  } catch { /* ignore — use stored config */ }

  const stored = await resolveGenXConfig()
  const apiKey = inlineKey || await getProviderKey('genx') || stored.apiKey || ''
  const apiUrl = inlineUrl || stored.apiUrl || 'https://query.genx.sh'
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      catalogOk: false,
      chatOk: false,
      modelCount: 0,
      proofType: 'catalog_and_chat_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      error: 'GenX API key is not configured',
    })
  }

  // Validate URL to prevent SSRF — must be http or https
  let parsedUrl: URL
  try {
    parsedUrl = new URL(apiUrl)
  } catch {
    return NextResponse.json({
      success: false, catalogOk: false, chatOk: false, modelCount: 0,
      proofType: 'catalog_and_chat_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      error: 'Invalid URL',
    })
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return NextResponse.json({
      success: false, catalogOk: false, chatOk: false, modelCount: 0,
      proofType: 'catalog_and_chat_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      error: 'URL must use http or https',
    })
  }
  // Reject obvious private/loopback ranges in production
  const hostname = parsedUrl.hostname.toLowerCase()
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(hostname) && process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false, catalogOk: false, chatOk: false, modelCount: 0,
      proofType: 'catalog_and_chat_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      error: 'Private or loopback URLs are not allowed',
    })
  }

  // Normalise the base URL (strip path suffixes, trailing slash)
  const baseUrl = normalizeGenXBaseUrl(apiUrl) ?? apiUrl

  // Mask URL to origin for response (no path, no key)
  let maskedUrl: string
  try {
    maskedUrl = new URL(baseUrl).origin
  } catch {
    maskedUrl = baseUrl
  }

  const catalogUrls  = [`${baseUrl}/api/v1/models`, `${baseUrl}/v1/models`]
  const chatUrl      = `${baseUrl}/v1/chat/completions`
  const generateUrls = [`${baseUrl}/api/v1/generate`, `${baseUrl}/v1/generate`]

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const start = Date.now()

  // ── Test 1: Model catalog — try /api/v1/models then /v1/models ────────────
  let catalogOk = false
  let catalogError: string | undefined
  let modelCount = 0
  let catalogPayload: unknown = null
  let resolvedCatalogUrl = catalogUrls[0]

  for (const url of catalogUrls) {
    try {
      // lgtm[js/request-forgery] — URL is validated above (protocol + private-IP checks); admin-only endpoint
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const data = await res.json() as { models?: unknown[] } | unknown[]
        const models = Array.isArray(data) ? data : ((data as { models?: unknown[] }).models ?? [])
        modelCount = models.length
        catalogPayload = data
        catalogOk = true
        resolvedCatalogUrl = url
        catalogError = undefined
        break
      } else {
        catalogError = httpStatusToError(res.status)
      }
    } catch (err) {
      catalogError = err instanceof Error ? err.message : 'catalog request failed'
    }
  }

  // ── Test 2: Chat completions ──────────────────────────────────────────────
  let chatOk = false
  let chatError: string | undefined
  const discoveredModels = normalizeProviderCatalog('genx', catalogPayload)
  if (modelCount === 0) modelCount = discoveredModels.length
  const chatModel = discoveredModels.find((model) => model.capabilities.includes('chat'))
    ?? discoveredModels.find((model) => model.capabilities.length === 0)

  try {
    if (!chatModel) throw new Error('Catalog returned no chat-capable model.')
    // lgtm[js/request-forgery] — URL is validated above (protocol + private-IP checks); admin-only endpoint
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: chatModel.id,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      chatOk = true
    } else {
      chatError = httpStatusToError(res.status)
    }
  } catch (err) {
    chatError = err instanceof Error ? err.message : 'chat request failed'
  }

  // ── Test 3: Media generate — try /api/v1/generate then /v1/generate ───────
  // Use a minimal dry-run probe (no actual generation). If the endpoint responds
  // (even with 400/422 for a missing required field), it is reachable.
  let generateOk = false
  let generateNotTested = false
  let generateError: string | undefined
  let resolvedGenerateUrl = generateUrls[0]

  for (const url of generateUrls) {
    try {
      // lgtm[js/request-forgery] — URL validated above; admin-only endpoint
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: '__probe__', type: 'image', prompt: 'probe' }),
        signal: AbortSignal.timeout(10_000),
      })
      // 200/202 → ok; 400/422/415 → endpoint exists but rejected the probe request (expected)
      if (res.ok || res.status === 400 || res.status === 422 || res.status === 415) {
        generateOk = true
        resolvedGenerateUrl = url
        generateError = undefined
        generateNotTested = false
        break
      } else if (res.status === 404) {
        generateError = `generate endpoint not found at ${url} (last attempted path)`
      } else {
        generateError = `${httpStatusToError(res.status)} (last attempted: ${url})`
      }
    } catch (err) {
      generateError = err instanceof Error ? err.message : 'generate request failed'
    }
  }

  if (!generateOk && !generateError) {
    generateNotTested = true
    generateError = 'generate endpoint not found at any tested path'
  }

  // Invalidate the in-process endpoint profile cache so the next real AI call
  // re-probes using the newly validated configuration.
  const { invalidateEndpointProfile } = await import('@/lib/genx-client')
  invalidateEndpointProfile()

  const latencyMs = Date.now() - start
  const executionOk = chatOk
  const success = catalogOk && executionOk

  return NextResponse.json({
    success,
    catalogOk,
    chatOk,
    generateOk,
    executionOk,
    generateNotTested,
    modelCount,
    latencyMs,
    proofType: 'catalog_and_chat_probe',
    proofKind: 'catalog_discovery_test',
    capabilityExecutionProven: false,
    detail: success
      ? 'GenX catalog and direct chat probe passed. Product capability readiness still requires real Brain/runtime route proof for image, video, music, and TTS.'
      : undefined,
    nextAction: success
      ? 'Run real Brain/runtime capability routes for the target GenX feature before marking it ready.'
      : undefined,
    apiUrl: maskedUrl,
    testedUrls: {
      catalog:  resolvedCatalogUrl,
      chat:     chatUrl,
      generate: resolvedGenerateUrl,
      allCatalogTested:  catalogUrls,
      allGenerateTested: generateUrls,
    },
    ...(catalogError  ? { catalogError }  : {}),
    ...(chatError     ? { chatError }     : {}),
    ...(generateError ? { generateError } : {}),
    ...(!success
      ? { error: catalogError || chatError || generateError || 'GenX connection failed' }
      : {}),
  })
}
