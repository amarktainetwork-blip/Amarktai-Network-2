import { executeCapability } from '@/lib/capability-router'
import type { CapabilityResponse } from '@/lib/capability-contracts'
import { createArtifact } from '@/lib/artifact-store'
import { ingestDocument, retrieve } from '@/lib/rag-pipeline'
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { promisify } from 'util'
import type { Browser } from 'playwright'

const execFileAsync = promisify(execFile)

export const RESEARCH_RUNTIME_STATUS = 'PARTIAL' as const

export const FUTURE_RESEARCH_TOOLS = [
  'google',
  'website',
  'youtube',
  'reddit',
  'news',
  'pdf',
  'ocr',
  'browser',
  'social',
] as const

export interface ResearchRequest {
  query: string
  appSlug: string
  depth: 'shallow' | 'deep'
  executionId?: string
}

export interface ResearchRuntime {
  readonly status: typeof RESEARCH_RUNTIME_STATUS
  execute(request: ResearchRequest): Promise<CapabilityResponse>
}

export const researchRuntime: ResearchRuntime = {
  status: RESEARCH_RUNTIME_STATUS,
  async execute(request) {
    const sourceUrl = extractUrl(request.query)
    if (sourceUrl) return executeLiveRagResearch(request, sourceUrl)

    return executeCapability({
      input: `${request.depth === 'deep' ? 'Perform deep research' : 'Research'} and return a structured answer with source notes: ${request.query}`,
      capability: 'research',
      appId: request.appSlug,
      saveArtifact: true,
      metadata: {
        executionId: request.executionId,
        depth: request.depth,
        researchRuntimeStatus: RESEARCH_RUNTIME_STATUS,
      },
    })
  },
}

type ExtractedSource = {
  url: string
  title: string
  content: string
  method: 'trafilatura' | 'playwright' | 'basic_fetch'
}

function extractUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s"'<>]+/i)
  if (!match) return null
  try {
    return new URL(match[0]).toString()
  } catch {
    return null
  }
}

function pythonBinary() {
  return process.env.AMARKTAI_PYTHON_BIN?.trim()
    || process.env.PYTHON_PATH?.trim()
    || (process.platform === 'win32' ? 'python' : 'python3')
}

async function extractWithTrafilatura(url: string): Promise<ExtractedSource | null> {
  const script = [
    'import json, sys',
    'import trafilatura',
    'url = sys.argv[1]',
    'downloaded = trafilatura.fetch_url(url)',
    'if not downloaded:',
    '    raise SystemExit(2)',
    'metadata = trafilatura.extract_metadata(downloaded)',
    'content = trafilatura.extract(downloaded, include_comments=False, include_tables=True) or ""',
    'print(json.dumps({"url": url, "title": getattr(metadata, "title", None) or "", "content": content, "method": "trafilatura"}))',
  ].join('\n')
  try {
    const result = await execFileAsync(pythonBinary(), ['-c', script, url], {
      timeout: 20_000,
      maxBuffer: 2_000_000,
      windowsHide: true,
    })
    const parsed = JSON.parse(String(result.stdout || '{}')) as ExtractedSource
    if (parsed.content?.trim()) return parsed
  } catch {
    // Fallbacks below keep the proof truthful when Trafilatura is unavailable.
  }
  return null
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return htmlToText(match?.[1] ?? '')
}

async function extractWithBasicFetch(url: string): Promise<ExtractedSource | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AmarktAI-RAG-Proof/1.0' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) return null
    const html = await response.text()
    const content = htmlToText(html)
    if (!content) return null
    return {
      url,
      title: htmlTitle(html),
      content,
      method: 'basic_fetch',
    }
  } catch {
    return null
  }
}

