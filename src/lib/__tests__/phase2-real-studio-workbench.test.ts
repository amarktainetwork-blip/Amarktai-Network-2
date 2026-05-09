import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { STUDIO_ROUTE_MAP, STUDIO_TABS } from '@/lib/studio-route-map'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('Phase 2 real Studio and Workbench wiring', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('keeps the dashboard to the six final sections only', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Studio',
      'Workbench',
      'Apps & Agents',
      'Memory & Learning',
      'Operations',
      'Settings',
    ])
  })

  it('Settings connected count requires a passed live test, not only a saved key', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        integrationConfig: {
          findUnique: vi.fn(async ({ where }: { where: { key: string } }) => (
            where.key === 'genx'
              ? { notes: JSON.stringify({ lastTestStatus: 'needs_live_test' }) }
              : null
          )),
        },
        gitHubConfig: {
          findFirst: vi.fn(async () => null),
        },
      },
    }))
    vi.doMock('@/lib/provider-config', () => ({
      getProviderKeyWithSource: vi.fn(async (key: string) => ({
        key: key === 'genx' ? 'configured_genx_key' : null,
        source: key === 'genx' ? 'vault' : 'missing',
      })),
    }))

    const { getPlatformSettingsTruth } = await import('@/lib/platform-settings-truth')
    const truth = await getPlatformSettingsTruth()
    expect(truth.connectedCount).toBe(0)
    expect(truth.providers.find((provider) => provider.key === 'genx')?.status).toBe('Needs live test')
  })

  it('maps every Studio tab to the protected route that owns its real execution state', () => {
    expect([...STUDIO_TABS]).toEqual([
      'Chat',
      'Coding',
      'Research',
      'Image',
      'Video',
      'Music / Audio',
      'Voice / TTS',
      'STT / Transcription',
      'Avatar / Talking Video',
      'Adult',
      'Artifacts',
    ])
    expect(STUDIO_ROUTE_MAP.Chat.route).toBe('/api/admin/amarktai-assistant/stream')
    expect(STUDIO_ROUTE_MAP.Image.route).toBe('/api/admin/studio/execute')
    expect(STUDIO_ROUTE_MAP.Research.route).toBe('/api/admin/studio/execute')
    expect(STUDIO_ROUTE_MAP['Voice / TTS'].route).toBe('/api/admin/studio/execute')
    expect(STUDIO_ROUTE_MAP['STT / Transcription'].route).toBe('/api/admin/studio/stt')
    expect(STUDIO_ROUTE_MAP.Artifacts.route).toBe('/api/admin/artifacts')
    expect(STUDIO_ROUTE_MAP['Avatar / Talking Video'].status).toBe('missing')
  })

  it('Studio execution wrappers call real backend routes and persist artifacts', () => {
    const execute = read('app/api/admin/studio/execute/route.ts')
    const stt = read('app/api/admin/studio/stt/route.ts')
    const page = read('app/admin/dashboard/page.tsx')

    expect(execute).toContain("from '@/app/api/admin/research/assist/route'")
    expect(execute).toContain("from '@/app/api/brain/image/route'")
    expect(execute).toContain("from '@/app/api/brain/video-generate/route'")
    expect(execute).toContain("from '@/app/api/brain/tts/route'")
    expect(execute).toContain("from '@/app/api/brain/adult-text/route'")
    expect(execute).toContain("from '@/app/api/brain/adult-image/route'")
    expect(execute).toContain('createArtifact')
    expect(stt).toContain("from '@/app/api/brain/stt/route'")
    expect(stt).toContain('createArtifact')
    expect(page).toContain('/api/admin/studio/execute')
    expect(page).toContain('/api/admin/studio/stt')
    expect(page).toContain('/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}')
  })

  it('Adult Studio exposes only real text/image execution and keeps video/voice unavailable for Phase 3', () => {
    const execute = read('app/api/admin/studio/execute/route.ts')
    const routeMap = read('lib/studio-route-map.ts')
    expect(execute).toContain("body.mode === 'image'")
    expect(execute).toContain('adultTextPost')
    expect(execute).toContain('adultImagePost')
    expect(execute).not.toContain('adult-video')
    expect(execute).not.toContain('adult_voice')
    expect(routeMap).toContain('video/voice are not exposed as working')
  })

  it('non-GenX streaming still returns an honest pending status instead of fake output', () => {
    const streamRoute = read('app/api/admin/amarktai-assistant/stream/route.ts')
    expect(streamRoute).toContain('Selected provider streaming pending')
    expect(streamRoute).not.toContain('Simulated')
    expect(streamRoute).not.toContain('fake')
  })

  it('Workbench loads branches on first repo selection and rehydrates the latest persisted job', () => {
    const workbenchPage = read('app/admin/dashboard/workbench/page.tsx')
    const latestRoute = read('app/api/admin/repo-workbench/jobs/latest/route.ts')
    const repoWorkbench = read('lib/repo-workbench.ts')
    expect(workbenchPage).toContain("loadBranches(nextRepos[0].full_name)")
    expect(workbenchPage).toContain('/api/admin/repo-workbench/jobs/latest')
    expect(workbenchPage).toContain('rehydrateJob')
    expect(latestRoute).toContain('getLatestWorkbenchJob')
    expect(repoWorkbench).toContain('export async function getLatestWorkbenchJob')
    expect(repoWorkbench).toContain('patch: patch ?')
    expect(repoWorkbench).toContain('logs: await getWorkbenchJobLogs')
  })

  it('Workbench lifecycle remains the simple guarded repo flow', () => {
    const page = read('app/admin/dashboard/workbench/page.tsx')
    const backend = read('lib/repo-workbench.ts')
    for (const route of [
      '/api/admin/repo-workbench/import',
      '/plan',
      '/patch',
      '/apply-patch',
      '/checks',
      '/run-check',
      '/commit',
      '/push',
      '/pr',
    ]) {
      expect(page).toContain(route)
    }
    expect(page).toContain('Start work')
    expect(page).toContain('Approve changes')
    expect(page).toContain('Create PR')
    expect(backend).toContain('REPO_WORKBENCH_ALLOW_MAIN_PUSH')
    expect(backend).toContain('REPO_WORKBENCH_ALLOW_MERGE')
    expect(backend).toContain('REPO_WORKBENCH_ALLOW_DEPLOY')
  })

  it('GitHub tokens are not exposed in Workbench UI/log output code paths', () => {
    const page = read('app/admin/dashboard/workbench/page.tsx')
    const backend = read('lib/repo-workbench.ts')
    expect(page).not.toContain('GITHUB_TOKEN')
    expect(page).not.toContain('x-access-token')
    expect(backend).toContain('redactSecretsFromLogs')
    expect(backend).toContain('GIT_TERMINAL_PROMPT')
    expect(backend).toContain('GIT_ASKPASS')
  })
})
