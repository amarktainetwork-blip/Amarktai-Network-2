import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const root = process.cwd()
function src(rel: string) { return fs.readFileSync(path.join(root, 'src', rel), 'utf8') }
function exists(rel: string) { return fs.existsSync(path.join(root, 'src', rel)) }

// ── Nav: 13 required sections ─────────────────────────────────────────────────

describe('dashboard nav: 13 required sections', () => {
  const REQUIRED_LABELS = [
    'Command Center',
    'Studio',
    'Capabilities',
    'Providers & Models',
    'Proof & Tests',
    'Assets & Jobs',
    'Memory & Knowledge',
    'Automation',
    'Adult Private',
    'App Runtime',
    'Libraries & Integrations',
    'Settings',
    'System',
  ] as const

  it('has exactly 13 nav items', () => {
    expect(DASHBOARD_NAV_ITEMS).toHaveLength(13)
  })

  it.each(REQUIRED_LABELS)('includes nav label: %s', (label) => {
    expect(DASHBOARD_NAV_ITEMS.map((i) => i.label)).toContain(label)
  })

  it('all nav hrefs start with /admin/dashboard', () => {
    for (const item of DASHBOARD_NAV_ITEMS) {
      expect(item.href).toMatch(/^\/admin\/dashboard/)
    }
  })

  it('has the required href entries', () => {
    const hrefs = DASHBOARD_NAV_ITEMS.map((i) => i.href)
    expect(hrefs).toContain('/admin/dashboard')
    expect(hrefs).toContain('/admin/dashboard/studio')
    expect(hrefs).toContain('/admin/dashboard/providers')
    expect(hrefs).toContain('/admin/dashboard/proof')
    expect(hrefs).toContain('/admin/dashboard/automation')
    expect(hrefs).toContain('/admin/dashboard/adult')
    expect(hrefs).toContain('/admin/dashboard/app-runtime')
    expect(hrefs).toContain('/admin/dashboard/libraries')
  })
})

// ── Layout: no sidebar ────────────────────────────────────────────────────────

describe('dashboard layout: top nav, no sidebar', () => {
  it('layout does not contain old sidebar variable', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).not.toContain('const sidebar')
  })

  it('layout does not use mobileOpen state', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).not.toContain('mobileOpen')
  })

  it('layout does not use groupOrder', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).not.toContain('groupOrder')
  })

  it('layout has sticky top-0 nav header', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).toContain('sticky top-0')
    expect(layout).toContain('DASHBOARD_NAV_ITEMS')
  })

  it('layout keeps voice assistant integration', () => {
    const layout = src('app/admin/dashboard/layout.tsx')
    expect(layout).toContain('data-dashboard-voice-assistant')
    expect(layout).toContain('TTS {voiceStatusLabel')
    expect(layout).toContain('Realtime voice')
    expect(layout).toContain('/api/admin/system/capabilities')
    expect(layout).not.toContain("fetch('/api/realtime/session', { method: 'POST' })")
    expect(layout).not.toContain('/api/realtime/session')
  })
})

// ── Dashboard: no fake statuses ───────────────────────────────────────────────

describe('dashboard: no fake code or status patterns', () => {
  const DASHBOARD_FILES = [
    'app/admin/dashboard/page.tsx',
    'app/admin/dashboard/proof/page.tsx',
    'app/admin/dashboard/providers/page.tsx',
    'app/admin/dashboard/automation/page.tsx',
    'app/admin/dashboard/adult/page.tsx',
    'app/admin/dashboard/app-runtime/page.tsx',
    'app/admin/dashboard/libraries/page.tsx',
  ] as const

  const FORBIDDEN_CODE = [
    'Math.random',
    'generateContent',
    'backend missing',
    'coming soon',
    'placeholder',
    'route present',
    'connections ready',
  ] as const

  it.each(DASHBOARD_FILES)('%s: no fake code patterns', (file) => {
    if (!exists(file)) return
    const content = src(file)
    for (const fake of FORBIDDEN_CODE) {
      expect(content, `"${fake}" in ${file}`).not.toContain(fake)
    }
  })

  it.each(DASHBOARD_FILES)('%s: no fake proof label elements', (file) => {
    if (!exists(file)) return
    const content = src(file)
    // Fake labels as text content inside elements, not in code/class strings
    expect(content).not.toMatch(/>Ready<\/span>|>Operational<\/span>|>Active<\/span>|>Passed<\/span>/i)
  })
})

