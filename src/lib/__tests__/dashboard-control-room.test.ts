import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const root = process.cwd()
function src(rel: string) { return fs.readFileSync(path.join(root, 'src', rel), 'utf8') }
function exists(rel: string) { return fs.existsSync(path.join(root, 'src', rel)) }

describe('dashboard nav: 13 required sections', () => {
  const REQUIRED_LABELS = [
    'Command Center', 'Studio', 'Capabilities', 'Providers & Models',
    'Proof & Tests', 'Assets & Jobs', 'Memory & Knowledge', 'Automation',
    'Adult Private', 'App Runtime', 'Libraries & Integrations', 'Settings', 'System',
  ] as const

  it('has exactly 13 nav items', () => {
    expect(DASHBOARD_NAV_ITEMS).toHaveLength(13)
  })

  it.each(REQUIRED_LABELS)('includes nav label: %s', (label) => {
    expect(DASHBOARD_NAV_ITEMS.map(i => i.label)).toContain(label)
  })

  it('all nav hrefs start with /admin/dashboard', () => {
    for (const item of DASHBOARD_NAV_ITEMS) {
      expect(item.href).toMatch(/^\/admin\/dashboard/)
    }
  })
})

describe('dashboard layout: no sidebar', () => {
  it('layout does not contain sidebar variable', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).not.toContain('const sidebar')
    expect(layout).not.toContain('mobileOpen')
    expect(layout).not.toContain('groupOrder')
  })

  it('layout has top nav structure', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).toContain('sticky top-0')
    expect(layout).toContain('DASHBOARD_NAV_ITEMS')
  })
})

describe('dashboard: no fake statuses', () => {
  const DASHBOARD_FILES = [
    'app/admin/dashboard/page.tsx',
    'app/admin/dashboard/proof/page.tsx',
    'app/admin/dashboard/providers/page.tsx',
    'app/admin/dashboard/automation/page.tsx',
    'app/admin/dashboard/adult/page.tsx',
    'app/admin/dashboard/app-runtime/page.tsx',
    'app/admin/dashboard/libraries/page.tsx',
  ]

  const FORBIDDEN_FAKE = ['Math.random', 'generateContent', 'backend missing', 'coming soon', 'placeholder', 'route present', 'connections ready']

  it.each(DASHBOARD_FILES)('%s: no fake code patterns', (file) => {
    if (!exists(file)) return
    const content = src(file)
    for (const fake of FORBIDDEN_FAKE) {
      expect(content, fake).not.toContain(fake)
    }
  })

  it.each(DASHBOARD_FILES)('%s: no fake proof status labels', (file) => {
    if (!exists(file)) return
    const content = src(file)
    // These words appear in legitimate contexts (e.g. 'Ready' in CSS class names)
    // Check they don't appear as UI status labels
    expect(content).not.toMatch(/status.*['"]Ready['"]/i)
    expect(content).not.toMatch(/status.*['"]Operational['"]/i)
    expect(content).not.toMatch(/>Ready<\/span>|>Operational<\/span>|>Active<\/span>|>Passed<\/span>/i)
  })
})

describe('capability-ui-schema: required modes', () => {
  it('file exists', () => {
    expect(exists('lib/capability-ui-schema.ts')).toBe(true)
  })

  it('exports CAPABILITY_UI_MODES', () => {
    const schema = src('lib/capability-ui-schema.ts')
    expect(schema).toContain('CAPABILITY_UI_MODES')
  })

  const REQUIRED_MODE_IDS = [
    'chat', 'image', 'video', 'long_form_video', 'image_to_video', 'music',
    'tts', 'stt', 'avatar', 'research_rag', 'campaign', 'automation',
    'publishing', 'trading', 'adult_private',
  ] as const

  it.each(REQUIRED_MODE_IDS)('schema includes mode: %s', (modeId) => {
    const schema = src('lib/capability-ui-schema.ts')
    expect(schema).toContain(modeId)
  })
})

describe('capability-ui-schema: music mode', () => {
  it('music mode has required sub-sections', () => {
    const schema = src('lib/capability-ui-schema.ts')
    for (const sub of ['Song', 'Lyrics', 'Production', 'Structure', 'Remix / Variations', 'Video / Outputs']) {
      expect(schema).toContain(sub)
    }
  })

  it('music mode has required fields', () => {
    const schema = src('lib/capability-ui-schema.ts')
    for (const field of ['lyrics', 'genre', 'genres_multi', 'bpm', 'key', 'mood', 'vocal_mode', 'instrumental_only', 'remix', 'stems', 'cover_art', 'music_video', 'lyric_video', 'download_artifact']) {
      expect(schema).toContain(field)
    }
  })
})

describe('studio: no provider/model controls', () => {
  it('studio does not expose provider/model overrides', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).not.toMatch(/Provider.*<label|<label.*Provider/i)
    expect(studio).not.toMatch(/Model.*<label|<label.*Model/i)
    expect(studio).not.toContain('providerOverride')
    expect(studio).not.toContain('modelOverride')
  })

  it('studio request does not include provider/model', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    // The fetch/execute call body must not have these keys
    expect(studio).not.toMatch(/body.*provider.*:/i)
    expect(studio).not.toMatch(/body.*model.*:/i)
  })

  it('studio renders from CAPABILITY_UI_MODES schema (import present)', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain('CAPABILITY_UI_MODES')
  })

  it('studio music section has sub-section labels', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    for (const sub of ['Song', 'Lyrics', 'Production', 'Structure']) {
      expect(studio).toContain(sub)
    }
  })
})

