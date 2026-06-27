import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

function readDashboardSources() {
  const root = path.join(ROOT, 'app/admin/dashboard')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full)
    }
  }
  walk(root)
  return files.map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }))
}

describe('final source-of-truth consolidation', () => {
  it('dashboard sources do not contain legacy proof/status wording', () => {
    for (const { file, source } of readDashboardSources()) {
      expect(source, file).not.toContain('none / route ready')
      expect(source, file).not.toContain('route ready')
      expect(source, file).not.toContain('Key no')
      expect(source, file).not.toContain('Endpoint no')
      expect(source, file).not.toContain('Unknown connection')
      expect(source, file).not.toContain('Runtime capability matrix')
    }
  })

  it('nav uses the canonical capabilities page and keeps operations as redirect only', () => {
    expect(DASHBOARD_NAV_ITEMS.find((item) => item.id === 'capabilities')?.href).toBe('/admin/dashboard/capabilities')
    expect(read('app/admin/dashboard/capabilities/page.tsx')).toContain('getCapabilityRuntimeTruth')
    expect(read('app/admin/dashboard/operations/page.tsx')).toContain("redirect('/admin/dashboard/capabilities')")
  })

  it('provider display surfaces share provider-runtime-truth through the canonical adapter chain', () => {
    expect(read('lib/platform-settings-truth.ts')).toContain("from '@/lib/provider-runtime-truth'")
    expect(read('app/api/admin/providers/status/route.ts')).toContain("from '@/lib/provider-runtime-truth'")
    expect(read('lib/runtime-capability-truth.ts')).toContain("from '@/lib/provider-runtime-truth'")
    expect(read('app/admin/dashboard/page.tsx')).toContain("from '@/lib/runtime-capability-truth'")
    expect(read('app/admin/dashboard/system/page.tsx')).toContain("from '@/lib/runtime-capability-truth'")
  })

  it('capability display surfaces use capability-runtime-truth and not metadata proof strings', () => {
    expect(read('app/admin/dashboard/capabilities/page.tsx')).toContain("from '@/lib/capability-runtime-truth'")
    expect(read('app/api/admin/system/capabilities/route.ts')).toContain("from '@/lib/capability-runtime-truth'")
    expect(read('lib/runtime-capability-truth.ts')).toContain("from '@/lib/capability-runtime-truth'")
    expect(read('lib/capability-registry.ts')).not.toContain('LIVE_PROVEN')
    expect(read('lib/capability-registry.ts')).not.toContain('proofStatus')
    expect(read('lib/provider-capability-map.ts')).not.toContain('LIVE_PROVEN')
    expect(read('lib/provider-capability-map.ts')).not.toContain('proofStatus')
  })

  it('public capabilities page is marketing copy, not runtime proof UI', () => {
    const source = read('app/capabilities/page.tsx')
    expect(source).not.toContain('getCapabilityRuntimeTruth')
    expect(source).not.toContain('/api/admin/system/capabilities')
    expect(source).not.toContain('proofStatus')
    expect(source).not.toContain('Live proof passed')
  })

  it('studio rejects app-supplied provider and model overrides', () => {
    const source = read('app/api/admin/studio/execute/route.ts')
    expect(source).toContain('Studio UI payload cannot include')
    expect(source).toContain('providerOverride')
    expect(source).toContain('modelOverride')
  })

  it('unsupported provider tests do not return the old Unknown connection message', () => {
    const source = read('app/api/admin/settings/test-provider/route.ts')
    expect(source).toContain('Unsupported connection')
    expect(source).not.toContain('Unknown connection')
  })
})