// ── Capability UI schema ───────────────────────────────────────────────────────

describe('capability-ui-schema: structure', () => {
  it('file exists at lib/capability-ui-schema.ts', () => {
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

// ── Music mode: sub-sections and fields ───────────────────────────────────────

describe('capability-ui-schema: music mode completeness', () => {
  it('music mode has all required sub-sections', () => {
    const schema = src('lib/capability-ui-schema.ts')
    for (const sub of ['Song', 'Lyrics', 'Production', 'Structure', 'Remix / Variations', 'Video / Outputs']) {
      expect(schema).toContain(sub)
    }
  })

  it('music mode has required fields', () => {
    const schema = src('lib/capability-ui-schema.ts')
    for (const field of [
      'lyrics', 'genre', 'genres_multi', 'bpm', 'key', 'mood',
      'vocal_mode', 'instrumental_only', 'remix', 'stems',
      'cover_art', 'music_video', 'lyric_video', 'download_artifact',
    ]) {
      expect(schema).toContain(field)
    }
  })
})

// ── Studio: schema-driven, no hardcoded mode list ────────────────────────────

describe('studio: schema-driven modes, no hardcoded TASKS', () => {
  it('studio mode ribbon uses CAPABILITY_UI_MODES, not a hardcoded TASKS array', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain('CAPABILITY_UI_MODES')
    expect(studio).toContain('ALL_MODES')
    // Must NOT have old hardcoded structures
    expect(studio).not.toContain('type TaskId =')
    expect(studio).not.toContain('const TASKS')
    expect(studio).not.toContain('StudioTask')
  })

  it('studio does not use side panel layout', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).not.toContain('xl:grid-cols-[minmax(0,1fr)_320px]')
    // No <aside className= pattern (side result panel)
    expect(studio).not.toMatch(/<aside\s+className=/)
  })

  it('studio does not expose provider/model selectors or overrides', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).not.toMatch(/Provider\s*<\/label>|<label.*Provider/i)
    expect(studio).not.toMatch(/Model\s*<\/label>|<label.*Model/i)
    expect(studio).not.toContain('providerOverride')
    expect(studio).not.toContain('modelOverride')
  })

  it('studio request payload does not include provider/model/providerOverride/modelOverride', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    // Execution payload must NOT include these keys
    expect(studio).not.toMatch(/provider:\s*selectedMode|providerOverride:|modelOverride:|["']provider["']:\s*(?!selectedMode)/i)
  })

  it('studio result section shows runtime-selected before execution', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain('Selected by runtime after execution')
  })

  it('studio music section renders sub-section tabs from schema', () => {
    const studio = src('app/admin/dashboard/studio/page.tsx')
    for (const sub of ['Song', 'Lyrics', 'Production', 'Structure', 'Remix', 'Video / Outputs']) {
      expect(studio).toContain(sub)
    }
  })

  it('studio exposes all 15 modes from CAPABILITY_UI_MODES at runtime', async () => {
    const { CAPABILITY_UI_MODES } = await import('@/lib/capability-ui-schema')
    const REQUIRED = ['chat', 'image', 'video', 'long_form_video', 'image_to_video', 'music', 'tts', 'stt', 'avatar', 'research_rag', 'campaign', 'automation', 'publishing', 'trading', 'adult_private']
    for (const modeId of REQUIRED) {
      const found = CAPABILITY_UI_MODES.find((m) => m.id === modeId)
      expect(found, `mode ${modeId} missing from CAPABILITY_UI_MODES`).toBeDefined()
    }
    expect(CAPABILITY_UI_MODES.length).toBeGreaterThanOrEqual(15)
  })
})

