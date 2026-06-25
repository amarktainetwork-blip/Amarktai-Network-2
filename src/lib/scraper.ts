/**
 * @module scraper
 * @description In-house web scraper — replaces Firecrawl dependency.
 *
 * Features:
 * - Fetches webpage HTML with timeout
 * - Extracts title, description, headings, main text, links
 * - Strips scripts/styles/nav/footer noise
 * - Follows same-domain links up to configured depth/page limit
 * - Deduplicates URLs
 * - Rejects unsafe private/local/internal IP URLs
 * - Respects maxPages, maxDepth, maxBytes, timeoutMs limits
 * - No external paid API dependency
 *
 * Server-side only.
 */

// ── Safety limits ─────────────────────────────────────────────────────────────

export interface ScraperConfig {
  maxPages?: number
  maxDepth?: number
  maxBytes?: number
  timeoutMs?: number
  followLinks?: boolean
  /** Allow private/local IPs (only for internal dev tools) */
  allowPrivateUrls?: boolean
  /** User-agent string */
  userAgent?: string
}

const SCRAPER_DEFAULTS: Required<ScraperConfig> = {
  maxPages: 10,
  maxDepth: 2,
  maxBytes: 2 * 1024 * 1024, // 2MB per page
  timeoutMs: 15_000,
  followLinks: true,
  allowPrivateUrls: false,
  userAgent: 'AmarktAI-Scraper/1.0 (+https://amarktai.com)',
}

// Private/internal IP patterns — blocked by default
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return PRIVATE_HOST_PATTERNS.some(p => p.test(hostname))
  } catch {
    return true // malformed URL = unsafe
  }
}

export function normalizeUrl(base: string, href: string): string | null {
  try {
    const resolved = new URL(href, base)
    // Strip fragment and normalise
    resolved.hash = ''
    // Only http/https
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null
    return resolved.href
  } catch {
    return null
  }
}

export function isSameDomain(base: string, url: string): boolean {
  try {
    return new URL(base).hostname === new URL(url).hostname
  } catch {
    return false
  }
}

// ── HTML extraction ───────────────────────────────────────────────────────────

export interface ExtractedPage {
  url: string
  title: string
  description: string
  headings: string[]
  bodyText: string
  links: string[]
  byteSize: number
  error?: string
}

/**
 * Strip noisy HTML tags and extract readable text.
 * Does not require a DOM — uses regex for server-side compatibility.
 */
export function extractFromHtml(html: string, pageUrl: string): Omit<ExtractedPage, 'url' | 'byteSize' | 'error'> {
  // Remove script/style/nav/footer/header/aside blocks
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : ''

  // Extract meta description
  const descMatch = cleaned.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
    ?? cleaned.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description/i)
  const description = descMatch ? descMatch[1].trim() : ''

  // Extract headings
  const headingMatches = [...cleaned.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
  const headings = headingMatches
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(h => h.length > 0)
    .slice(0, 20)

  // Extract links
  const linkMatches = [...cleaned.matchAll(/href=["']([^"'#][^"']*)/gi)]
  const links: string[] = []
  for (const m of linkMatches) {
    const normalized = normalizeUrl(pageUrl, m[1])
    if (normalized && !links.includes(normalized)) links.push(normalized)
  }

  // Extract body text — strip all remaining tags
  const bodyText = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')
    .trim()
    .slice(0, 10_000) // cap at 10K chars per page

  return { title, description, headings, bodyText, links }
}

// ── Single page fetch ─────────────────────────────────────────────────────────

