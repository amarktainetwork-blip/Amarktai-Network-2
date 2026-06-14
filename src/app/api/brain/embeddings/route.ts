import { NextRequest, NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { input?: string | string[] } | null
  if (!body?.input || (typeof body.input !== 'string' && !Array.isArray(body.input))) {
    return NextResponse.json({ error: 'input is required and must be a string or array of strings' }, { status: 400 })
  }

  const key = await getVaultApiKey('qwen')
  if (key) {
    const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-v3', input: body.input, encoding_format: 'float' }),
    })
    if (response.ok) {
      const data = await response.json() as { data?: Array<{ embedding?: number[] }>; usage?: unknown }
      const embeddings = data.data?.map(item => item.embedding ?? []) ?? []
      return NextResponse.json({
        executed: true,
        embeddings,
        provider: 'qwen',
        model: 'text-embedding-v3',
        dimensions: embeddings[0]?.length ?? 0,
        usage: data.usage,
        capability: 'embeddings',
      })
    }
  }

  return NextResponse.json(
    { executed: false, error: 'Qwen embeddings are not configured or unavailable.', providers_checked: ['qwen'], capability: 'embeddings' },
    { status: 503 },
  )
}
