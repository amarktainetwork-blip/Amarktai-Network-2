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
    expect(PUBLIC_NAV_ITEMS).toEqual([
      { href: '/', label: 'Home' },
      { href: '/platform', label: 'Platform' },
      { href: '/network-apps', label: 'Network Apps' },
      { href: '/contact', label: 'Contact' },
      { href: '/admin/login', label: 'Login' },
    ])
    expect(read('components/public/PublicShell.tsx')).toContain('PUBLIC_NAV_ITEMS')
  })

  it('contains the required alternating homepage story', () => {
    const source = read('app/page.tsx').toLowerCase()
    for (const token of [
      'intelligencefabric',
      'what amarktai network is',
      'one command window',
      'plan, build, launch, monitor, and improve',
      'connected apps',
      'create media, apps, and workflows',
      'runtime truth',
    ]) expect(source).toContain(token)
    expect(source).toContain('bg-white')
    expect(source).toContain('bg-cyan-50')
    expect(source).toContain('bg-[#050a12]')
  })

  it('explains the complete platform without backend report language', () => {
    const source = read('app/platform/page.tsx')
    for (const token of ['One command window', 'Provider mesh', 'Connected apps', 'Agents', 'Memory', 'Outputs', 'Hidden monitoring']) {
      expect(source).toContain(token)
    }
  })

  it('shows connected apps registry (currently empty until apps are completed)', () => {
    expect(NETWORK_APPS).toHaveLength(0)
    expect(NETWORK_APPS_EMPTY_MESSAGE).toContain('No connected apps')
  })

  it('removes banned public wording', () => {
    const source = [
      'app/page.tsx',
      'app/platform/page.tsx',
      'app/network-apps/page.tsx',
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