export async function fetchPage(url: string, config: Required<ScraperConfig>): Promise<ExtractedPage> {
  const empty = (error: string): ExtractedPage => ({
    url, title: '', description: '', headings: [], bodyText: '', links: [], byteSize: 0, error,
  })

  if (!config.allowPrivateUrls && isPrivateUrl(url)) {
    return empty(`Blocked: private/internal URL not allowed: ${url}`)
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    })

    if (!res.ok) {
      return empty(`HTTP ${res.status}: ${url}`)
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return empty(`Skipped non-HTML content-type: ${contentType}`)
    }

    // Read with byte limit
    const reader = res.body?.getReader()
    if (!reader) return empty('No response body')

    let totalBytes = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.length
      if (totalBytes > config.maxBytes) {
        reader.cancel()
        break
      }
      chunks.push(value)
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => { const out = new Uint8Array(acc.length + c.length); out.set(acc); out.set(c, acc.length); return out }, new Uint8Array(0))
    )

    const extracted = extractFromHtml(html, url)
    return { ...extracted, url, byteSize: totalBytes }
  } catch (err) {
    return empty(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Crawl result ──────────────────────────────────────────────────────────────

export interface CrawlResult {
  success: boolean
  pages: ExtractedPage[]
  totalPages: number
  errors: string[]
  summary: string
  detectedNiche: string
  detectedFeatures: string[]
  aiCapabilitiesNeeded: string[]
  error?: string
}

/**
 * Crawl a website starting from a seed URL.
 * In-house implementation — no external API dependency.
 */
export async function crawlWebsite(seedUrl: string, config: ScraperConfig = {}): Promise<CrawlResult> {
  const cfg: Required<ScraperConfig> = { ...SCRAPER_DEFAULTS, ...config }

  const empty = (error: string): CrawlResult => ({
    success: false, pages: [], totalPages: 0, errors: [error],
    summary: '', detectedNiche: '', detectedFeatures: [], aiCapabilitiesNeeded: [], error,
  })

  // Validate seed URL
  if (!config.allowPrivateUrls && isPrivateUrl(seedUrl)) {
    return empty(`Blocked: private/internal URL not allowed: ${seedUrl}`)
  }
  try { new URL(seedUrl) } catch { return empty(`Invalid URL: ${seedUrl}`) }

  const visited = new Set<string>()
  const queue: Array<{ url: string; depth: number }> = [{ url: seedUrl, depth: 0 }]
  const pages: ExtractedPage[] = []
  const errors: string[] = []

  while (queue.length > 0 && pages.length < cfg.maxPages) {
    const item = queue.shift()!
    const { url, depth } = item

    if (visited.has(url)) continue
    visited.add(url)

    const page = await fetchPage(url, cfg)
    if (page.error) {
      errors.push(page.error)
      continue
    }

    pages.push(page)

    // Follow same-domain links if within depth limit
    if (cfg.followLinks && depth < cfg.maxDepth) {
      for (const link of page.links) {
        if (!visited.has(link) && isSameDomain(seedUrl, link)) {
          queue.push({ url: link, depth: depth + 1 })
        }
      }
    }
  }

  if (pages.length === 0) {
    return empty('No pages successfully crawled')
  }

  const allText = pages.map(p => `${p.title}\n${p.description}\n${p.headings.join(' ')}\n${p.bodyText}`).join('\n\n')
  const summary = buildSummary(pages, allText)
  const niche = detectNiche(allText)
  const features = detectFeatures(allText)
  const aiCaps = detectAiCapabilities(allText)

  return {
    success: true,
    pages,
    totalPages: pages.length,
    errors,
    summary,
    detectedNiche: niche,
    detectedFeatures: features,
    aiCapabilitiesNeeded: aiCaps,
  }
}

function buildSummary(pages: ExtractedPage[], allText: string): string {
  const titles = pages.map(p => p.title).filter(Boolean).join(', ')
  return `Crawled ${pages.length} page(s). Titles: ${titles.slice(0, 200)}. Content length: ${allText.length} chars.`
}

function detectNiche(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('ecommerce') || t.includes('shop') || t.includes('buy') || t.includes('cart')) return 'ecommerce'
  if (t.includes('saas') || t.includes('software') || t.includes('platform') || t.includes('api')) return 'saas'
  if (t.includes('blog') || t.includes('article') || t.includes('news') || t.includes('post')) return 'content'
  if (t.includes('restaurant') || t.includes('menu') || t.includes('food')) return 'hospitality'
  if (t.includes('doctor') || t.includes('health') || t.includes('medical') || t.includes('clinic')) return 'healthcare'
  return 'general'
}

function detectFeatures(text: string): string[] {
  const t = text.toLowerCase()
  const features: string[] = []
  if (t.includes('login') || t.includes('sign in') || t.includes('account')) features.push('authentication')
  if (t.includes('checkout') || t.includes('payment') || t.includes('pricing')) features.push('commerce')
  if (t.includes('contact') || t.includes('support') || t.includes('help')) features.push('support')
  if (t.includes('blog') || t.includes('news') || t.includes('articles')) features.push('content')
  if (t.includes('search')) features.push('search')
  return features
}

function detectAiCapabilities(text: string): string[] {
  const t = text.toLowerCase()
  const caps: string[] = []
  if (t.includes('chat') || t.includes('assistant') || t.includes('bot')) caps.push('chat')
  if (t.includes('image') || t.includes('photo') || t.includes('gallery')) caps.push('image_generation')
  if (t.includes('search') || t.includes('find')) caps.push('research')
  if (t.includes('summarize') || t.includes('analyse') || t.includes('analyze')) caps.push('file_analysis')
  return caps
}
