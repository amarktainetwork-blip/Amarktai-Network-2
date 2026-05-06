import { describe, it, expect } from 'vitest'
import { resolveModelAlias } from '@/lib/genx-model-resolver'
import { APPROVED_WORKBENCH_MODELS, APPROVED_ASSISTANT_MODELS } from '@/lib/approved-ai-catalog'
import { GENX_TEXT_MODELS, GENX_IMAGE_MODELS } from '@/lib/genx-client'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { OPERATOR_AGENTS } from '@/lib/agent-registry'

describe('PR58 — restore playground models, fix auto:* aliases, expand nav and agents', () => {
  it('resolveModelAlias never returns auto:coding-best', () => {
    const result = resolveModelAlias({ provider: 'genx', selectedModelId: 'auto:coding-best' })
    expect(result).not.toBe('auto:coding-best')
    expect(result).not.toMatch(/^auto:/)
  })

  it('resolveModelAlias returns a real model ID for auto:coding-balanced', () => {
    const result = resolveModelAlias({ provider: 'genx', selectedModelId: 'auto:coding-balanced' })
    expect(result).not.toMatch(/^auto:/)
    expect(result.length).toBeGreaterThan(0)
  })

  it('resolveModelAlias returns a real model ID for auto:assistant', () => {
    const result = resolveModelAlias({ provider: 'genx', selectedModelId: 'auto:assistant' })
    expect(result).not.toMatch(/^auto:/)
    expect(result.length).toBeGreaterThan(0)
  })

  it('resolveModelAlias returns the model as-is when it is not an alias', () => {
    const result = resolveModelAlias({ provider: 'genx', selectedModelId: 'gpt-5.3-codex' })
    expect(result).toBe('gpt-5.3-codex')
  })

  it('resolveModelAlias never returns any string starting with auto:', () => {
    const aliases = ['auto:coding-best', 'auto:coding-balanced', 'auto:assistant', 'auto:anything']
    for (const alias of aliases) {
      const result = resolveModelAlias({ provider: 'genx', selectedModelId: alias })
      expect(result).not.toMatch(/^auto:/)
    }
  })

  it('APPROVED_WORKBENCH_MODELS contains no auto:* IDs', () => {
    for (const model of APPROVED_WORKBENCH_MODELS) {
      expect(model.id).not.toMatch(/^auto:/)
    }
  })

  it('APPROVED_ASSISTANT_MODELS contains no auto:* IDs', () => {
    for (const model of APPROVED_ASSISTANT_MODELS) {
      expect(model.id).not.toMatch(/^auto:/)
    }
  })

  it('GenX text models list is populated', () => {
    expect(GENX_TEXT_MODELS.length).toBeGreaterThan(0)
  })

  it('GenX image models list is populated', () => {
    expect(GENX_IMAGE_MODELS.length).toBeGreaterThan(0)
  })

  it('Dashboard nav includes playground', () => {
    const ids = DASHBOARD_NAV_ITEMS.map((item) => item.id)
    expect(ids).toContain('playground')
  })

  it('Dashboard nav includes creative-studio', () => {
    const ids = DASHBOARD_NAV_ITEMS.map((item) => item.id)
    expect(ids).toContain('creative-studio')
  })

  it('Canonical agents list has all 21 required agents', () => {
    const requiredNames = [
      'Coding Agent',
      'Code Review Agent',
      'Repo Audit Agent',
      'Deployment Agent',
      'Research Agent',
      'Scraping Agent',
      'Creative Agent',
      'Image Agent',
      'Video Agent',
      'Music/Audio Agent',
      'Voice Agent',
      'Avatar/Talking Video Agent',
      'Marketing Agent',
      'App Operator Agent',
      'System/VPS Agent',
      'Cost/Budget Agent',
      'Safety/Policy Agent',
      'Adult Policy Agent',
      'Memory/Learning Agent',
      'QA/Test Agent',
      'Product/UX Agent',
    ]
    const agentNames = OPERATOR_AGENTS.map((a) => a.name)
    for (const name of requiredNames) {
      expect(agentNames, `Missing agent: ${name}`).toContain(name)
    }
    expect(OPERATOR_AGENTS.length).toBeGreaterThanOrEqual(21)
  })
})
