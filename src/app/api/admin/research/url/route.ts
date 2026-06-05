import { execFile } from 'child_process'
import path from 'path'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { appendRecord, checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

const execFileAsync = promisify(execFile)
type CrawlResult = { url: string; title: string; content: string; method: string }

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { url?: string; appSlug?: string; notes?: string; tags?: string[] }
  if (!body.url?.trim()) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(body.url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
  } catch {
    return NextResponse.json({ error: 'A valid HTTP or HTTPS URL is required' }, { status: 400 })
  }

  let crawl: CrawlResult | null = null
  let warning = ''
  const script = path.join(process.cwd(), 'services', 'crawler', 'crawl.py')
  for (const python of ['python', 'python3']) {
    try {
      const result = await execFileAsync(python, [script, parsed.toString()], { timeout: 45_000, windowsHide: true, maxBuffer: 5_000_000 })
      crawl = JSON.parse(result.stdout) as CrawlResult
      break
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Local crawler failed'
    }
  }

  if (!crawl) {
    try {
      const response = await fetch(parsed, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'AmarktaiNetworkCrawler/1.0' } })
      const html = await response.text()
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || parsed.hostname
      const content = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100_000)
      crawl = { url: parsed.toString(), title, content, method: 'local-fetch-fallback' }
      warning = 'Playwright/Trafilatura unavailable; used local fetch extraction.'
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Local crawl failed' }, { status: 502 })
    }
  }

  const content = crawl.content || body.notes || ''
  let artifact = null
  try {
    artifact = await createArtifact({
      appSlug: body.appSlug || 'research-engine',
      type: 'document',
      subType: 'research_source',
      title: crawl.title,
      description: `Local research source: ${parsed.toString()}`,
      provider: 'local-crawler',
      content,
      metadata: { sourceUrl: parsed.toString(), method: crawl.method, tags: body.tags || [], notes: body.notes || '', warning },
    })
  } catch {
    if (checkWritable(LOCAL_STORE_FILES.research).writable) {
      appendRecord(LOCAL_STORE_FILES.research, {
        url: parsed.toString(), appSlug: body.appSlug || 'research-engine', title: crawl.title,
        notes: body.notes || '', tags: body.tags || [], scrapedMethod: crawl.method,
        content, status: 'completed', createdAt: new Date().toISOString(), warning,
      })
    }
  }
  return NextResponse.json({ success: true, artifact, crawl, warning: warning || null })
}