// ── Platform library registry ─────────────────────────────────────────────────

describe('platform-library-registry', () => {
  it('file exists', () => {
    expect(exists('lib/platform-library-registry.ts')).toBe(true)
  })

  const REQUIRED_LIBS = ['Crawlee', 'Qdrant', 'BullMQ', 'ffmpeg', 'Playwright', 'TanStack'] as const
  it.each(REQUIRED_LIBS)('includes library name: %s', (lib) => {
    const reg = src('lib/platform-library-registry.ts')
    expect(reg).toContain(lib)
  })

  it('status values are from the valid set', () => {
    const reg = src('lib/platform-library-registry.ts')
    expect(reg).toMatch(/status:\s*['"](?:planned|installed|wired|proven|blocked)['"]/i)
  })

  it('does not mark uninstalled packages as installed', async () => {
    const { PLATFORM_LIBRARIES } = await import('@/lib/platform-library-registry')
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    const allPkgs = { ...pkg.dependencies, ...pkg.devDependencies }
    for (const lib of PLATFORM_LIBRARIES) {
      if (lib.installedPackageName && !allPkgs[lib.installedPackageName]) {
        // If not in package.json, must be 'planned' or 'blocked'
        expect(['planned', 'blocked']).toContain(lib.status)
      }
    }
  })
})

// ── App Runtime page ──────────────────────────────────────────────────────────

describe('app-runtime page', () => {
  it('exists', () => {
    expect(exists('app/admin/dashboard/app-runtime/page.tsx')).toBe(true)
  })

  it('shows platform contract principles', () => {
    const page = src('app/admin/dashboard/app-runtime/page.tsx')
    expect(page).toContain('Apps request capabilities')
    expect(page).toContain('runtime')
    expect(page).toContain('music_generation')
  })

  it('shows runtime-selected in example (not provider in request)', () => {
    const page = src('app/admin/dashboard/app-runtime/page.tsx')
    expect(page).toContain('runtime-selected')
  })
})

// ── Adult Private page ────────────────────────────────────────────────────────

describe('adult-private page', () => {
  it('exists', () => {
    expect(exists('app/admin/dashboard/adult/page.tsx')).toBe(true)
  })

  it('shows HF adult video env vars', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).toContain('HF_ADULT_VIDEO_ENDPOINT')
    expect(page).toContain('HF_ADULT_VIDEO_ENDPOINT_FALLBACK')
    expect(page).toContain('HF_ADULT_VIDEO_MODEL')
    expect(page).toContain('HF_ADULT_VIDEO_MODEL_FALLBACK')
  })

  it('shows Blocked status for adult_video without endpoint', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).toContain('Blocked')
  })

  it('does not mention GenX as adult provider', () => {
    const page = src('app/admin/dashboard/adult/page.tsx')
    expect(page).not.toMatch(/GenX.*adult|adult.*GenX/i)
  })
})

// ── wired_unproven distinct from blocked ──────────────────────────────────────

describe('wired_unproven is distinct from blocked', () => {
  it('StatusPill has wired_unproven as a distinct status variant', () => {
    if (!exists('components/dashboard/ui/StatusPill.tsx')) return
    const pill = src('components/dashboard/ui/StatusPill.tsx')
    expect(pill).toContain('wired_unproven')
    expect(pill).toContain('Needs proof')
  })
})

// ── Old runtime files remain deleted ─────────────────────────────────────────

describe('deleted runtime files remain gone', () => {
  const DELETED = [
    'lib/capability-router.ts',
    'lib/runtime-registry.ts',
    'lib/model-resolver.ts',
    'lib/provider-capability-map.ts',
  ] as const

  it.each(DELETED)('%s is still deleted', (file) => {
    expect(exists(file)).toBe(false)
  })
})

// ── Capabilities page: full contract columns ──────────────────────────────────

describe('capabilities page: required columns', () => {
  it('includes required config column', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('Required config')
  })

  it('includes artifact type column', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('Artifact type')
  })

  it('includes job type column', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('Job type')
  })

  it('uses canonical capability truth', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('getCapabilityRuntimeTruth')
  })
})

