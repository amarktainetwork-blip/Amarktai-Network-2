/**
 * POST /api/admin/research/opportunity
 *
 * Save a differentiated product opportunity derived from research.
 * Stores as a canonical research artifact.
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

    try {
      const artifact = await createArtifact({
        appSlug: appSlug ?? 'admin',
        type: 'research_result',
        subType: 'research_opportunity',
        capability: 'research',
        title,
        description: description ?? '',
        provider: 'manual',
        model: '',
        mimeType: 'application/json',
        content: Buffer.from(JSON.stringify({
          title,
          description: description ?? '',
          productPlan: productPlan ?? '',
          sourceArtifactIds: sourceArtifactIds ?? [],
          tags: tags ?? [],
        }, null, 2)),
        metadata: {
          sourceArtifactIds: sourceArtifactIds ?? [],
          tags: tags ?? [],
          createdAt: new Date().toISOString(),
        },
      })
      return NextResponse.json({ success: true, artifact, driver: 'db' })
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Research opportunity could not be persisted as an artifact: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      }, { status: 503 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save opportunity' }, { status: 500 })
  }
}
