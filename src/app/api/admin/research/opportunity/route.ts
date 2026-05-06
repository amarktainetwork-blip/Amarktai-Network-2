/**
 * POST /api/admin/research/opportunity
 *
 * Save a differentiated product opportunity derived from research.
 * Stores as an Artifact (type=document, subType=research_opportunity).
 * Falls back to local VPS store if artifact-store unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { appendRecord, LOCAL_STORE_FILES } from '@/lib/local-json-store'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { appSlug, title, description, sourceArtifactIds, productPlan, tags } = body as {
      appSlug?: string
      title?: string
      description?: string
      sourceArtifactIds?: string[]
      productPlan?: string
      tags?: string[]
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Try artifact-store first
    try {
      const artifact = await createArtifact({
        appSlug: appSlug ?? 'admin',
        type: 'document',
        subType: 'research_opportunity',
        title,
        description: description ?? '',
        provider: 'manual',
        model: '',
        content: productPlan ?? description ?? '',
        metadata: {
          sourceArtifactIds: sourceArtifactIds ?? [],
          tags: tags ?? [],
          createdAt: new Date().toISOString(),
        },
      })
      return NextResponse.json({ success: true, artifact, driver: 'db' })
    } catch { /* Fall through to local */ }

    // Local VPS fallback
    const localOpportunity = appendRecord(LOCAL_STORE_FILES.research, {
      url: '',
      appSlug: appSlug ?? 'admin',
      title,
      notes: description ?? '',
      tags: tags ?? [],
      scrapedMethod: 'manual',
      firecrawlAvailable: false,
      content: productPlan ?? description ?? '',
      status: 'completed',
      subType: 'research_opportunity',
      sourceArtifactIds: sourceArtifactIds ?? [],
      createdAt: new Date().toISOString(),
      driver: 'local_vps',
    })
    return NextResponse.json({ success: true, opportunity: localOpportunity, driver: 'local_vps' })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save opportunity' }, { status: 500 })
  }
}
