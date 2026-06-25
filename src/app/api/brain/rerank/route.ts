import { NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'
import { z } from 'zod'

const ALLOWED_HF_RERANK_MODELS = [
  'cross-encoder/ms-marco-MiniLM-L-6-v2',
  'BAAI/bge-reranker-base',
  'BAAI/bge-reranker-large',
] as const

const RequestSchema = z.object({
  query: z.string().min(1).max(2048),
  documents: z.array(z.string().min(1).max(4096)).min(1).max(100),
  maxResults: z.number().int().min(1).max(100).optional(),
  model: z.string().optional(),
  provider: z.enum(['huggingface', 'auto']).optional().default('auto'),
})

async function rerankWithHuggingFace(
  query: string,
  documents: string[],
  apiKey: string,
  modelId: string,
): Promise<Array<{ score: number }>> {
  const safeModel = ALLOWED_HF_RERANK_MODELS.find((m) => m === modelId)
    ?? ALLOWED_HF_RERANK_MODELS[0]

  const response = await fetch(`https://api-inference.huggingface.co/models/${safeModel}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: documents.map((doc) => [query, doc]) }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`HuggingFace reranking failed (${response.status}): ${errText}`)
  }

  const data = await response.json() as unknown
  if (!Array.isArray(data)) throw new Error('Unexpected HuggingFace response format for reranking')

  return data.map((item) => ({
    score: typeof item === 'number' ? item : (item as Record<string, number>).score ?? 0,
  }))
}

export async function POST(req: Request): Promise<NextResponse> {
  const startTime = Date.now()
  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { query, documents, maxResults, model } = parsed.data
  const apiKey = await getVaultApiKey('huggingface')
  if (!apiKey) {
    return NextResponse.json({
      capability: 'reranking',
      executed: false,
      error: 'No reranking provider available. Configure HuggingFace.',
      query,
    }, { status: 503 })
  }

  const hfModel = model && ALLOWED_HF_RERANK_MODELS.includes(model as typeof ALLOWED_HF_RERANK_MODELS[number])
    ? model
    : ALLOWED_HF_RERANK_MODELS[0]

  let scores: Array<{ score: number }>
  try {
    scores = await rerankWithHuggingFace(query, documents, apiKey, hfModel)
  } catch (error) {
    return NextResponse.json({
      capability: 'reranking',
      executed: false,
      error: error instanceof Error ? error.message : 'Reranking failed',
      query,
    }, { status: 503 })
  }

  const ranked = documents
    .map((document, index) => ({
      document,
      score: scores[index]?.score ?? 0,
      originalIndex: index,
    }))
    .sort((a, b) => b.score - a.score)

  return NextResponse.json({
    capability: 'reranking',
    executed: true,
    query,
    ranked: maxResults ? ranked.slice(0, maxResults) : ranked,
    provider: 'huggingface',
    model: hfModel,
    latencyMs: Date.now() - startTime,
  })
}
