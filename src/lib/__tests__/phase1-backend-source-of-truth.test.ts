import fs from 'fs'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { resolveGenXConfig } from '@/lib/genx-client'
import { NETWORK_APPS, NETWORK_APPS_EMPTY_MESSAGE } from '@/lib/network-apps-registry'
import { getProviderMeshNode, PROVIDER_MESH } from '@/lib/provider-mesh'
import { routeCommand } from '@/lib/command-router'

const ROOT = path.resolve(__dirname, '../../')
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

afterEach(() => {
  delete process.env.GENX_API_KEY
  delete process.env.GENX_API_URL
  delete process.env.GENX_BASE_URL
})

describe('Phase 1 backend source of truth', () => {
  it('contains only the approved provider and tool mesh', () => {
    expect(PROVIDER_MESH.map((node) => node.id)).toEqual([
      'genx', 'huggingface', 'mimo', 'groq', 'together',
      'github', 'redis', 'qdrant', 'local-crawler', 'playwright', 'scrapy',
      'trafilatura', 'ffmpeg', 'storage', 'smtp',
    ])
    expect(getProviderMeshNode('replicate')).toBeUndefined()
    expect(getProviderMeshNode('fal')).toBeUndefined()
  })

  it('guards Settings tests with provider mesh IDs', () => {
    const source = read('app/api/admin/settings/test-provider/route.ts')
    expect(source).toContain("getProviderMeshNode(body.key || '')")
    expect(source).toContain('Unsupported connection')
    expect(source).not.toContain('Unknown connection')
    expect(source).not.toContain("case 'replicate'")
    expect(source).not.toContain("case 'fal'")
  })

  it('uses the GenX default URL when no URL override exists', async () => {
    process.env.GENX_API_KEY = 'gx_live_123456789abcdef'
    const config = await resolveGenXConfig()
    expect(config.apiUrl).toBe('https://query.genx.sh')
    expect(config.configured).toBe(true)
  })

  it('returns the truthful Network Apps empty state', () => {
    expect(NETWORK_APPS).toEqual([])
    expect(NETWORK_APPS_EMPTY_MESSAGE).toBe('No connected apps yet. Add apps after they are completed.')
    expect(read('app/api/admin/network-apps/route.ts')).toContain(
      'NextResponse.json({ apps: NETWORK_APPS, message: NETWORK_APPS_EMPTY_MESSAGE })',
    )
  })

  it('uses control-centre navigation and keeps Command as compatibility only', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Overview',
      'Connected Apps',
      'Studio',
      'Capabilities',
      'Campaigns',
      'Assets',
      'Agents',
      'Memory',
      'Knowledge/RAG',
      'Approvals',
      'Scheduler/Publishing',
      'Adult Permissions',
      'Settings',
      'System Monitoring',
    ])
    expect(read('app/admin/dashboard/workspace/page.tsx')).toContain('CommandCenter')
    expect(read('app/admin/dashboard/command/page.tsx')).toContain("redirect('/admin/dashboard/workspace')")
    expect(fs.existsSync(path.join(ROOT, 'app/api/admin/command/route.ts'))).toBe(true)
  })

  it.each([
    ['create an image of a lighthouse', 'create_image'],
    ['create a song about the ocean', 'create_song'],
    ['create a voice narration', 'create_voice'],
    ['audit this repo', 'audit_repo'],
    ['create a pull request', 'create_pr'],
    ['check system status', 'check_system'],
  ])('routes "%s" through Workspace as %s', (prompt, intent) => {
    const route = routeCommand(prompt)
    expect(route.intent).toBe(intent)
    expect(route.surface).toBe('Workspace')
  })
})
