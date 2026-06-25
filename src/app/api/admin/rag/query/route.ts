/**
 * POST /api/admin/rag/query
 * Query the RAG knowledge base.
 * Calls queryRAG from rag-capability.ts — no direct provider calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { queryRAG } from '@/lib/rag-capability'
import { getProviderKeyWithSource } from '@/lib/provider-config'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const query = body.query as string | undefined
  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const scope = (body.scope as string) ?? 'app'
  const limit = typeof body.limit === 'number' ? body.limit : 5

  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })

  const hfKey = await getProviderKeyWithSource('huggingface')
  if (!hfKey.key) {
    return NextResponse.json({ error: 'HuggingFace API key not configured. Configure it in Settings to enable RAG queries.' }, { status: 503 })
  }

  try {
    const result = await queryRAG(query, {
      appSlug,
      scope: scope as Parameters<typeof queryRAG>[1]['scope'],
      hfApiKey: hfKey.key,
      limit,
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Query failed' }, { status: 500 })
  }
}
