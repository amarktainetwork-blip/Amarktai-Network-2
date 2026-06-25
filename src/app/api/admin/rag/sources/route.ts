/**
 * GET /api/admin/rag/sources?appSlug=
 * Returns a list of ingested RAG documents from Qdrant scroll.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'

  try {
    const { QdrantClient } = await import('@qdrant/js-client-rest')
    const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333'
    const client = new QdrantClient({ url: qdrantUrl })
    const collectionName = `rag_${appSlug}`

    let sources: { id: string; title: string; url: string; type: string; chunksCount: number; ingestedAt: string }[] = []
    try {
      const result = await client.scroll(collectionName, { limit: 200, with_payload: true, with_vector: false })
      const seen = new Map<string, { id: string; title: string; url: string; type: string; chunksCount: number; ingestedAt: string }>()
      for (const pt of result.points) {
        const p = pt.payload as Record<string, unknown> | undefined
        if (!p) continue
        const docId = String(p.documentId ?? pt.id)
        if (!seen.has(docId)) {
          seen.set(docId, {
            id: docId,
            title: String(p.title ?? p.documentId ?? docId),
            url: String(p.url ?? p.source ?? ''),
            type: String(p.type ?? 'unknown'),
            chunksCount: 1,
            ingestedAt: String(p.ingestedAt ?? ''),
          })
        } else {
          seen.get(docId)!.chunksCount++
        }
      }
      sources = Array.from(seen.values())
    } catch {
      // collection may not exist yet
    }

    return NextResponse.json({ sources, appSlug })
  } catch (e) {
    return NextResponse.json({ sources: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}
