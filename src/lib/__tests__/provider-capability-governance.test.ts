import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  EXTERNAL_APP_ONBOARDING_LABEL,
  GOVERNED_MODELS,
  LIVE_GENX_MODEL_COUNT,
  ROOT_WORKSPACE,
  getCapabilityGovernance,
  getCapabilityGovernanceMatrix,
  getModelsForCapability,
  getWorkbenchGovernanceModels,
  validateCapabilitySelection,
} from '@/lib/provider-capability-governance'
import { routeLiveModel } from '@/lib/live-ai-routing'

const ROOT = path.resolve(__dirname, '../../')

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('provider capability governance', () => {
  it('defines the root admin workspace and keeps Add App external-only', () => {
    expect(ROOT_WORKSPACE).toMatchObject({
      appSlug: 'amarktai-network',
      type: 'root_admin_app',
      access: 'full',
      providers: 'approved_configured_providers',
      models: 'approved_configured_models',
      tools: 'approved_configured_tools',
      agents: 'backend_orchestration_only',
    })
    expect(ROOT_WORKSPACE.message).toContain('approved by the provider mesh')
    expect(EXTERNAL_APP_ONBOARDING_LABEL).toBe('Add external managed app')
    expect(read('app/admin/dashboard/apps-agents/page.tsx')).toContain("redirect('/admin/dashboard/workspace')")
    expect(read('app/api/admin/app-ai-package/route.ts')).toContain('does not need to be added as an external app')
  })

  it('pins the GenX model catalog and fixes Seedance 2 naming drift', () => {
    const genxModels = GOVERNED_MODELS.filter((model) => model.provider === 'genx')
    expect(LIVE_GENX_MODEL_COUNT).toBe(8)
    expect(genxModels).toHaveLength(8)
    expect(read('lib/genx-client.ts')).not.toContain('seedance-2.0')
  })

  it('classifies Lyria as music and routes Studio music through music_generation, not voice_tts', () => {
    const musicModels = getModelsForCapability('music_generation')
    expect(musicModels.map((model) => model.modelId)).toEqual(expect.arrayContaining(['lyria-3-pro-preview']))
    expect(musicModels.every((model) => model.capabilities.includes('music_generation'))).toBe(true)
    expect(getCapabilityGovernance('music_generation')).toMatchObject({
      route: '/api/admin/music-studio',
      routeExists: true,
      polling: true,
      artifacts: true,
    })
    const studioExecute = read('app/api/admin/studio/execute/route.ts')
    expect(studioExecute).toContain("if (tab === 'Music / Audio') return 'music_generation'")
    expect(studioExecute).not.toContain("if (tab === 'Music / Audio') return 'voice_tts'")
  })

  it('filters Workbench to coding/reasoning models and rejects media mismatches', () => {
    const workbenchModels = getWorkbenchGovernanceModels()
    expect(workbenchModels.length).toBeGreaterThan(0)
    expect(workbenchModels.every((model) => model.capabilities.includes('coding') || model.capabilities.includes('reasoning'))).toBe(true)
    expect(workbenchModels.every((model) => !model.capabilities.includes('image_generation') && !model.capabilities.includes('video_generation') && !model.capabilities.includes('tts'))).toBe(true)

    const invalid = validateCapabilitySelection({ provider: 'genx', modelId: 'gpt-image-2', capability: 'coding' })
    expect(invalid.allowed).toBe(false)
    expect(invalid.blockers).toContain('missing_route')
  })

  it('rejects invalid manual model/capability combinations in live routing', () => {
    const imageForCoding = routeLiveModel({ capability: 'coding', selectedProvider: 'genx', selectedModel: 'gpt-image-2' })
    expect(imageForCoding.blockedReason).toContain('No approved wired model supports this capability')

    const textForImage = routeLiveModel({ capability: 'image_generation', selectedProvider: 'genx', selectedModel: 'gpt-5.5' })
    expect(textForImage.blockedReason).toContain('No approved wired model supports this capability')

    const ttsForMusic = routeLiveModel({ capability: 'music_generation', selectedProvider: 'genx', selectedModel: 'grok-tts' })
    expect(ttsForMusic.blockedReason).toContain('No approved wired model supports this capability')
  })

  it('keeps voice truth, underused provider truth, and adult governance explicit', () => {
    const matrix = getCapabilityGovernanceMatrix()
    expect(matrix.underusedCapabilities).toEqual([])
    expect(matrix.capabilities.map((capability) => capability.capability)).toEqual(expect.arrayContaining(['adult_video', 'adult_voice']))
    expect(validateCapabilitySelection({ capability: 'adult_video', adultPolicyAllows: true }).allowed).toBe(true)
    expect(validateCapabilitySelection({ capability: 'adult_voice', adultPolicyAllows: true }).allowed).toBe(true)
    expect(validateCapabilitySelection({ capability: 'adult_text', adultPolicyAllows: false }).blockers).toContain('adult_policy')
    expect(validateCapabilitySelection({ capability: 'adult_image', adultPolicyAllows: false }).blockers).toContain('adult_policy')
  })

  it('surfaces governance truth in Settings, Operations, and model catalog routes', () => {
    expect(read('app/admin/dashboard/settings/page.tsx')).toContain('Connect capabilities once')
    expect(read('app/admin/dashboard/operations/page.tsx')).toContain('Governance blockers and route truth')
    expect(read('app/api/admin/ai-model-catalog/route.ts')).toContain('rootWorkspaceHasFullAccess')
    expect(read('app/api/admin/provider-governance/route.ts')).toContain('capabilityGovernance')
  })
})
