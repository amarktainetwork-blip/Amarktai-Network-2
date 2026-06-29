/**
 * Platform Library Registry
 *
 * Tracks the status of platform libraries: planned, installed, wired, proven, or blocked.
 * Status is determined from package.json and real code evidence only.
 * Do not mark a library as installed unless it appears in package.json.
 * Do not mark wired/proven without code evidence.
 */

export type LibraryStatus = 'planned' | 'installed' | 'wired' | 'proven' | 'blocked'

export interface PlatformLibrary {
  id: string
  name: string
  purpose: string
  status: LibraryStatus
  usedByCapabilities: string[]
  installedPackageName?: string
  nextAction: string
  evidence: string
}

// Packages confirmed in package.json (checked at write time):
// - @qdrant/js-client-rest: ^1.17.0
// - bullmq: ^5.73.0
// - playwright: ^1.60.0
// All others: not in package.json

export const PLATFORM_LIBRARIES: readonly PlatformLibrary[] = [
  {
    id: 'crawlee',
    name: 'Crawlee',
    purpose: 'Advanced web crawling with anti-bot evasion and Playwright integration',
    status: 'planned',
    usedByCapabilities: ['website_scraping', 'research'],
    installedPackageName: 'crawlee',
    nextAction: 'Add crawlee to package.json and wire to /api/brain/research and scraper lib',
    evidence: 'Not in package.json',
  },
  {
    id: 'docling',
    name: 'Docling',
    purpose: 'Document ingestion and parsing (PDF, Word, HTML to structured text)',
    status: 'planned',
    usedByCapabilities: ['document_ingestion', 'rag'],
    installedPackageName: 'docling',
    nextAction: 'Add docling to package.json and wire to RAG ingest pipeline',
    evidence: 'Not in package.json',
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    purpose: 'Vector store for embeddings and RAG retrieval',
    status: 'installed',
    usedByCapabilities: ['embeddings', 'rag'],
    installedPackageName: '@qdrant/js-client-rest',
    nextAction: 'Configure QDRANT_URL env var and prove live connection',
    evidence: 'Found in package.json: @qdrant/js-client-rest ^1.17.0',
  },
  {
    id: 'bullmq_flows',
    name: 'BullMQ Flows',
    purpose: 'Job flow orchestration, queues, and retry policies',
    status: 'installed',
    usedByCapabilities: ['automation', 'scheduler'],
    installedPackageName: 'bullmq',
    nextAction: 'Configure REDIS_URL and wire BullMQ flows to automation routes',
    evidence: 'Found in package.json: bullmq ^5.73.0',
  },
  {
    id: 'promptfoo',
    name: 'Promptfoo',
    purpose: 'Prompt evaluation, regression testing, and model comparison',
    status: 'planned',
    usedByCapabilities: ['proof'],
    installedPackageName: 'promptfoo',
    nextAction: 'Add promptfoo to package.json and wire to /api/admin/proof routes',
    evidence: 'Not in package.json',
  },
  {
    id: 'litellm',
    name: 'LiteLLM',
    purpose: 'Multi-provider LLM proxy with unified API and fallback routing',
    status: 'planned',
    usedByCapabilities: ['chat', 'reasoning_code'],
    installedPackageName: 'litellm',
    nextAction: 'Add litellm to package.json and evaluate as routing proxy layer',
    evidence: 'Not in package.json',
  },
  {
    id: 'langfuse',
    name: 'Langfuse',
    purpose: 'LLM observability, tracing, and cost tracking',
    status: 'planned',
    usedByCapabilities: ['chat', 'proof'],
    installedPackageName: 'langfuse',
    nextAction: 'Add langfuse to package.json and instrument capability routes',
    evidence: 'Not in package.json',
  },
  {
    id: 'file_type',
    name: 'file-type',
    purpose: 'Detect file MIME types from binary content',
    status: 'planned',
    usedByCapabilities: ['assets', 'document_ingestion'],
    installedPackageName: 'file-type',
    nextAction: 'Add file-type to package.json and use in artifact upload handling',
    evidence: 'Not in package.json',
  },
  {
    id: 'sharp',
    name: 'sharp',
    purpose: 'High-performance image processing (resize, convert, optimize)',
    status: 'planned',
    usedByCapabilities: ['image_generation', 'image_edit'],
    installedPackageName: 'sharp',
    nextAction: 'Add sharp to package.json and wire to image artifact post-processing',
    evidence: 'Not in package.json',
  },
  {
    id: 'pdfkit',
    name: 'PDFKit',
    purpose: 'PDF generation for campaign reports, artifacts, and exports',
    status: 'planned',
    usedByCapabilities: ['campaigns', 'assets'],
    installedPackageName: 'pdfkit',
    nextAction: 'Add pdfkit to package.json and wire to campaign/report generation',
    evidence: 'Not in package.json',
  },
  {
    id: 'ffmpeg',
    name: 'ffmpeg',
    purpose: 'Audio/video processing, transcoding, and assembly',
    status: 'planned',
    usedByCapabilities: ['video_generation', 'tts', 'music_generation'],
    installedPackageName: 'ffmpeg-static',
    nextAction: 'Add ffmpeg-static to package.json and wire to video assembly and audio processing',
    evidence: 'Not in package.json (ffmpeg-static). Local ffmpeg binary may exist separately.',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    purpose: 'Browser automation for web scraping and research',
    status: 'installed',
    usedByCapabilities: ['website_scraping'],
    installedPackageName: 'playwright',
    nextAction: 'Wire Playwright to scraper lib and prove website scraping execution',
    evidence: 'Found in package.json: playwright ^1.60.0',
  },
  {
    id: 'tanstack_table',
    name: 'TanStack Table',
    purpose: 'Headless UI table for data-heavy dashboard views',
    status: 'planned',
    usedByCapabilities: ['assets'],
    installedPackageName: '@tanstack/react-table',
    nextAction: 'Add @tanstack/react-table to package.json and use in Assets & Jobs page',
    evidence: 'Not in package.json',
  },
]

export function getLibraryByCapability(capabilityId: string): PlatformLibrary[] {
  return PLATFORM_LIBRARIES.filter((lib) => lib.usedByCapabilities.includes(capabilityId))
}
