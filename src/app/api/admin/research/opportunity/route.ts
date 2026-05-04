/**
 * POST /api/admin/research/opportunity
 *
 * Save a differentiated product opportunity derived from research.
 * Stores as an Artifact (type=document, subType=research_opportunity).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'

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

    return NextResponse.json({ success: true, artifact })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save opportunity' }, { status: 500 })
  }
}