// ── Library registry: complete capability mappings ────────────────────────────

describe('platform-library-registry: complete capability mappings', () => {
  it('Crawlee includes campaigns and brand_memory', async () => {
    const { PLATFORM_LIBRARIES } = await import('@/lib/platform-library-registry')
    const lib = PLATFORM_LIBRARIES.find((l) => l.id === 'crawlee')
    expect(lib?.usedByCapabilities).toContain('campaigns')
    expect(lib?.usedByCapabilities).toContain('brand_memory')
  })

  it('Qdrant includes memory and brand_memory', async () => {
    const { PLATFORM_LIBRARIES } = await import('@/lib/platform-library-registry')
    const lib = PLATFORM_LIBRARIES.find((l) => l.id === 'qdrant')
    expect(lib?.usedByCapabilities).toContain('memory')
    expect(lib?.usedByCapabilities).toContain('brand_memory')
  })

  it('BullMQ includes long_form_video and social_publishing', async () => {
    const { PLATFORM_LIBRARIES } = await import('@/lib/platform-library-registry')
    const lib = PLATFORM_LIBRARIES.find((l) => l.id === 'bullmq_flows')
    expect(lib?.usedByCapabilities).toContain('long_form_video')
    expect(lib?.usedByCapabilities).toContain('social_publishing')
  })

  it('TanStack Table includes capabilities and providers', async () => {
    const { PLATFORM_LIBRARIES } = await import('@/lib/platform-library-registry')
    const lib = PLATFORM_LIBRARIES.find((l) => l.id === 'tanstack_table')
    expect(lib?.usedByCapabilities).toContain('capabilities')
    expect(lib?.usedByCapabilities).toContain('providers')
  })
})

// ── Music schema: all required fields ────────────────────────────────────────

describe('music schema: all required fields present', () => {
  const REQUIRED_MUSIC_FIELDS = [
    'subgenre', 'era_decade',
    'use_my_lyrics', 'singer_gender',
    'tempo_feel', 'beat_style', 'drum_pattern', 'bass_style', 'instruments',
    'synth_style', 'guitar_style', 'piano_style', 'orchestral', 'mixing_style',
    'mastering', 'reference_vibe',
    'structure_pre_chorus', 'structure_breakdown', 'structure_solo', 'custom_structure',
    'acoustic_version', 'dance_version', 'cinematic_version', 'radio_edit',
    'extended_mix', 'instrumental_version', 'regenerate_section', 'variation_count',
    'waveform_preview', 'music_video_concept', 'music_video_aspect', 'music_video_scenes', 'license_pdf',
  ] as const

  it.each(REQUIRED_MUSIC_FIELDS)('music schema contains field: %s', (fieldId) => {
    const schema = src('lib/capability-ui-schema.ts')
    expect(schema).toContain(fieldId)
  })
})

// ── Dashboard: Unproven removed, Needs proof used ─────────────────────────────

describe('command center: correct status labels', () => {
  it('command center does not use Unproven as user-facing label', () => {
    const page = src('app/admin/dashboard/page.tsx')
    expect(page).not.toMatch(/>Unproven<|label.*Unproven|Unproven.*label/i)
    expect(page).not.toContain('"Unproven"')
  })

  it('command center uses Needs proof for wired_unproven', () => {
    const page = src('app/admin/dashboard/page.tsx')
    expect(page).toContain('Needs proof')
  })
})

// ── Apps route deleted ────────────────────────────────────────────────────────

describe('apps route: deleted', () => {
  it('apps/page.tsx is deleted (orphaned from nav)', () => {
    expect(exists('app/admin/dashboard/apps/page.tsx')).toBe(false)
  })
})

// ── opencode.json unchanged ───────────────────────────────────────────────────

describe('opencode.json', () => {
  it('is valid JSON if present', () => {
    const f = path.join(root, 'opencode.json')
    if (!fs.existsSync(f)) return
    expect(() => JSON.parse(fs.readFileSync(f, 'utf8'))).not.toThrow()
  })
})
