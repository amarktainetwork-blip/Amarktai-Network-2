/**
 * POST /api/admin/rag/ingest
 * Ingest a URL or document into the RAG knowledge base.
 * Calls ingestWebsite from rag-capability.ts — no direct provider calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { ingestWebsite } from '@/lib/rag-capability'
import { getProviderKeyWithSource } from '@/lib/provider-config'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const url = body.url as string | undefined
  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const scope = (body.scope as string) ?? 'app'

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const hfKey = await getProviderKeyWithSource('huggingface')
  if (!hfKey.key) {
    return NextResponse.json({ error: 'HuggingFace API key not configured. Configure it in Settings to enable RAG ingestion.' }, { status: 503 })
  }

  try {
    const results = await ingestWebsite(url, {
      appSlug,
      scope: scope as Parameters<typeof ingestWebsite>[1]['scope'],
      hfApiKey: hfKey.key,
      maxPages: 5,
    })
    return NextResponse.json({ results, ingested: results.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ingestion failed' }, { status: 500 })
  }
}
