import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderMeshNode, sanitizeProviderError, type ProviderMeshId } from '@/lib/provider-mesh'
import { getMeshCredential, recordMeshTestResult } from '@/lib/provider-mesh-status'
import { testLocalTool } from '@/lib/local-tools'
import { discoverProvider, resolveProviderEndpoint } from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
import { getProviderTruth } from '@/lib/providers/registry'

type TestPayload = { success?: boolean; error?: string; detail?: string; note?: string; connected?: boolean; [key: string]: unknown }

async function runExistingTest(id: ProviderMeshId, request: NextRequest): Promise<TestPayload | null> {
  const forwarded = new NextRequest(request.url, { method: 'POST', headers: request.headers, body: '{}' })
  if (id === 'genx') return (await (await import('@/app/api/admin/settings/test-genx/route')).POST(forwarded)).json()
  if (id === 'huggingface') return (await (await import('@/app/api/admin/settings/test-huggingface/route')).POST(forwarded)).json()
  if (id === 'qwen') return (await (await import('@/app/api/admin/settings/test-qwen/route')).POST(forwarded)).json()
  if (id === 'groq') return (await (await import('@/app/api/admin/settings/test-groq/route')).POST(forwarded)).json()
  if (id === 'together') return (await (await import('@/app/api/admin/settings/test-together/route')).POST(forwarded)).json()
  if (id === 'github') return (await (await import('@/app/api/admin/settings/test-github/route')).POST(forwarded)).json()
  if (id === 'redis') return (await (await import('@/app/api/admin/settings/test-redis/route')).POST()).json()
  if (id === 'storage') return (await (await import('@/app/api/admin/settings/test-storage/route')).POST(forwarded)).json()
  if (id === 'smtp') return (await (await import('@/app/api/admin/settings/test-smtp/route')).POST()).json()
  return null
}
async function runNewTest(id: ProviderMeshId): Promise<TestPayload> {
  if (id === 'local-crawler' || id === 'playwright' || id === 'scrapy' || id === 'trafilatura' || id === 'ffmpeg' || id === 'storage') {
    const result = await testLocalTool(id)
    return { success: result.connected, detail: result.detail }
  }

  const credential = await getMeshCredential(id)
  if (!credential) return { success: false, error: 'Key not present' }

  if (id === 'mimo') {
    const discovery = await discoverProvider('mimo', {
      force: true,
      credential,
      keySource: 'stored',
    })
    const chatModel = modelsForCapability(discovery, 'chat')[0]
    if (!chatModel) {
      return {
        success: false,
        error: discovery.error || 'MiMo catalog returned no chat-capable model.',
      }
    }
    const baseUrl = resolveProviderEndpoint(getProviderTruth('mimo')!, 'token_plan')
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: chatModel.id, messages: [{ role: 'user', content: 'Reply with OK.' }], max_tokens: 4 }),
      signal: AbortSignal.timeout(20_000),
    })
    return response.ok
      ? {
          success: true,
          detail: `OpenAI-compatible chat passed with a dynamically discovered ${chatModel.capabilityEvidence} model.`,
          model: chatModel.id,
        }
      : { success: false, error: `Xiaomi MiMo returned HTTP ${response.status}` }
  }

  if (id === 'qdrant') {
    const baseUrl = credential.startsWith('http') ? credential : process.env.QDRANT_URL || 'http://127.0.0.1:6333'
    const apiKey = credential.startsWith('http') ? process.env.QDRANT_API_KEY : credential
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/collections`, {
      headers: apiKey ? { 'api-key': apiKey } : {},
      signal: AbortSignal.timeout(10_000),
    })
    return response.ok ? { success: true, detail: 'Collections endpoint passed.' } : { success: false, error: `Qdrant returned HTTP ${response.status}` }
  }

  return { success: false, error: 'No live test is defined for this connection.' }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { key?: string }
  const node = getProviderMeshNode(body.key || '')
  if (!node) return NextResponse.json({ success: false, error: 'Unknown connection' }, { status: 404 })
  const localRuntime = ['local-crawler', 'playwright', 'scrapy', 'trafilatura', 'ffmpeg', 'storage'].includes(node.id)
  if (!localRuntime && node.envAliases.length > 0 && !await getMeshCredential(node.id)) {
    return NextResponse.json({
      success: false,
      connected: false,
      status: 'missing',
      error: 'Key not present',
      capabilities: [],
    })
  }

  const startedAt = Date.now()
  try {
    const result = await runExistingTest(node.id, request) ?? await runNewTest(node.id)
    const capabilityExecutionProven = result.capabilityExecutionProven !== false
    const success = result.success === true
      && capabilityExecutionProven
      && (node.id !== 'redis' || result.connected === true)
    const error = success ? '' : sanitizeProviderError(result.error || result.detail || result.note || 'Live test failed')
    const detail = success
      ? String(result.detail || result.note || `${node.displayName} live test passed.`)
      : node.id === 'huggingface' && result.success === true
        ? String(result.detail || result.note || 'Token/account check passed, but capability execution is not proven by this test.')
        : error
    try {
      await recordMeshTestResult({
        id: node.id,
        success,
        capabilities: node.capabilities,
        detail,
        error,
        metadata: { latencyMs: Date.now() - startedAt },
      })
    } catch (persistenceError) {
      console.error(`[settings/test-provider] Failed to persist ${node.id} live-test status:`, persistenceError)
      return NextResponse.json({
        success: false,
        connected: false,
        providerTestPassed: success,
        error: `The ${node.displayName} live test completed, but its status could not be saved.`,
        latencyMs: Date.now() - startedAt,
      }, { status: 500 })
    }
    return NextResponse.json({
      success,
      connected: success,
      capabilities: success ? node.capabilities : [],
      capabilityExecutionProven: success,
      lastTestedAt: new Date().toISOString(),
      detail: success ? detail : undefined,
      error: success ? undefined : error,
      note: !success && node.id === 'huggingface' && result.success === true
        ? 'Hugging Face account-token check passed, but no capability execution route was proven.'
        : undefined,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    const sanitized = sanitizeProviderError(error)
    try {
      await recordMeshTestResult({
        id: node.id,
        success: false,
        capabilities: node.capabilities,
        detail: sanitized,
        error: sanitized,
      })
    } catch (persistenceError) {
      console.error(`[settings/test-provider] Failed to persist ${node.id} live-test failure:`, persistenceError)
      return NextResponse.json({
        success: false,
        connected: false,
        error: `${sanitized} The failed status could not be saved.`,
        latencyMs: Date.now() - startedAt,
      }, { status: 500 })
    }
    return NextResponse.json({ success: false, connected: false, error: sanitized, latencyMs: Date.now() - startedAt })
  }
}
