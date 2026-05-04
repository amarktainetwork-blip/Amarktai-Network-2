/**
 * Dashboard Foundation Complete — canonical operator console enforcement
 *
 * Verifies structural requirements for the full dashboard foundation:
 *  - Exactly 11 visible nav items with canonical labels
 *  - No visible Aiva/AIVA copy in canonical dashboard pages
 *  - Repo Workbench: prompt-first, no mandatory Choose Task, links to Settings/vault, no GitHub PAT input
 *  - Apps page: App Cards + detail drawer/panel content
 *  - Agents page: compact category groups and all required agents
 *  - Research page: manual URL input, Firecrawl, backup crawler, scraped storage, opportunity pipeline
 *  - Creative Studio: Asset Mixer and multi-AI workflows
 *  - Memory page: VPS/local storage first, recent learning timeline
 *  - Actions page: approval queue and risk badges
 *  - Diagnostics: is the canonical health/readiness/proof section
 *  - Settings page: setup checklist, tabs, approved provider stack
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function readPage(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('Dashboard Navigation — 11 canonical sections', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'layout.tsx'), 'utf-8')

  it('has exactly 11 NAV_ITEMS entries', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    const navHrefs = navItemBlock?.[0].match(/href:\s*['"][^'"]+['"]/g) ?? []
    expect(navHrefs).toHaveLength(11)
  })

  it('includes all 11 canonical section labels', () => {
    const labels = [
      'Command Center',
      'AmarktAI Assistant',
      'Apps',
      'Agents',
      'Repo Workbench',
      'Research',
      'Creative Studio',
      'Memory',
      'Actions',
      'Diagnostics',
      'Settings',
    ]
    for (const label of labels) {
      expect(layoutSrc, `missing nav label: ${label}`).toContain(label)
    }
  })

  it('does not show Aiva/AIVA in nav labels', () => {
    const navItemBlock = layoutSrc.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\] satisfies/)
    const block = navItemBlock?.[0] ?? ''
    const labelMatches = block.match(/label:\s*['"][^'"]+['"]/g) ?? []
    for (const labelStr of labelMatches) {
      expect(labelStr, 'nav label must not contain Aiva').not.toMatch(/Aiva|AIVA/)
    }
  })
})

// ── No visible Aiva/AIVA in canonical pages ────────────────────────────────────

describe('No visible Aiva/AIVA copy in canonical pages', () => {
  const pagesToCheck = [
    'command-center/page.tsx',
    'research/page.tsx',
    'memory/page.tsx',
    'actions/page.tsx',
    'agents/page.tsx',
    'repo-workbench/page.tsx',
  ]

  for (const relPath of pagesToCheck) {
    it(`${relPath} — no visible "Aiva" or "AIVA" in user-facing text`, () => {
      const src = readPage(relPath)
      // Check JSX text content only — exclude function/variable names and comments
      // Look for Aiva/AIVA in JSX string literals that would be rendered
      const jsxTextMatches = src.match(/>([^<]*(?:Aiva|AIVA)[^<]*)</g) ?? []
      expect(
        jsxTextMatches.filter((m) => !m.includes('//') && !m.includes('*')),
        `${relPath} must not render "Aiva" or "AIVA" to users`,
      ).toHaveLength(0)
    })
  }
})

// ── Repo Workbench ─────────────────────────────────────────────────────────────

describe('Repo Workbench — canonical prompt-first operator flow', () => {
  const src = readPage('repo-workbench/page.tsx')

  it('links to /admin/dashboard/settings for GitHub token setup', () => {
    expect(src).toContain('/admin/dashboard/settings')
  })

  it('has no GitHub PAT input form', () => {
    const hasPatInput = src.includes('type="password"') && src.includes('GitHub PAT')
    expect(hasPatInput).toBe(false)
  })

  it('is prompt-first — has main prompt area', () => {
    expect(src).toMatch(/Tell AmarktAI Assistant|what to (do|change)|prompt/i)
  })

  it('has no mandatory "Choose Task" step', () => {
    // Should not have a required step labelled "Choose Task" or "taskType" as mandatory selector
    expect(src).not.toMatch(/Choose Task.*required|mandatory.*Choose Task/i)
  })

  it('references plan, diff, apply patch, lint, commit, push, PR flow', () => {
    for (const label of ['Plan', 'diff', 'Apply patch', 'lint', 'Commit', 'Push', 'PR']) {
      expect(src, `missing repo flow label: ${label}`).toContain(label)
    }
  })

  it('has logs panel', () => {
    expect(src).toMatch(/[Ll]ogs/)
  })
})

// ── Apps page ──────────────────────────────────────────────────────────────────

describe('Apps page — App Cards + detail drawer/panel', () => {
  const src = readPage('apps/page.tsx')

  it('shows app card structure', () => {
    expect(src).toMatch(/AppCard|app.*card/i)
  })

  it('references detail drawer or detail panel', () => {
    expect(src).toMatch(/detail.*drawer|detail.*panel|drawer.*panel|detail/i)
  })

  it('has health status display', () => {
    expect(src).toMatch(/health|Health/i)
  })
})

// ── Agents page ────────────────────────────────────────────────────────────────

describe('Agents page — compact category groups and required agents', () => {
  const src = readPage('agents/page.tsx')

  it('has compact category group structure', () => {
    expect(src).toMatch(/category|Category/i)
    for (const cat of ['Core', 'Code', 'Research', 'Creative', 'Operations', 'App-specific']) {
      expect(src, `missing category: ${cat}`).toContain(cat)
    }
  })

  it('includes all required agents', () => {
    const requiredAgents = [
      'AmarktAI Assistant Operator',
      'Repo Builder',
      'Repo Auditor',
      'Frontend Designer',
      'Backend Wiring',
      'Researcher Agent',
      'App Discovery',
      'Marketing Agent',
      'Scraper Agent',
      'Media Agent',
      'Voice Agent',
      'Memory / Emotion',
      'Adult-App Agent',
      'Diagnostics Agent',
      'Deployment Agent',
      'Crypto Agent',
    ]
    for (const name of requiredAgents) {
      expect(src, `missing required agent: ${name}`).toContain(name)
    }
  })

  it('does not mark any agent as Working unless proven', () => {
    // Agents should only have valid statuses
    expect(src).not.toMatch(/'Working'/)
  })
})

// ── Research page ──────────────────────────────────────────────────────────────

describe('Research page — URL workbench + opportunity pipeline', () => {
  const src = readPage('research/page.tsx')

  it('has manual URL input', () => {
    expect(src).toMatch(/Manual URL|manual.*url|url.*input/i)
    expect(src).toContain('type="url"')
  })

  it('has Firecrawl as primary', () => {
    expect(src).toContain('Firecrawl')
  })

  it('has backup crawler', () => {
    expect(src).toMatch(/[Bb]ackup [Cc]rawler/)
  })

  it('mentions scraped storage on VPS', () => {
    expect(src).toMatch(/[Ss]craped.*[Ss]torage|[Ss]torage.*VPS/i)
  })

  it('has opportunity pipeline section', () => {
    expect(src).toMatch(/Opportunity Pipeline/i)
  })

  it('uses "Create improved alternative" wording (not "clone")', () => {
    expect(src).toContain('Create improved alternative')
    expect(src).not.toMatch(/\bclone\b/i)
  })

  it('has "Send to Repo Workbench" action', () => {
    expect(src).toContain('Send to Repo Workbench')
  })

  it('does not rely only on Firecrawl (mentions backup)', () => {
    expect(src).toMatch(/does not rely only on Firecrawl|backup/i)
  })
})

// ── Creative Studio ────────────────────────────────────────────────────────────

describe('Creative Studio — Asset Mixer and multi-AI workflows', () => {
  const src = readPage('creative-studio/page.tsx')

  it('includes Asset Mixer tab', () => {
    expect(src).toContain('Asset Mixer')
    expect(src).toContain('asset-mixer')
  })

  it('includes multi-AI workflow descriptions', () => {
    expect(src).toMatch(/text.*image.*video|image.*video|multi.AI|experiment board/i)
  })

  it('has Image, Video, Voice, Music, Avatar, Music Video tabs', () => {
    for (const tab of ['Images', 'Video', 'Voice', 'Music', 'Avatar', 'Music Video']) {
      expect(src, `missing creative studio tab: ${tab}`).toContain(tab)
    }
  })
})

// ── Memory page ────────────────────────────────────────────────────────────────

describe('Memory page — VPS/local storage first + timeline', () => {
  const src = readPage('memory/page.tsx')

  it('says VPS/local storage first', () => {
    expect(src).toMatch(/VPS\/local storage first/i)
  })

  it('mentions no external memory provider required to start', () => {
    expect(src).toMatch(/No external memory provider required to start/i)
  })

  it('includes vector memory ready to wire', () => {
    expect(src).toMatch(/[Vv]ector memory ready to wire/)
  })

  it('has recent learning timeline section', () => {
    expect(src).toMatch(/[Rr]ecent [Ll]earning [Tt]imeline|learning timeline/i)
  })

  it('scopes memory by app, user, and permission', () => {
    expect(src).toMatch(/scoped by app.*user.*permission|app.*user.*permission/i)
  })
})

// ── Actions page ───────────────────────────────────────────────────────────────

describe('Actions page — approval queue and risk badges', () => {
  const src = readPage('actions/page.tsx')

  it('has approval queue', () => {
    expect(src).toMatch(/[Aa]pproval [Qq]ueue|Live Approval Queue/)
  })

  it('has risk level / risk badge', () => {
    expect(src).toMatch(/risk|Risk/i)
  })

  it('has required approval categories', () => {
    for (const cat of ['PR Approval', 'Deploy Approval', 'Adult Access', 'Spend', 'Destructive']) {
      expect(src, `missing action category: ${cat}`).toContain(cat)
    }
  })

  it('has approve and reject or audit log references', () => {
    expect(src).toMatch(/approv|audit/i)
  })
})

// ── Diagnostics ────────────────────────────────────────────────────────────────

describe('Diagnostics — canonical health/readiness/proof section', () => {
  const src = readPage('diagnostics/page.tsx')

  it('has health / readiness section', () => {
    expect(src).toMatch(/[Hh]ealth|[Rr]eadiness/)
  })

  it('shows blockers section', () => {
    expect(src).toMatch(/[Bb]locker/)
  })

  it('references provider status', () => {
    expect(src).toMatch(/[Pp]rovider/)
  })
})

describe('Redirect chain — legacy routes point to canonical targets', () => {
  const redirectsToCheck: [string, string][] = [
    ['readiness/page.tsx', '/admin/dashboard/diagnostics'],
    ['system/page.tsx', '/admin/dashboard/diagnostics'],
    ['monitor/page.tsx', '/admin/dashboard/diagnostics'],
    ['operations/page.tsx', '/admin/dashboard/actions'],
    ['music-studio/page.tsx', '/admin/dashboard/creative-studio'],
    ['video/page.tsx', '/admin/dashboard/creative-studio'],
    ['jobs/page.tsx', '/admin/dashboard/diagnostics'],
    ['models/page.tsx', '/admin/dashboard/settings'],
    ['alerts/page.tsx', '/admin/dashboard/actions'],
    ['aiva/page.tsx', '/admin/dashboard/amarktai-assistant'],
    ['ai-engine/aiva-actions/page.tsx', '/admin/dashboard/actions'],
  ]

  for (const [file, target] of redirectsToCheck) {
    it(`${file} redirects to ${target}`, () => {
      const src = readPage(file)
      expect(src).toContain(target)
    })
  }
})

// ── Settings page ──────────────────────────────────────────────────────────────

describe('Settings page — setup checklist, tabs, approved provider stack', () => {
  const src = readPage('settings/page.tsx')

  it('has setup checklist', () => {
    expect(src).toMatch(/[Ss]etup checklist/)
  })

  it('has all 8 required tabs', () => {
    const tabs = [
      'AI Stack',
      'Tools',
      'Scraping & Storage',
      'Memory',
      'Voice & Media',
      'Adult & Safety',
      'Admin & Security',
      'Diagnostics',
    ]
    for (const tab of tabs) {
      expect(src, `missing settings tab: ${tab}`).toContain(tab)
    }
  })

  it('includes approved provider labels', () => {
    const approvedProviders = [
      'GenX',
      'Gemini',
      'Groq',
      'Together AI',
      'xAI',
      'Hugging Face',
      'GitHub',
      'Webdock',
      'Firecrawl',
    ]
    for (const provider of approvedProviders) {
      expect(src, `missing approved provider: ${provider}`).toContain(provider)
    }
  })

  it('does not contain "OpenAI Direct" as a visible label', () => {
    // "OpenAI Direct" has been renamed to "Direct OpenAI API" in the advanced providers section
    // to comply with the forbidden visible language policy
    expect(src).not.toContain('OpenAI Direct')
  })

  it('includes adult & safety configuration', () => {
    expect(src).toMatch(/[Aa]dult.*[Ss]ection|AdultSection|adult.*policy/i)
  })

  it('includes voice & media configuration', () => {
    expect(src).toMatch(/[Vv]oice.*[Ss]ettings|AivaVoiceSection|[Vv]oice.*[Pp]rovider/i)
  })
})
