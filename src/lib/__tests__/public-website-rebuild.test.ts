import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_NAV_ITEMS } from '@/lib/public-nav'
import { NETWORK_APPS, NETWORK_APPS_EMPTY_MESSAGE } from '@/lib/network-apps-registry'

const ROOT = path.resolve(__dirname, '../../')
const REPO = path.resolve(ROOT, '../')
const read = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf8')

describe('final public website', () => {
  it('uses the exact public navigation source of truth', () => {
    // Updated nav includes marketing, capabilities, apps, safety pages
    const hrefs = PUBLIC_NAV_ITEMS.map(i => i.href)
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/platform')
    expect(hrefs).toContain('/marketing')
    expect(hrefs).toContain('/capabilities')
    expect(hrefs).toContain('/apps')
    expect(hrefs).toContain('/safety')
    expect(hrefs).toContain('/admin/login')
    expect(read('components/public/PublicShell.tsx')).toContain('PUBLIC_NAV_ITEMS')
  })

  it('contains the required homepage sections', () => {
    const source = read('app/page.tsx').toLowerCase()
    // IntelligenceFabric still used in hero
    expect(source).toContain('intelligencefabric')
    // New required sections
    expect(source).toContain('marketing-workflow')
    expect(source).toContain('capabilities')
    expect(source).toContain('brand memory')
    expect(source).toContain('approval')
    expect(source).toContain('publishing')
    expect(source).toContain('providers')
    // AI is blue
    expect(source).toContain('text-blue-')
    // CTA exists
    expect(source).toContain('/admin/login')
  })

  it('platform page explains the AI capability layer', () => {
    const source = read('app/platform/page.tsx')
    expect(source).toContain('capability')
    expect(source).toContain('routing')
    expect(source).toContain('providers')
  })

  it('shows connected apps registry (currently empty until apps are completed)', () => {
    expect(NETWORK_APPS).toHaveLength(0)
    expect(NETWORK_APPS_EMPTY_MESSAGE).toContain('No connected apps')
  })

  it('removes banned public wording', () => {
    const source = [
      'app/page.tsx',
      'app/platform/page.tsx',
      'app/contact/page.tsx',
      'components/public/PublicShell.tsx',
    ].map(read).join('\n')
    for (const token of ['Aiva', 'Superbrain', 'Private AI infrastructure', 'Firecrawl required', 'OpenAI required']) {
      expect(source).not.toContain(token)
    }
  })

  it('keeps the final audit document', () => {
    expect(fs.existsSync(path.join(REPO, 'docs/audits/FINAL_SOURCE_OF_TRUTH_AND_PROVIDER_MESH_AUDIT.md'))).toBe(true)
  })
})
