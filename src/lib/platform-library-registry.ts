/**
 * Platform Library Registry — tracks external libraries, their install status,
 * and which capabilities they power.
 */

// Valid status:'planned'|'installed'|'wired'|'proven'|'blocked'
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

export const PLATFORM_LIBRARIES: readonly PlatformLibrary[] = [
  {
    id: 'crawlee',
    name: 'Crawlee',
    purpose: 'web crawling',
    status: 'planned',
    usedByCapabilities: ['website_scraping', 'research'],
    installedPackageName: 'crawlee',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'docling',
    name: 'Docling',
    purpose: 'document ingestion/parsing',
    status: 'planned',
    usedByCapabilities: ['document_ingestion', 'rag'],
    installedPackageName: 'docling',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'qdrant',
    name: 'Qdrant JS Client',
    purpose: 'vector store for RAG',
    status: 'wired',
    usedByCapabilities: ['embeddings', 'rag'],
    installedPackageName: '@qdrant/js-client-rest',
    nextAction: 'Expand coverage to all RAG and embedding routes',
    evidence:
      'Found in package.json (@qdrant/js-client-rest ^1.17.0); actively imported and used in vector-store.ts, rag-capability.ts, emotion-persistence.ts, federated-memory.ts',
  },
  {
    id: 'bullmq_flows',
    name: 'BullMQ',
    purpose: 'job flow orchestration',
    status: 'wired',
    usedByCapabilities: ['automation', 'scheduler'],
    installedPackageName: 'bullmq',
    nextAction: 'Expand to flow-based orchestration patterns (BullMQ Flows API)',
    evidence:
      'Found in package.json (bullmq ^5.73.0); Queue/Worker imported in job-queue.ts; referenced in batch-processor.ts',
  },
  {
    id: 'promptfoo',
    name: 'Promptfoo',
    purpose: 'prompt evaluation and testing',
    status: 'planned',
    usedByCapabilities: ['proof'],
    installedPackageName: 'promptfoo',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'litellm',
    name: 'LiteLLM',
    purpose: 'multi-provider LLM proxy',
    status: 'planned',
    usedByCapabilities: ['chat', 'reasoning_code'],
    installedPackageName: 'litellm',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'langfuse',
    name: 'Langfuse',
    purpose: 'observability and tracing',
    status: 'planned',
    usedByCapabilities: ['chat', 'proof'],
    installedPackageName: 'langfuse',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'file_type',
    name: 'file-type',
    purpose: 'file type detection',
    status: 'planned',
    usedByCapabilities: ['assets', 'document_ingestion'],
    installedPackageName: 'file-type',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    purpose: 'image processing',
    status: 'planned',
    usedByCapabilities: ['image_generation', 'image_edit'],
    installedPackageName: 'sharp',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'pdfkit',
    name: 'PDFKit',
    purpose: 'PDF generation',
    status: 'planned',
    usedByCapabilities: ['campaigns', 'assets'],
    installedPackageName: 'pdfkit',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg Static',
    purpose: 'audio/video processing',
    status: 'planned',
    usedByCapabilities: ['video_generation', 'tts', 'music_generation'],
    installedPackageName: 'ffmpeg-static',
    nextAction: 'Add to package.json and wire to capability',
    evidence:
      'Not in package.json; referenced by name in command-router.ts comments but not imported',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    purpose: 'browser automation for scraping',
    status: 'installed',
    usedByCapabilities: ['website_scraping'],
    installedPackageName: 'playwright',
    nextAction: 'Wire to capability route',
    evidence:
      'Found in package.json (playwright ^1.60.0); referenced in capability-runtime-truth.ts as provider candidate but not directly imported in capability handlers',
  },
  {
    id: 'tanstack_table',
    name: 'TanStack Table',
    purpose: 'data table UI',
    status: 'planned',
    usedByCapabilities: ['assets'],
    installedPackageName: '@tanstack/react-table',
    nextAction: 'Add to package.json and wire to capability',
    evidence: 'Not in package.json',
  },
] as const

export function getLibraryByCapability(capabilityId: string): PlatformLibrary[] {
  return PLATFORM_LIBRARIES.filter((lib) =>
    lib.usedByCapabilities.includes(capabilityId)
  )
}
