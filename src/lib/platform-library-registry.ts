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
    usedByCapabilities: ['website_scraping', 'research', 'campaigns', 'brand_memory'],
    installedPackageName: 'crawlee',
    nextAction: 'Add crawlee to package.json; wire to /api/brain/research, scraper lib, and campaign research flows',
    evidence: 'Not in package.json',
  },
  {
    id: 'docling',
    name: 'Docling',
    purpose: 'Document ingestion and parsing (PDF, Word, HTML to structured text)',
    status: 'planned',
    usedByCapabilities: ['document_ingestion', 'rag', 'memory', 'research'],
    installedPackageName: 'docling',
    nextAction: 'Add docling to package.json; wire to RAG ingest, memory ingestion, and research pipelines',
    evidence: 'Not in package.json',
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    purpose: 'Vector store for embeddings and RAG retrieval',
    status: 'installed',
    usedByCapabilities: ['rag', 'memory', 'brand_memory', 'app_runtime_api', 'embeddings'],
    installedPackageName: '@qdrant/js-client-rest',
    nextAction: 'Configure QDRANT_URL; prove live connection via /api/admin/rag/query; wire to memory and brand memory',
    evidence: 'Found in package.json: @qdrant/js-client-rest ^1.17.0',
  },
  {
    id: 'bullmq_flows',
    name: 'BullMQ Flows',
    purpose: 'Job flow orchestration, queues, and retry policies',
    status: 'installed',
    usedByCapabilities: ['automation', 'scheduler', 'long_form_video', 'campaigns', 'social_publishing', 'trading_bot_execution'],
    installedPackageName: 'bullmq',
    nextAction: 'Configure REDIS_URL; wire BullMQ flows to automation, scheduler, long-form video, and campaign job routes',
    evidence: 'Found in package.json: bullmq ^5.73.0',
  },
  {
    id: 'promptfoo',
    name: 'Promptfoo',
    purpose: 'Prompt evaluation, regression testing, and model comparison',
    status: 'planned',
    usedByCapabilities: ['proof', 'providers', 'capabilities'],
    installedPackageName: 'promptfoo',
    nextAction: 'Add promptfoo to package.json; wire to /api/admin/proof and provider capability test routes',
    evidence: 'Not in package.json',
  },
  {
    id: 'litellm',
    name: 'LiteLLM',
    purpose: 'Multi-provider LLM proxy with unified API and fallback routing',
    status: 'planned',
    usedByCapabilities: ['chat', 'streaming_chat', 'reasoning_code', 'embeddings'],
    installedPackageName: 'litellm',
    nextAction: 'Add litellm to package.json; evaluate as unified routing proxy for chat, embeddings, and reasoning',
    evidence: 'Not in package.json',
  },
  {
    id: 'langfuse',
    name: 'Langfuse',
    purpose: 'LLM observability, tracing, and cost tracking',
    status: 'planned',
    usedByCapabilities: ['proof', 'providers', 'capabilities', 'app_runtime_api'],
    installedPackageName: 'langfuse',
    nextAction: 'Add langfuse to package.json; instrument capability execution routes for observability and cost tracking',
    evidence: 'Not in package.json',
  },
  {
    id: 'file_type',
    name: 'file-type',
    purpose: 'Detect file MIME types from binary content',
    status: 'planned',
    usedByCapabilities: ['assets', 'image_generation', 'video_generation', 'music_generation', 'tts', 'stt', 'document_ingestion'],
    installedPackageName: 'file-type',
    nextAction: 'Add file-type to package.json; use in artifact upload handling and media MIME detection',
    evidence: 'Not in package.json',
  },
  {
    id: 'sharp',
    name: 'sharp',
    purpose: 'High-performance image processing (resize, convert, optimize)',
    status: 'planned',
    usedByCapabilities: ['assets', 'image_generation', 'image_edit', 'avatar_generation'],
    installedPackageName: 'sharp',
    nextAction: 'Add sharp to package.json; wire to image artifact post-processing, thumbnail generation, and format conversion',
    evidence: 'Not in package.json',
  },
  {
    id: 'pdfkit',
    name: 'PDFKit',
    purpose: 'PDF generation for campaign reports, artifacts, and exports',
    status: 'planned',
    usedByCapabilities: ['campaigns', 'research', 'assets'],
    installedPackageName: 'pdfkit',
    nextAction: 'Add pdfkit to package.json; wire to campaign report generation, research export, and artifact PDF creation',
    evidence: 'Not in package.json',
  },
  {
    id: 'ffmpeg',
    name: 'ffmpeg',
    purpose: 'Audio/video processing, transcoding, and assembly',
    status: 'planned',
    usedByCapabilities: ['long_form_video', 'video_generation', 'music_generation', 'tts'],
    installedPackageName: 'ffmpeg-static',
    nextAction: 'Add ffmpeg-static to package.json; wire to long-form video scene assembly, audio transcoding, and TTS post-processing',
    evidence: 'Not in package.json (ffmpeg-static). Local ffmpeg binary may exist separately.',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    purpose: 'Browser automation for web scraping and research',
    status: 'installed',
    usedByCapabilities: ['website_scraping', 'research'],
    installedPackageName: 'playwright',
    nextAction: 'Wire Playwright to scraper lib (/lib/scraper.ts) and prove website scraping; integrate with research capability',
    evidence: 'Found in package.json: playwright ^1.60.0',
  },
  {
    id: 'tanstack_table',
    name: 'TanStack Table',
    purpose: 'Headless UI table for data-heavy dashboard views',
    status: 'planned',
    usedByCapabilities: ['capabilities', 'providers', 'proof', 'assets'],
    installedPackageName: '@tanstack/react-table',
    nextAction: 'Add @tanstack/react-table to package.json; use in capabilities, providers, proof, and assets table views',
    evidence: 'Not in package.json',
  },
]

export function getLibraryByCapability(capabilityId: string): PlatformLibrary[] {
  return PLATFORM_LIBRARIES.filter((lib) => lib.usedByCapabilities.includes(capabilityId))
}