async function extractWithPlaywright(url: string): Promise<ExtractedSource | null> {
  let browser: Browser | null = null
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const [title, content] = await Promise.all([
      page.title().catch(() => ''),
      page.locator('body').innerText({ timeout: 8_000 }).catch(() => ''),
    ])
    if (!content.trim()) return null
    return {
      url,
      title,
      content: content.trim(),
      method: 'playwright',
    }
  } catch {
    return null
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

async function extractSource(url: string): Promise<ExtractedSource | null> {
  return await extractWithTrafilatura(url)
    ?? await extractWithBasicFetch(url)
    ?? await extractWithPlaywright(url)
}

function documentIdFor(url: string, content: string) {
  return `research-${createHash('sha256').update(`${url}\n${content.slice(0, 1000)}`).digest('hex').slice(0, 24)}`
}

function failedResearchResponse(request: ResearchRequest, error: string, diagnostics?: Record<string, unknown>): CapabilityResponse {
  return {
    success: false,
    capability: 'research',
    readiness: 'BLOCKED',
    provider: null,
    model: null,
    outputType: 'text',
    output: null,
    fallbackUsed: false,
    error,
    diagnostics: {
      depth: request.depth,
      researchRuntimeStatus: RESEARCH_RUNTIME_STATUS,
      ...(diagnostics ?? {}),
    },
  }
}

async function executeLiveRagResearch(request: ResearchRequest, sourceUrl: string): Promise<CapabilityResponse> {
  if (
    !process.env.DATABASE_URL?.trim()
    && !process.env.QWEN_API_KEY?.trim()
    && !process.env.DASHSCOPE_API_KEY?.trim()
  ) {
    return failedResearchResponse(request, 'No configured provider credential is available for live RAG embeddings; DATABASE_URL or QWEN_API_KEY/DASHSCOPE_API_KEY is required before web_research can be live-proven.', { sourceUrl })
  }

  const source = await extractSource(sourceUrl)
  if (!source?.content.trim()) {
    return failedResearchResponse(request, 'WEB_RESEARCH_EXTRACTION_FAILED: Trafilatura, basic fetch, and Playwright produced no text.', { sourceUrl })
  }

  const documentId = documentIdFor(source.url, source.content)
  const ingest = await ingestDocument({
    id: documentId,
    content: source.content,
    source: source.url,
    namespace: request.appSlug,
    metadata: {
      title: source.title,
      extractionMethod: source.method,
      capability: 'web_research',
      executionId: request.executionId ?? null,
    },
  })
  if (!ingest.success || ingest.vectorIds.length === 0) {
    return failedResearchResponse(request, ingest.error ?? 'RAG_INGEST_FAILED: no vectors were written.', {
      sourceUrl: source.url,
      documentId,
      chunksCreated: ingest.chunksCreated,
      embeddingsGenerated: ingest.embeddingsGenerated,
      vectorIds: ingest.vectorIds,
      qdrantCollection: ingest.collection,
    })
  }

  const retrieved = await retrieve(request.query, request.appSlug, 5)
  if (retrieved.results.length === 0) {
    return failedResearchResponse(request, 'RAG_RETRIEVAL_FAILED: vectors were written but top-k retrieval returned no context.', {
      sourceUrl: source.url,
      documentId,
      vectorIds: ingest.vectorIds,
      qdrantCollection: ingest.collection,
      totalChunksSearched: retrieved.totalChunksSearched,
    })
  }

  const summary = await executeCapability({
    input: `Use the retrieved source context to answer the research request. Cite source notes from the context.\n\nResearch request: ${request.query}\n\nRetrieved context:\n${retrieved.contextWindow}`,
    capability: 'research',
    appId: request.appSlug,
    saveArtifact: false,
    metadata: {
      executionId: request.executionId,
      depth: request.depth,
      researchRuntimeStatus: 'LIVE_RAG',
      sourceUrl: source.url,
      qdrantCollection: ingest.collection,
      vectorIds: ingest.vectorIds,
      retrievedVectorIds: retrieved.results.map((result) => result.vectorId),
    },
  })
  if (!summary.success || !summary.output) {
    return failedResearchResponse(request, summary.error ?? 'RESEARCH_SUMMARY_FAILED: Brain/runtime provider routing did not return a summary.', {
      sourceUrl: source.url,
      documentId,
      vectorIds: ingest.vectorIds,
      providerAttempts: summary.providerAttempts ?? [],
    })
  }

  const report = {
    query: request.query,
    sourceUrl: source.url,
    sourceTitle: source.title,
    extractionMethod: source.method,
    answer: summary.output,
    documentId,
    qdrantCollection: ingest.collection,
    vectorIds: ingest.vectorIds,
    retrieved: retrieved.results.map((result) => ({
      vectorId: result.vectorId,
      documentId: result.documentId,
      source: result.source,
      score: result.score,
      chunkIndex: result.chunkIndex,
    })),
  }
  const artifact = await createArtifact({
    appSlug: request.appSlug,
    executionId: request.executionId,
    type: 'research_result',
    subType: 'rag_research_report',
    title: source.title || `Research: ${source.url}`,
    description: 'Live RAG research report with source metadata and Qdrant vector IDs.',
    provider: summary.provider ?? 'brain-runtime',
    model: summary.model ?? '',
    capability: 'web_research',
    mimeType: 'application/json',
    content: Buffer.from(JSON.stringify(report, null, 2), 'utf8'),
    metadata: {
      depth: request.depth,
      researchRuntimeStatus: 'LIVE_RAG',
      sourceUrl: source.url,
      extractionMethod: source.method,
      documentId,
      qdrantCollection: ingest.collection,
      vectorIds: ingest.vectorIds,
      retrievedVectorIds: retrieved.results.map((result) => result.vectorId),
      chunksCreated: ingest.chunksCreated,
      embeddingsGenerated: ingest.embeddingsGenerated,
      totalChunksSearched: retrieved.totalChunksSearched,
    },
  })

  return {
    ...summary,
    success: true,
    capability: 'research',
    readiness: 'READY',
    outputType: 'text',
    output: summary.output,
    artifactId: artifact.id,
    artifactUrl: artifact.downloadUrl,
    storageUrl: artifact.storageUrl,
    downloadUrl: artifact.downloadUrl,
    status: 'completed',
    diagnostics: {
      ...(summary.diagnostics ?? {}),
      researchRuntimeStatus: 'LIVE_RAG',
      sourceUrl: source.url,
      extractionMethod: source.method,
      documentId,
      qdrantCollection: ingest.collection,
      vectorIds: ingest.vectorIds,
      retrievedVectorIds: retrieved.results.map((result) => result.vectorId),
      artifactId: artifact.id,
    },
  }
}
