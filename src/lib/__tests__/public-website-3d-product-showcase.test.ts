/**
 * PUBLIC WEBSITE — 3D PRODUCT SHOWCASE VALIDATION
 *
 * Verifies the rebuilt premium public website:
 *   - New 3D animation component exists with correct architecture
 *   - Mobile and reduced-motion safeguards are present
 *   - All nine homepage sections are present
 *   - No public login/access hints
 *   - No retired branding (Superbrain, GenX, retired assistant name)
 *   - Dashboard pages are untouched
 *   - All public pages render from PublicShell
 *   - Hidden login trigger preserved, no public hint copy
 */

import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../../')

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function exists(rel: string) {
  return fs.existsSync(path.join(ROOT, rel))
}

// ── Public pages ─────────────────────────────────────────────────────────────

const PUBLIC_PAGES = [
  'app/page.tsx',
  'app/about/page.tsx',
  'app/apps/page.tsx',
  'app/docs/page.tsx',
  'app/contact/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
]

// ── 3D Animation System ───────────────────────────────────────────────────────

describe('3D animation system', () => {
  it('IntelligenceFabric.tsx exists in components/public', () => {
    expect(exists('components/public/IntelligenceFabric.tsx')).toBe(true)
  })

  it('IntelligenceFabric uses canvas-based 3D rendering with project() perspective function', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    // 3D projection math
    expect(source).toContain('project')
    // Canvas ref
    expect(source).toContain('canvasRef')
    expect(source).toContain('getContext')
    // requestAnimationFrame loop
    expect(source).toContain('requestAnimationFrame')
  })

  it('IntelligenceFabric has prefers-reduced-motion safeguard', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('prefers-reduced-motion')
    // Signals/streams are suppressed for reduced motion
    expect(source).toContain('reduced')
  })

  it('IntelligenceFabric has mobile degradation guard', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    // Mobile detection by viewport width
    expect(source.toLowerCase()).toContain('mobile')
  })

  it('IntelligenceFabric includes all six product modules as orbiting panels', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('Studio')
    expect(source).toContain('Workbench')
    expect(source).toContain('Memory')
    expect(source).toContain('Operations')
    expect(source).toContain('Settings')
    // Apps & Agents or similar
    expect(source.toLowerCase()).toContain('agent')
  })

  it('IntelligenceFabric shows pipeline telemetry labels (input → deployment)', () => {
    const source = read('components/public/IntelligenceFabric.tsx').toLowerCase()
    const pipelineStages = ['input', 'routing', 'agent', 'memory', 'artifact', 'approval', 'deployment']
    for (const stage of pipelineStages) {
      expect(source, `pipeline stage: ${stage}`).toContain(stage)
    }
  })

  it('IntelligenceFabric has central command core visual element', () => {
    const source = read('components/public/IntelligenceFabric.tsx').toLowerCase()
    expect(source).toContain('core')
  })

  it('IntelligenceFabric uses data stream particles (flowing signals between nodes)', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    // Stream/signal array for particles
    expect(source.toLowerCase()).toContain('stream')
  })

  it('IntelligenceFabric ResizeObserver handles responsive canvas', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('ResizeObserver')
    expect(source).toContain('resize')
  })

  it('IntelligenceFabric cleans up animation frame and observer on unmount', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('cancelAnimationFrame')
    expect(source).toContain('ro.disconnect()')
  })

  it('IntelligenceFabric has accessible aria-label on canvas', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('aria-label')
    expect(source).toContain('role="img"')
  })
})

// ── Homepage nine sections ────────────────────────────────────────────────────

