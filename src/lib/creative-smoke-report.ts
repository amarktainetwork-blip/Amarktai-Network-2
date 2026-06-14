import { prisma } from '@/lib/prisma'

export const CREATIVE_SMOKE_KEY = 'live_creative_smoke_test'

export type CreativeSmokeStatus = 'pass' | 'pending' | 'blocked' | 'fail'

export interface CreativeSmokeWorkflow {
  workflow: 'text' | 'image' | 'video' | 'music' | 'artifact_persistence'
  capability: string
  status: CreativeSmokeStatus
  provider: string | null
  model: string | null
  executionId: string
  jobId: string | null
  artifactId: string | null
  previewUrl: string | null
  jobsEntryVisible: boolean
  artifactsEntryVisible: boolean
  error: string | null
  blocker: string | null
}

export interface CreativeSmokeReport {
  id: string
  testedAt: string
  overall: 'pass' | 'fail'
  artifactPersistencePassed: boolean
  creativeWorkflowPassed: boolean
  workflows: CreativeSmokeWorkflow[]
}

export async function saveCreativeSmokeReport(report: CreativeSmokeReport): Promise<void> {
  await prisma.integrationConfig.upsert({
    where: { key: CREATIVE_SMOKE_KEY },
    create: {
      key: CREATIVE_SMOKE_KEY,
      displayName: 'Live Creative Smoke Test',
      enabled: true,
      notes: JSON.stringify(report),
    },
    update: {
      displayName: 'Live Creative Smoke Test',
      enabled: true,
      notes: JSON.stringify(report),
    },
  })
}

export async function getLatestCreativeSmokeReport(): Promise<CreativeSmokeReport | null> {
  const row = await prisma.integrationConfig.findUnique({
    where: { key: CREATIVE_SMOKE_KEY },
    select: { notes: true },
  })
  if (!row?.notes) return null
  try {
    const parsed = JSON.parse(row.notes) as CreativeSmokeReport
    return parsed?.id && Array.isArray(parsed.workflows) ? parsed : null
  } catch {
    return null
  }
}
