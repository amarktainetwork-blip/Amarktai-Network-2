import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getProviderKey } from '@/lib/provider-config'
import { getVaultApiKey } from '@/lib/brain'
import {
  discoverProvider,
  resolveProviderEndpoint,
} from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
import { getProviderTruth } from '@/lib/providers/registry'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { apiKey?: unknown }
  const inlineKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const key = inlineKey || await getProviderKey('qwen') || await getVaultApiKey('qwen') || ''
  if (!key) {
    return NextResponse.json({
      success: false,
      error: 'No Qwen/DashScope API key configured',
      proofType: 'chat_route_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      nextAction: 'Add QWEN_API_KEY or DASHSCOPE_API_KEY in Settings',
    })
  }

  const start = Date.now()
  try {
    const discovery = await discoverProvider('qwen', {
      force: true,
      credential: key,
      keySource: inlineKey ? 'inline' : 'stored',
    })
    const chatModel = modelsForCapability(discovery, 'chat')[0]
    if (!chatModel) {
      return NextResponse.json({
        success: false,
        error: discovery.error || 'Qwen catalog returned no chat-capable model.',
        latencyMs: Date.now() - start,
        proofType: 'chat_route_probe',
        proofKind: 'catalog_discovery_test',
        capabilityExecutionProven: false,
        nextAction: 'Verify the DashScope International catalog and account access.',
      })
    }
    const endpoint = resolveProviderEndpoint(getProviderTruth('qwen')!, 'compatible_mode')
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatModel.id,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 4,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const latencyMs = Date.now() - start
    if (!response.ok) {
      const error = response.status === 401 || response.status === 403
        ? 'API key invalid or expired'
        : `Qwen API returned HTTP ${response.status}`
      return NextResponse.json({
        success: false,
        error,
        latencyMs,
        model: chatModel.id,
        proofType: 'chat_route_probe',
        proofKind: 'catalog_discovery_test',
        capabilityExecutionProven: false,
        nextAction: 'Check the Qwen API key and model access in Settings',
      })
    }
    return NextResponse.json({
      success: true,
      latencyMs,
      model: chatModel.id,
      modelCount: discovery.models.length,
      capabilityEvidence: chatModel.capabilityEvidence,
      proofType: 'chat_route_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      detail: 'Qwen catalog plus direct chat probe passed. Image, video/Wanx, image-to-video, embeddings, and translation still require their own Brain/runtime route proof.',
      nextAction: 'Run the specific Brain/runtime route for the Qwen capability you want to mark ready.',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      latencyMs: Date.now() - start,
      proofType: 'chat_route_probe',
      proofKind: 'catalog_discovery_test',
      capabilityExecutionProven: false,
      nextAction: 'Check network connectivity and the Qwen API key',
    })
  }
}