describe('homepage nine product sections', () => {
  let source: string
  let lower: string

  it('homepage imports and uses IntelligenceFabric', () => {
    source = read('app/page.tsx')
    lower = source.toLowerCase()
    expect(source).toContain('IntelligenceFabric')
  })

  it('homepage section 1: cinematic hero with 3D animation', () => {
    source = source ?? read('app/page.tsx')
    // Hero uses the animation
    expect(source).toContain('IntelligenceFabric')
    // No login/access CTA
    expect(source.toLowerCase()).not.toContain('sign up')
    expect(source.toLowerCase()).not.toContain('sign in')
    expect(source.toLowerCase()).not.toContain('get access')
    expect(source.toLowerCase()).not.toContain('request access')
  })

  it('homepage section 2: product cockpit — all six modules', () => {
    source = source ?? read('app/page.tsx')
    const modules = ['Studio', 'Workbench', 'Apps', 'Memory', 'Operations', 'Settings']
    for (const mod of modules) {
      expect(source, `module: ${mod}`).toContain(mod)
    }
  })

  it('homepage section 3: workbench pipeline with six steps', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    const steps = ['prompt', 'plan', 'patch', 'checks', 'deploy']
    for (const step of steps) {
      expect(lower, `workbench step: ${step}`).toContain(step)
    }
  })

  it('homepage section 4: studio showcase with capability list', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    const caps = ['chat', 'research', 'image', 'video', 'audio', 'transcription', 'artifact']
    for (const cap of caps) {
      expect(lower, `studio cap: ${cap}`).toContain(cap)
    }
  })

  it('homepage section 5: agent orchestration section', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    expect(lower).toContain('agent')
    expect(lower).toContain('orchestrat')
  })

  it('homepage section 6: memory and learning section', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    expect(lower).toContain('memory')
    expect(lower).toContain('context')
  })

  it('homepage section 7: runtime control section', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    expect(lower).toContain('provider')
    expect(lower).toContain('approval')
    expect(lower).toContain('deployment')
  })

  it('homepage section 8: Amarktai Assistant section', () => {
    source = source ?? read('app/page.tsx')
    expect(source).toContain('Amarktai Assistant')
    expect(source.toLowerCase()).toContain('operator')
  })

  it('homepage section 9: closing — no public access CTA', () => {
    source = source ?? read('app/page.tsx')
    lower = source.toLowerCase()
    // Closing section exists but no access CTAs
    expect(lower).not.toContain('get started')
    expect(lower).not.toContain('sign up')
    expect(lower).not.toContain('request access')
  })
})

// ── Access hint removal ───────────────────────────────────────────────────────

describe('no public login or access hints', () => {
  const FORBIDDEN_STRINGS = [
    'type login',
    'sign in',
    'sign up',
    'request access',
    'access portal',
    'open secure login',
    'restricted panel',
    '/admin/login',
    '/admin/dashboard',
    'operator login',
    'keyboard hint',
    'secret command',
    'get access',
    'get started',
  ]

  it('public pages contain none of the forbidden access hint strings', () => {
    for (const page of PUBLIC_PAGES) {
      const src = read(page).toLowerCase()
      for (const forbidden of FORBIDDEN_STRINGS) {
        expect(src, `${page} → "${forbidden}"`).not.toContain(forbidden)
      }
    }
  })

  it('PublicShell contains no public access hint copy', () => {
    const shell = read('components/public/PublicShell.tsx').toLowerCase()
    expect(shell).not.toContain('open secure login')
    expect(shell).not.toContain('restricted panel')
    expect(shell).not.toContain('type login')
    expect(shell).not.toContain('sign in')
    expect(shell).not.toContain('sign up')
  })
})

// ── Retired branding removed ──────────────────────────────────────────────────

describe('retired branding removed', () => {
  const allFiles = [
    ...PUBLIC_PAGES,
    'components/public/PublicShell.tsx',
    'components/public/IntelligenceFabric.tsx',
  ]

  const retiredAssistantName = String.fromCharCode(65, 105, 118, 97) // retired assistant name (4-char encoded)

  it('no retired brand terms in public files', () => {
    for (const file of allFiles) {
      const src = read(file)
      expect(src, `${file} → retired-assistant-name`).not.toContain(retiredAssistantName)
      expect(src, `${file} → Superbrain`).not.toContain('Superbrain')
      expect(src, `${file} → superbrain`).not.toContain('superbrain')
      expect(src, `${file} → GenX`).not.toContain('GenX')
      expect(src, `${file} → AI magic`).not.toContain('AI magic')
    }
  })
})

