/**
 * GET /api/admin/research/jobs
 *
 * List research artifacts (scraped pages and manual research sources).
 * Returns artifacts with type=document and subType=research_source.
 * Also includes local VPS research jobs when DB/artifact-store unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listArtifacts } from '@/lib/artifact-store'
import { getServiceKey } from '@/lib/service-vault'
import { listRecords, checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

interface LocalResearchJob {
  id: string
  url: string
  appSlug: string
  title: string
  notes: string
  tags: string[]
  scrapedMethod: string
  firecrawlAvailable: boolean
  content: string
  status: string
  createdAt: string
  artifactId?: string
  subType?: string
  warning?: string
  driver?: string
}

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

    const firecrawlKey = await getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')
    const localCheck = checkWritable(LOCAL_STORE_FILES.research)

    // Load local research jobs
    const localJobs = listRecords<LocalResearchJob>(LOCAL_STORE_FILES.research).filter(
      (j) => !appSlug || j.appSlug === appSlug,
    )

    // Try DB/artifact-store
    let dbJobs: typeof localJobs = []
    try {
      const result = await listArtifacts({
        appSlug,
        type: 'document' as const,
        limit,
        offset,
      })
      // Filter to research sources only
      dbJobs = result.artifacts
        .filter((a) => a.subType === 'research_source' || a.subType === 'research_opportunity')
        .map((a) => ({
          id: a.id,
          url: (a.metadata?.sourceUrl as string) ?? '',
          appSlug: a.appSlug,
          title: a.title,
          notes: (a.metadata?.notes as string) ?? '',
          tags: (a.metadata?.tags as string[]) ?? [],
          scrapedMethod: (a.metadata?.scrapedMethod as string) ?? 'manual',
          firecrawlAvailable: !!firecrawlKey,
          content: '',
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          subType: a.subType,
          driver: 'db',
        }))
    } catch { /* ignore — use local only */ }

    // Merge: local jobs that don't have a matching DB artifact
    const allJobs = [...dbJobs, ...localJobs.map((j) => ({ ...j, driver: j.driver ?? 'local_vps' }))]

    return NextResponse.json({
      jobs: allJobs,
      total: allJobs.length,
      firecrawlAvailable: !!firecrawlKey,
      storageReady: localCheck.writable,
      driver: dbJobs.length > 0 ? 'db+local' : 'local_vps',
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to list research jobs' }, { status: 500 })
  }
}
