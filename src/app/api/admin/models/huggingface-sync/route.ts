import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { syncHuggingFaceCatalog } from '@/lib/huggingface-catalog-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const tasks = Array.isArray(body.tasks)
    ? body.tasks.filter((task): task is string => typeof task === 'string')
    : undefined
  const report = await syncHuggingFaceCatalog({
    tasks,
    limitPerTask: typeof body.limitPerTask === 'number' ? body.limitPerTask : undefined,
    includeAdultCandidates: body.includeAdultCandidates === true,
  })
  return NextResponse.json(report, {
    status: report.results.some((result) => result.error) ? 207 : 200,
  })
}
