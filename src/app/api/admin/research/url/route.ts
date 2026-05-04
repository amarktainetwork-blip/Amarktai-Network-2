/**
 * POST /api/admin/research/url
 *
 * Scrape or manually record a URL as a research source.
 * Uses Firecrawl if key is available; falls back to recording manual notes.
 * Saves result as an Artifact (type=document, subType=research_source).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { getServiceKey } from '@/lib/service-vault'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { url, appSlug, notes, tags } = body as {
      url?: string
      appSlug?: string
      notes?: string
      tags?: string[]
    }

    if (!url?.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    let scraped: { title?: string; content?: string; error?: string; method: string } = {
      method: 'manual',
    }

    // Attempt Firecrawl scrape if key is available
    const firecrawlKey = await getServiceKey('firecrawl', 'FIRECRAWL_API_KEY')
    if (firecrawlKey) {
      try {
        const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
          signal: AbortSignal.timeout(30_000),
        })
        if (fcRes.ok) {
          const fcData = await fcRes.json() as { data?: { metadata?: { title?: string }; markdown?: string } }
          scraped = {
            method: 'firecrawl',
            title: fcData.data?.metadata?.title ?? url,
            content: fcData.data?.markdown ?? '',
          }
        } else {
          scraped.error = `Firecrawl returned ${fcRes.status}`
        }
      } catch (e) {
        scraped.error = e instanceof Error ? e.message : 'Firecrawl request failed'
      }
    }

    const title = scraped.title ?? url
    const content = scraped.content ?? notes ?? ''

    let artifact: Awaited<ReturnType<typeof createArtifact>> | null = null
    let storageError: string | null = null
    try {
      artifact = await createArtifact({
        appSlug: appSlug ?? 'admin',
        type: 'document',
        subType: 'research_source',
        title,
        description: `Researched URL: ${url}${scraped.error ? ` — Firecrawl error: ${scraped.error}` : ''}`,
        provider: scraped.method === 'firecrawl' ? 'firecrawl' : 'manual',
        model: '',
        content,
        metadata: {
          sourceUrl: url,
          scrapedMethod: scraped.method,
          tags: tags ?? [],
          notes: notes ?? '',
          scrapedAt: new Date().toISOString(),
        },
      })
    } catch (e) {
      storageError = e instanceof Error ? e.message : 'Artifact storage not ready'
    }

    return NextResponse.json({
      success: true,
      artifact,
      scrapedMethod: scraped.method,
      firecrawlAvailable: !!firecrawlKey,
      warning: scraped.error ?? storageError ?? null,
      storageReady: !storageError,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to research URL' }, { status: 500 })
  }
}