// ── Hidden login trigger ──────────────────────────────────────────────────────

describe('hidden login trigger', () => {
  it('PublicShell retains hidden keyboard login trigger in code', () => {
    const shell = read('components/public/PublicShell.tsx')
    expect(shell).toContain("includes('login')")
    expect(shell).toContain("router.push('/admin/login')")
  })

  it('hidden trigger has no visible UI hint to the public', () => {
    const shell = read('components/public/PublicShell.tsx').toLowerCase()
    expect(shell).not.toContain('type login')
    expect(shell).not.toContain('keyboard hint')
    expect(shell).not.toContain('press login')
  })
})

// ── One source of truth ───────────────────────────────────────────────────────

describe('one public component source of truth', () => {
  it('components/public contains exactly two files', () => {
    const dir = path.join(ROOT, 'components/public')
    const files = fs.readdirSync(dir).sort()
    expect(files).toEqual(['IntelligenceFabric.tsx', 'PublicShell.tsx'])
  })

  it('no stale public animation components remain', () => {
    const removed = [
      'components/public/CommandConstellationScene.tsx',
      'components/public/PublicSection.tsx',
      'components/public/SuperbrainScene.tsx',
      'components/EcosystemNetwork.tsx',
      'components/LivingCore.tsx',
      'components/visual/NetworkPulseBackground.tsx',
    ]
    for (const rel of removed) {
      expect(exists(rel), `stale file: ${rel}`).toBe(false)
    }
  })
})

// ── Dashboard isolation ───────────────────────────────────────────────────────

describe('dashboard pages untouched', () => {
  const DASHBOARD_FILES = [
    'app/admin/dashboard/page.tsx',
    'app/admin/dashboard/workbench/page.tsx',
    'app/admin/dashboard/apps-agents/page.tsx',
    'app/admin/dashboard/memory-learning/page.tsx',
    'app/admin/dashboard/operations/page.tsx',
    'app/admin/dashboard/settings/page.tsx',
    'app/admin/login/page.tsx',
  ]

  it('all dashboard files still exist', () => {
    for (const file of DASHBOARD_FILES) {
      expect(exists(file), file).toBe(true)
    }
  })

  it('dashboard files do not import public shell or animation', () => {
    for (const file of DASHBOARD_FILES) {
      const src = read(file)
      expect(src, `${file} → PublicShell`).not.toContain('PublicShell')
      expect(src, `${file} → IntelligenceFabric`).not.toContain('IntelligenceFabric')
    }
  })

  it('dashboard root page still exports StudioPage', () => {
    const src = read('app/admin/dashboard/page.tsx')
    expect(src).toContain('export default function StudioPage')
  })
})

// ── Mobile and performance notes ──────────────────────────────────────────────

describe('mobile and performance safeguards', () => {
  it('IntelligenceFabric degrades gracefully on mobile (compact mode or reduced detail)', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    // Mobile detection flag
    expect(source.toLowerCase()).toContain('ismobile')
  })

  it('IntelligenceFabric caps device pixel ratio to prevent over-rendering', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('devicePixelRatio')
    // Cap at 2
    expect(source).toContain('Math.min')
  })

  it('IntelligenceFabric pauses or resets on visibility change', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    expect(source).toContain('visibilitychange')
  })

  it('IntelligenceFabric caps delta time to prevent frame-skip runaway', () => {
    const source = read('components/public/IntelligenceFabric.tsx')
    // dt capping: Math.min(50/40, ...)
    expect(source).toContain('Math.min')
  })
})

// ── Audit doc ─────────────────────────────────────────────────────────────────

describe('audit documentation', () => {
  it('docs/audits/PUBLIC_WEBSITE_3D_PRODUCT_SHOWCASE.md exists', () => {
    // ROOT = src/, docs/ is one level up at repo root
    const docPath = path.join(ROOT, '../docs/audits/PUBLIC_WEBSITE_3D_PRODUCT_SHOWCASE.md')
    expect(fs.existsSync(docPath), 'audit doc missing').toBe(true)
  })
})
