import { execFile } from 'child_process'
import path from 'path'
import { promisify } from 'util'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'

const execFileAsync = promisify(execFile)
type CrawlResult = { url: string; title: string; content: string; method: string }

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as {
    url?: string
    appSlug?: string
    notes?: string
    tags?: string[]
    capability?: string
    provider?: string
    model?: string
    endpoint?: string
  }
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
  const ignoredProviderPreference = typeof body.provider === 'string' ? body.provider : null
  const ignoredModelPreference = typeof body.model === 'string' ? body.model : null
  const ignoredEndpointPreference = typeof body.endpoint === 'string' ? body.endpoint : null
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
  try {
    const artifact = await createArtifact({
      appSlug: body.appSlug || 'research-engine',
      type: 'research_result',
      subType: 'research_source',
      capability: 'scrape_website',
      title: crawl.title,
      description: `Local research source: ${parsed.toString()}`,
      provider: 'local-crawler',
      content,
      metadata: {
        sourceUrl: parsed.toString(),
        method: crawl.method,
        tags: body.tags || [],
        notes: body.notes || '',
        warning,
        ignoredProviderPreference,
        ignoredModelPreference,
        ignoredEndpointPreference,
      },
    })
    return NextResponse.json({
      success: true,
      capability: 'scrape_website',
      artifact,
      artifactId: artifact.id,
      artifactUrl: artifact.downloadUrl,
      crawl,
      warning: warning || null,
      ignoredProviderPreference,
      ignoredModelPreference,
      ignoredEndpointPreference,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      capability: 'scrape_website',
      error: `Research completed but artifact persistence failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      ignoredProviderPreference,
      ignoredModelPreference,
      ignoredEndpointPreference,
    }, { status: 503 })
  }
}
