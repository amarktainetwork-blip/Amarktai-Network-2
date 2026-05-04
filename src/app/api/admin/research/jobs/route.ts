/**
 * GET /api/admin/research/jobs
 *
 * List research artifacts (scraped pages and manual research sources).
 * Returns artifacts with type=document and subType=research_source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listArtifacts } from '@/lib/artifact-store'
import { getServiceKey } from '@/lib/service-vault'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const appSlug = searchParams.get('appSlug') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)
    const offset = Number(searchParams.get('offset') ?? '0')

    const result = await listArtifacts({
      appSlug,
      type: 'document' as const,
      limit,
      offset,
    })

    // Filter to research sources only
    const jobs = result.artifacts.filter(
      (a) => a.subType === 'research_source' || a.subType === 'research_opportunity',
    )

    const firecrawlKey = await getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')

    return NextResponse.json({
      jobs,
      total: jobs.length,
      firecrawlAvailable: !!firecrawlKey,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list research jobs' }, { status: 500 })
  }
}
