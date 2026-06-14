import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('production dashboard execution reliability contracts', () => {
  it('gates System ready on canonical storage, providers, artifacts, and creative execution', () => {
    const settingsTruth = read('src/lib/platform-settings-truth.ts')
    const dashboardLayout = read('src/app/admin/dashboard/layout.tsx')

    expect(settingsTruth).toContain('verifiedStorage.ready')
    expect(settingsTruth).toContain('providersReady')
    expect(settingsTruth).toContain('artifactPersistenceReady')
    expect(settingsTruth).toContain('creativeSmokePassed')
    expect(dashboardLayout).toContain('truth?.systemReadiness')
    expect(dashboardLayout).not.toContain('truth.storage.connected')
  })

  it('keeps the live creative smoke test admin-only and reports real execution records and artifacts', () => {
    const route = read('src/app/api/admin/system/live-creative-smoke-test/route.ts')
    const runner = read('src/lib/creative-smoke-test.ts')

    expect(route).toContain('getSession')
    expect(route).toContain("status: 401")
    expect(runner).toContain('executeCapabilityOrchestration')
    expect(runner).toContain('createExecution')
    expect(runner).toContain('recordExecutionResponse')
    expect(runner).toContain('createArtifact')
    expect(runner).toContain('previewUrl')
    expect(runner).toContain('jobsEntryVisible')
    expect(runner).toContain('artifactsEntryVisible')
  })

  it('normalizes Jobs artifact links and shows Studio blockers without fake artifacts', () => {
    const jobsRoute = read('src/app/api/admin/system/jobs/route.ts')
    const jobsPage = read('src/app/admin/dashboard/jobs/page.tsx')
    const studioPage = read('src/app/admin/dashboard/studio/page.tsx')

    expect(jobsRoute).toContain('artifactUrl')
    expect(jobsRoute).toContain('execution.artifacts.at(-1)')
    expect(jobsPage).toContain('data.jobs')
    expect(jobsPage).toContain('View artifact')
    expect(studioPage).toContain('resultMessage(active.result)')
    expect(studioPage).toContain('No completed artifact is available.')
  })

  it('preserves TEXT columns for provider readiness notes', () => {
    const schema = read('prisma/schema.prisma')
    const aiProvider = schema.match(/model AiProvider \{[\s\S]*?\n\}/)?.[0] ?? ''
    const integrationConfig = schema.match(/model IntegrationConfig \{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(aiProvider).toMatch(/notes\s+String\s+@default\(""\)\s+@db\.Text/)
    expect(integrationConfig).toMatch(/notes\s+String\s+@default\(""\)\s+@db\.Text/)
  })
})
