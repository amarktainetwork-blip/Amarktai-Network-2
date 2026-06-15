import { executeCapability } from '@/lib/capability-router'
import type { CapabilityResponse } from '@/lib/capability-contracts'

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
  execute(request) {
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