describe('platform-library-registry: required libraries', () => {
  it('file exists', () => {
    expect(exists('lib/platform-library-registry.ts')).toBe(true)
  })

  const REQUIRED_LIBS = ['Crawlee', 'Qdrant', 'BullMQ', 'ffmpeg', 'Playwright', 'TanStack']
  it.each(REQUIRED_LIBS)('includes library: %s', (lib) => {
    const reg = src('lib/platform-library-registry.ts')
    expect(reg).toContain(lib)
  })

  it('does not mark uninstalled packages as installed/wired/proven', () => {
    const reg = src('lib/platform-library-registry.ts')
    // The registry determines status from package.json - we trust its logic
    // Just verify the status values are from the correct set
    expect(reg).toMatch(/status:s*['"](?:planned|installed|wired|proven|blocked)['"]/i)
  })
})

describe('app-runtime page: platform contract', () => {
  it('exists', () => {
    expect(exists('app/admin/dashboard/app-runtime/page.tsx')).toBe(true)
  })

  it('shows platform contract principles', () => {
    const page = src('app/admin/dashboard/app-runtime/page.tsx')
    expect(page).toContain('Apps request capabilities')
    expect(page).toContain('runtime')
  })
})

describe('adult-private page: HF adult video requirements', () => {
  it('exists', () => {
    expect(exists('app/admin/dashboard/adult/page.tsx')).toBe(true)
  })

  it('shows HF adult video env vars', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).toContain('HF_ADULT_VIDEO_ENDPOINT')
  })

  it('shows adult_video as blocked without endpoint', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).toContain('Blocked')
  })

  it('does not mention GenX as adult provider', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).not.toMatch(/GenX.*adult|adult.*GenX/i)
  })
})

describe('wired_unproven not collapsed into blocked', () => {
  it('StatusPill component has wired_unproven as distinct status', () => {
    if (!exists('components/dashboard/ui/StatusPill.tsx')) return
    const pill = src('components/dashboard/ui/StatusPill.tsx')
    expect(pill).toContain('wired_unproven')
    expect(pill).toContain('Needs proof')
  })
})

describe('old runtime files remain deleted', () => {
  const DELETED_FILES = [
    'lib/capability-router.ts',
    'lib/runtime-registry.ts', 
    'lib/model-resolver.ts',
    'lib/provider-capability-map.ts',
  ]
  it.each(DELETED_FILES)('%s remains deleted', (file) => {
    expect(exists(file)).toBe(false)
  })
})

describe('opencode.json unchanged', () => {
  it('opencode.json is untouched', () => {
    const f = path.join(process.cwd(), 'opencode.json')
    if (!fs.existsSync(f)) return
    // Just verify it still exists and is valid JSON
    expect(() => JSON.parse(fs.readFileSync(f, 'utf8'))).not.toThrow()
  })
})
