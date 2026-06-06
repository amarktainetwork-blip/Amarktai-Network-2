import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderMeshNode, sanitizeProviderError, type ProviderMeshId } from '@/lib/provider-mesh'
import { getMeshCredential, recordMeshTestResult } from '@/lib/provider-mesh-status'
import { testLocalTool } from '@/lib/local-tools'

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
  if (id === 'local-crawler' || id === 'ffmpeg' || id === 'storage') {
    const result = await testLocalTool(id)
    return { success: result.connected, detail: result.detail }
  }

  const credential = await getMeshCredential(id)
  if (!credential) return { success: false, error: 'Key not present' }

  if (id === 'mimo') {
    const response = await fetch(`${process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.MIMO_TEST_MODEL || 'mimo-v2.5', messages: [{ role: 'user', content: 'Reply with OK.' }], max_tokens: 4 }),
      signal: AbortSignal.timeout(20_000),
    })
    return response.ok ? { success: true, detail: 'OpenAI-compatible chat passed.' } : { success: false, error: `Xiaomi MiMo returned HTTP ${response.status}` }
  }

  if (id === 'replicate') {
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${credential}` },
      signal: AbortSignal.timeout(15_000),
    })
    return response.ok ? { success: true, detail: 'Authenticated account access passed.' } : { success: false, error: `Replicate returned HTTP ${response.status}` }
  }

  if (id === 'fal') {
    const response = await fetch('https://api.fal.ai/v1/models?status=active', {
      headers: { Authorization: `Key ${credential}` },
      signal: AbortSignal.timeout(15_000),
    })
    const payload = response.ok ? await response.json().catch(() => ({})) as { models?: unknown[] } : {}
    return response.ok
      ? { success: true, detail: `${payload.models?.length ?? 0} active models visible.` }
      : { success: false, error: `Fal returned HTTP ${response.status}` }
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

  const startedAt = Date.now()
  try {
    const result = await runExistingTest(node.id, request) ?? await runNewTest(node.id)
    const success = result.success === true && (node.id !== 'redis' || result.connected === true)
    const error = success ? '' : sanitizeProviderError(result.error || result.detail || result.note || 'Live test failed')
    await recordMeshTestResult({
      id: node.id,
      success,
      capabilities: node.capabilities,
      detail: String(result.detail || result.note || ''),
      error,
      metadata: { latencyMs: Date.now() - startedAt },
    })
    return NextResponse.json({
      success,
      connected: success,
      capabilities: success ? node.capabilities : [],
      lastTestedAt: new Date().toISOString(),
      detail: success ? String(result.detail || result.note || 'Live test passed.') : undefined,
      error: success ? undefined : error,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    const sanitized = sanitizeProviderError(error)
    await recordMeshTestResult({ id: node.id, success: false, capabilities: [], error: sanitized })
    return NextResponse.json({ success: false, connected: false, error: sanitized, latencyMs: Date.now() - startedAt })
  }
}
