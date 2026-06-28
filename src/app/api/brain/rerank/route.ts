import { NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'
import { z } from 'zod'

const ALLOWED_HF_RERANK_MODELS = [
  'cross-encoder/ms-marco-MiniLM-L-6-v2',
  'BAAI/bge-reranker-base',
  'BAAI/bge-reranker-large',
] as const
const ALLOWED_TOGETHER_RERANK_MODELS = [
  'Salesforce/Llama-Rank-V1',
  'BAAI/bge-reranker-base',
] as const

const RequestSchema = z.object({
  query: z.string().min(1).max(2048),
  documents: z.array(z.string().min(1).max(4096)).min(1).max(100),
  maxResults: z.number().int().min(1).max(100).optional(),
  model: z.string().optional(),
  provider: z.enum(['huggingface', 'together', 'auto']).optional().default('auto'),
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

async function rerankWithTogether(
  query: string,
  documents: string[],
  apiKey: string,
  modelId: string,
  maxResults?: number,
): Promise<Array<{ score: number; index: number }>> {
  const safeModel = ALLOWED_TOGETHER_RERANK_MODELS.find((m) => m === modelId)
    ?? ALLOWED_TOGETHER_RERANK_MODELS[0]

  const response = await fetch('https://api.together.xyz/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: safeModel,
      query,
      documents,
      top_n: maxResults ?? documents.length,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Together reranking failed (${response.status}): ${errText}`)
  }

  const data = await response.json() as {
    results?: Array<{ index?: number; relevance_score?: number; score?: number }>
  }
  if (!Array.isArray(data.results)) throw new Error('Unexpected Together response format for reranking')

  return data.results.map((item, fallbackIndex) => ({
    index: typeof item.index === 'number' ? item.index : fallbackIndex,
    score: typeof item.relevance_score === 'number'
      ? item.relevance_score
      : item.score ?? 0,
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

  const { query, documents, maxResults, model, provider } = parsed.data

  if (provider === 'together' || provider === 'auto') {
    const togetherApiKey = await getVaultApiKey('together')
    if (togetherApiKey) {
      const togetherModel = model && ALLOWED_TOGETHER_RERANK_MODELS.includes(model as typeof ALLOWED_TOGETHER_RERANK_MODELS[number])
        ? model
        : ALLOWED_TOGETHER_RERANK_MODELS[0]
      try {
        const scores = await rerankWithTogether(query, documents, togetherApiKey, togetherModel, maxResults)
        const ranked = scores
          .map((score) => ({
            document: documents[score.index] ?? '',
            score: score.score,
            originalIndex: score.index,
          }))
          .filter((entry) => entry.document)
          .sort((a, b) => b.score - a.score)

        return NextResponse.json({
          capability: 'reranking',
          executed: true,
          query,
          ranked: maxResults ? ranked.slice(0, maxResults) : ranked,
          provider: 'together',
          model: togetherModel,
          latencyMs: Date.now() - startTime,
        })
      } catch (error) {
        if (provider === 'together') {
          return NextResponse.json({
            capability: 'reranking',
            executed: false,
            error: error instanceof Error ? error.message : 'Together reranking failed',
            query,
          }, { status: 503 })
        }
      }
    } else if (provider === 'together') {
      return NextResponse.json({
        capability: 'reranking',
        executed: false,
        error: 'No Together reranking provider available. Configure Together.',
        query,
      }, { status: 503 })
    }
  }

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
