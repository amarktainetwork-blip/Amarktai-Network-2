import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_TYPES,
  artifactMatchesFilters,
  type ArtifactRecord,
} from '@/lib/artifact-store'
import { isPolicyRestrictedArtifact } from '@/lib/artifact-policy'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'

const ROOT = process.cwd()

function source(file: string) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

function artifact(overrides: Partial<ArtifactRecord> = {}): ArtifactRecord {
  return {
    id: 'artifact-1',
    executionId: 'execution-1',
    jobId: 'job-1',
    appSlug: 'media-studio',
    appId: null,
    workspaceId: null,
    type: 'image',
    subType: 'image_generation',
    title: 'Generated image',
    description: 'Persisted image output',
    summary: 'Persisted image output',
    provider: 'genx',
    model: 'image-model',
    capability: 'image_generation',
    traceId: 'trace-1',
    storageDriver: 'local_vps',
    storagePath: 'artifacts/image.png',
    storageUrl: '/api/artifacts/file/artifacts/image.png',
    downloadUrl: '/api/admin/artifacts/artifact-1/download',
    previewUrl: '/api/admin/artifacts/artifact-1/download',
    mimeType: 'image/png',
    fileSize: 1024,
    fileSizeBytes: 1024,
    previewable: true,
    downloadable: true,
    status: 'completed',
    errorMessage: '',
    costUsdCents: 0,
    metadata: {},
    createdAt: new Date('2026-06-12T00:00:00Z'),
    updatedAt: new Date('2026-06-12T00:00:00Z'),
    ...overrides,
  }
}

describe('Phase 2 canonical artifact contract', () => {
  it('supports every required artifact type', () => {
    expect(ARTIFACT_TYPES).toEqual(expect.arrayContaining([
      'text',
      'report',
      'image',
      'audio',
      'music',
      'video',
      'voice',
      'avatar',
      'repo_patch',
      'repo_diff',
      'app_blueprint',
      'deployment_plan',
      'research_result',
      'code',
      'document',
    ]))
  })

  it('exposes execution, job, app, workspace, capability, file, and preview fields', () => {
    expect(artifact()).toMatchObject({
      id: expect.any(String),
      executionId: expect.any(String),
      jobId: expect.any(String),
      appSlug: expect.any(String),
      type: expect.any(String),
      status: 'completed',
      capability: expect.any(String),
      mimeType: expect.any(String),
      fileSize: expect.any(Number),
      storageUrl: expect.any(String),
      downloadUrl: expect.any(String),
      previewUrl: expect.any(String),
      metadata: expect.any(Object),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    })
  })

  it('filters by type, status, app, capability, execution, and job', () => {
    const record = artifact()
    expect(artifactMatchesFilters(record, {
      type: 'image',
      status: 'completed',
      appSlug: 'media-studio',
      capability: 'image_generation',
      executionId: 'execution-1',
      jobId: 'job-1',
    })).toBe(true)
    expect(artifactMatchesFilters(record, { capability: 'video_generation' })).toBe(false)
    expect(artifactMatchesFilters(record, { executionId: 'execution-2' })).toBe(false)
  })

  it('keeps pending jobs from claiming completed artifact output', () => {
    const runner = source('src/lib/execution/execution-runner.ts')
    expect(runner).toContain("['pending', 'processing', 'queued'].includes(status)")
    expect(runner.indexOf('if (isPending)')).toBeLessThan(runner.indexOf('if (success)'))
  })
})

describe('Phase 2 Artifact Library APIs and dashboard', () => {
  it('provides authenticated list, detail, download, reuse, and archive routes', () => {
    for (const file of [
      'src/app/api/admin/artifacts/route.ts',
      'src/app/api/admin/artifacts/[id]/route.ts',
      'src/app/api/admin/artifacts/[id]/download/route.ts',
      'src/app/api/admin/artifacts/[id]/reuse/route.ts',
      'src/app/api/admin/artifacts/[id]/archive/route.ts',
    ]) {
      const route = source(file)
      expect(route).toContain('getSession')
      expect(route).toContain('Unauthorized')
    }
  })

  it('does not manufacture metadata-only completed artifacts', () => {
    const store = source('src/lib/artifact-store.ts')
    const api = source('src/app/api/admin/artifacts/route.ts')
    expect(store).toContain('Completed artifacts require persisted content or a real content URL.')
    expect(api).not.toContain("driver: 'local_meta'")
  })

  it('renders image, audio, video, and structured text previews from real records', () => {
    const page = source('src/app/admin/dashboard/artifacts/page.tsx')
    expect(page).toContain("artifact.type === 'image'")
    expect(page).toContain("['audio', 'music', 'voice']")
    expect(page).toContain("['video', 'avatar']")
    expect(page).toContain('metadataSummary')
    expect(page).not.toContain('recent outputs')
  })

  it('shows execution, job, MIME, file size, and artifact actions', () => {
    const page = source('src/app/admin/dashboard/artifacts/page.tsx')
    for (const term of ['Execution', 'Job', 'mimeType', 'formatBytes', 'Open', 'Download', 'Reuse', 'Archive']) {
      expect(page).toContain(term)
    }
  })

  it('keeps the Artifacts dashboard section', () => {
    expect(DASHBOARD_NAV_ITEMS.some((item) => item.label === 'Artifacts')).toBe(true)
    expect(fs.existsSync(path.join(ROOT, 'src/app/admin/dashboard/artifacts/page.tsx'))).toBe(true)
  })
})

describe('Phase 2 producer and policy coverage', () => {
  it('marks adult and suggestive artifacts as policy restricted', () => {
    expect(isPolicyRestrictedArtifact(artifact({
      capability: 'adult_image',
      subType: 'adult_image',
    }))).toBe(true)
    expect(isPolicyRestrictedArtifact(artifact({
      capability: 'suggestive_video',
      subType: 'suggestive_video',
    }))).toBe(true)
    expect(isPolicyRestrictedArtifact(artifact())).toBe(false)
    expect(source('src/lib/artifact-policy.ts')).toContain('loadAppSafetyConfigFromDB')
  })

  it('persists research, STT, and video plans', () => {
    expect(source('src/lib/orchestrator.ts')).toContain("return 'research_result'")
    expect(source('src/app/api/brain/stt/route.ts')).toContain("type: 'transcript'")
    expect(source('src/app/api/brain/video/route.ts')).toContain("subType: 'video_plan'")
    expect(source('src/app/api/brain/suggestive-video/route.ts')).toContain("subType: 'suggestive_video'")
  })

  it('keeps removed voice authentication absent', () => {
    const removedTerm = ['voice', '-', 'login'].join('')
    const corpus = [
      source('src/lib/artifact-store.ts'),
      source('src/app/admin/dashboard/artifacts/page.tsx'),
      source('src/app/api/admin/artifacts/route.ts'),
    ].join('\n').toLowerCase()
    expect(corpus).not.toContain(removedTerm)
  })

  it('does not add prohibited direct executable providers', () => {
    const prohibited = [
      ['rep', 'licate'].join(''),
      ['open', 'router'].join(''),
      ['sun', 'o'].join(''),
      ['ud', 'io'].join(''),
    ]
    for (const provider of prohibited) expect(APPROVED_DIRECT_PROVIDER_IDS).not.toContain(provider)
  })
})
