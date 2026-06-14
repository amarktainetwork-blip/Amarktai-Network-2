import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVaultApiKey } from '@/lib/brain'

const RequestSchema = z.object({
  query: z.string().min(1).max(2048),
  documents: z.array(z.string().min(1).max(4096)).min(1).max(100),
  maxResults: z.number().int().min(1).max(100).optional(),
  model: z.string().optional(),
  provider: z.enum(['huggingface', 'auto']).optional().default('auto'),
})

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const key = await getVaultApiKey('huggingface')
  if (!key) {
    return NextResponse.json({ capability: 'reranking', executed: false, error: 'Hugging Face reranking is not configured.' }, { status: 503 })
  }

  const { query, documents, maxResults } = parsed.data
  const model = parsed.data.model ?? 'cross-encoder/ms-marco-MiniLM-L-6-v2'
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: documents.map(document => [query, document]) }),
  })
  if (!response.ok) {
    return NextResponse.json({ capability: 'reranking', executed: false, error: `Hugging Face reranking failed (${response.status}).` }, { status: 502 })
  }

  const raw = await response.json() as unknown[]
  const ranked = documents
    .map((document, index) => ({
      document,
      originalIndex: index,
      score: typeof raw[index] === 'number' ? raw[index] as number : Number((raw[index] as { score?: number })?.score ?? 0),
    }))
    .sort((left, right) => right.score - left.score)
  return NextResponse.json({
    capability: 'reranking',
    executed: true,
    query,
    ranked: maxResults ? ranked.slice(0, maxResults) : ranked,
    provider: 'huggingface',
    model,
  })
}
