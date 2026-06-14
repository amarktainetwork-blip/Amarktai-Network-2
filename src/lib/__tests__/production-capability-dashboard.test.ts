import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCTION_CAPABILITY_CONTRACTS } from '@/lib/production-capability-contracts'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/brain/v1-capability-matrix'
import { ADULT_CAPABILITY_IDS } from '@/lib/adult-app-capabilities'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const ROOT = process.cwd()
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('production capability and dashboard contract', () => {
  it('projects the canonical 62 plus six governed adult capabilities as 68 product contracts', () => {
    expect(AI_CAPABILITY_TAXONOMY).toHaveLength(62)
    expect(ADULT_CAPABILITY_IDS).toHaveLength(6)
    expect(PRODUCTION_CAPABILITY_CONTRACTS).toHaveLength(68)
    expect(new Set(PRODUCTION_CAPABILITY_CONTRACTS.map((entry) => entry.id))).toHaveProperty('size', 68)
    for (const contract of PRODUCTION_CAPABILITY_CONTRACTS) {
      expect(contract.endpoint).toBeTruthy()
      expect(contract.inputContract.length).toBeGreaterThan(0)
      expect(contract.outputContract.length).toBeGreaterThan(0)
      expect(AI_CAPABILITY_TAXONOMY.some((entry) => entry.id === contract.canonicalCapability)).toBe(true)
    }
  })

  it('does not report planning documents as completed media generation', () => {
    const orchestrator = source('src/lib/orchestrator.ts')
    expect(orchestrator).not.toContain('createPlanningFallback')
    expect(orchestrator).not.toContain("kind: 'music_blueprint'")
    expect(orchestrator).not.toContain("kind: 'avatar_storyboard'")
    const music = AI_CAPABILITY_TAXONOMY.find((entry) => entry.id === 'music_generation')
    const avatar = AI_CAPABILITY_TAXONOMY.find((entry) => entry.id === 'avatar_generation')
    expect(music).toMatchObject({ status: 'working', executableEndpoint: '/api/admin/music-studio' })
    expect(avatar).toMatchObject({ status: 'working', executableEndpoint: '/api/brain/avatar' })
  })

  it('uses the exact seven-item product navigation without a parallel dashboard', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      'Command Center',
      'Studio',
      'Apps',
      'Jobs',
      'Artifacts',
      'Providers',
      'Settings',
    ])
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain("setMode('adult')")
    expect(studio).not.toContain('Media job history')
    expect(studio).not.toContain('Model, optional')
    expect(studio).not.toContain('<option value="genx">')
  })

  it('exposes approved-provider diagnostics and a guarded hard reset', () => {
    const diagnostics = source('src/app/api/admin/system/provider-diagnostics/route.ts')
    const reset = source('src/app/api/admin/system/hard-reset/route.ts')
    const resetService = source('src/lib/admin-runtime-reset.ts')
    expect(diagnostics).toContain('APPROVED_DIRECT_PROVIDER_IDS')
    expect(diagnostics).not.toMatch(/apiKey|secretValue|credential:/)
    expect(reset).toContain('HARD RESET JOBS AND ARTIFACTS')
    expect(resetService).toContain('controlPlaneAttempt.deleteMany')
    expect(resetService).toContain('capabilityTrace.deleteMany')
    expect(resetService).toContain('queue.obliterate')
  })
})
