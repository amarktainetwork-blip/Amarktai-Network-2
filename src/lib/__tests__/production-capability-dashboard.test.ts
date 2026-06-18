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
      'Capabilities',
      'Apps',
      'Jobs',
      'Artifacts',
      'Settings',
    ])
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    expect(studio).toContain("setMode('adult')")
    expect(studio).not.toContain('Media job history')
    expect(studio).not.toContain('Model, optional')
    expect(studio).not.toContain('<option value="genx">')
  })

  it('keeps Providers reachable only as legacy diagnostics, not canonical navigation', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain('Providers')
    const providersPage = source('src/app/admin/dashboard/providers/page.tsx')
    expect(providersPage).toContain('Legacy diagnostics')
    expect(providersPage).toContain('not part of the normal capability-first product workflow')
  })

  it('keeps the redesigned read-heavy pages on canonical backend surfaces', () => {
    const capabilitiesPage = source('src/app/admin/dashboard/capabilities/page.tsx')
    const jobsPage = source('src/app/admin/dashboard/jobs/page.tsx')
    const artifactsPage = source('src/app/admin/dashboard/artifacts/page.tsx')
    const connectedAppsPage = source('src/app/admin/dashboard/connected-apps/page.tsx')

    expect(capabilitiesPage).toContain("fetch('/api/admin/system/ai-capabilities-truth'")
    expect(jobsPage).toContain("fetch('/api/admin/jobs')")
    expect(artifactsPage).toContain("fetch(`/api/admin/artifacts?${params}`")
    expect(connectedAppsPage).toContain('ConnectedAppsClient')
  })

  it('keeps interactive dashboard pages on their runtime-backed or diagnostic surfaces', () => {
    const command = source('src/components/dashboard/CommandCenter.tsx')
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    const settings = source('src/app/admin/dashboard/settings/page.tsx')
    const providers = source('src/app/admin/dashboard/providers/page.tsx')

    expect(command).toContain('/api/admin/playground')
    expect(studio).toContain('/api/admin/system/v1-brain-route-matrix')
    expect(studio).toContain('/api/admin/studio/execute')
    expect(settings).toContain('/api/admin/settings/status')
    expect(settings).toContain('/api/admin/settings/runtime-tools')
    expect(providers).toContain('/api/admin/system/provider-diagnostics')
    expect(providers).toContain('Legacy diagnostics')
  })

  it('keeps Settings provider cards aligned with canonical provider truth instead of stale marketing copy', () => {
    const settings = source('src/app/admin/dashboard/settings/page.tsx')

    expect(settings).toContain('canonicalProviderHint(entry)')
    expect(settings).toContain('PROVIDER_TRUTH.find')
    expect(settings).not.toContain('Text, image, video, audio, music, avatar, TTS, and STT')
    expect(settings).not.toContain('Text, reasoning, vision, audio, TTS, STT, and web search')
    expect(settings).not.toContain('Text, image, video, audio, embeddings, and async jobs')
  })

  it('does not treat the Hugging Face account-token check as capability execution proof', () => {
    const hfTest = source('src/app/api/admin/settings/test-huggingface/route.ts')
    const genericTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(hfTest).toContain("proofType: 'account_token_check'")
    expect(hfTest).toContain('capabilityExecutionProven: false')
    expect(hfTest).toContain('provider-capability test')
    expect(genericTest).toContain('result.capabilityExecutionProven === true')
  })

  it('does not treat the Together model-catalog check as full capability execution proof', () => {
    const togetherTest = source('src/app/api/admin/settings/test-together/route.ts')
    const genericTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(togetherTest).toContain("proofType: 'key_and_model_catalog_check'")
    expect(togetherTest).toContain('capabilityExecutionProven: false')
    expect(togetherTest).toContain('real route proof')
    expect(genericTest).toContain('result.capabilityExecutionProven === true')
  })

  it('does not treat the GenX catalog/chat probe as full capability execution proof', () => {
    const genxTest = source('src/app/api/admin/settings/test-genx/route.ts')
    const genericTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(genxTest).toContain("proofType: 'catalog_and_chat_probe'")
    expect(genxTest).toContain('capabilityExecutionProven: false')
    expect(genxTest).toContain('real Brain/runtime route proof')
    expect(genericTest).toContain('result.capabilityExecutionProven === true')
  })

  it('does not treat the Qwen chat probe as full capability execution proof', () => {
    const qwenTest = source('src/app/api/admin/settings/test-qwen/route.ts')
    const genericTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(qwenTest).toContain("proofType: 'chat_route_probe'")
    expect(qwenTest).toContain('capabilityExecutionProven: false')
    expect(qwenTest).toContain('Image, video/Wanx, image-to-video, embeddings, and translation still require their own Brain/runtime route proof.')
    expect(genericTest).toContain('result.capabilityExecutionProven === true')
  })

  it('keeps Hugging Face task-based specialist proofs separate from Brain product-route readiness', () => {
    const capabilityTest = source('src/app/api/admin/provider-capability-test/route.ts')
    const hfSpecialist = source('src/app/api/admin/specialist/huggingface/route.ts')
    const matrix = source('src/lib/brain/v1-capability-matrix.ts')

    expect(capabilityTest).toContain("provider === 'huggingface'")
    expect(capabilityTest).toContain('needs_specialist_route')
    expect(hfSpecialist).toContain('runHuggingFaceInference')
    expect(matrix).toContain('is available through Hugging Face task models but is not wired into the capability gateway.')
    expect(matrix).toContain('Source-image transform requires a public image reference or uploaded image bytes.')
  })

  it('does not treat the Groq model-catalog check as full capability execution proof', () => {
    const groqTest = source('src/app/api/admin/settings/test-groq/route.ts')
    const genericTest = source('src/app/api/admin/settings/test-provider/route.ts')

    expect(groqTest).toContain("proofType: 'key_and_model_catalog_check'")
    expect(groqTest).toContain('capabilityExecutionProven: false')
    expect(groqTest).toContain('chat, TTS, or STT')
    expect(genericTest).toContain('result.capabilityExecutionProven === true')
  })

  it('keeps MiniMax out of canonical provider and settings surfaces while preserving Xiaomi MiMo only', () => {
    const settings = source('src/app/admin/dashboard/settings/page.tsx')
    const providerMesh = source('src/lib/provider-mesh.ts')
    const integrationKeys = source('src/app/api/admin/integration-keys/route.ts')

    expect(providerMesh).toContain("displayName: 'Xiaomi MiMo'")
    expect(providerMesh).not.toContain('MiniMax')
    expect(integrationKeys).toContain("displayName: 'Xiaomi MiMo'")
    expect(integrationKeys).not.toContain('MINIMAX_API_KEY')
    expect(settings).not.toContain('MiniMax')
  })

  it('does not advertise Hugging Face image generation as executable from Studio unless the route is actually wired', () => {
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    const matrix = source('src/lib/brain/v1-capability-matrix.ts')

    expect(studio).toContain("fetch('/api/admin/system/v1-brain-route-matrix'")
    expect(matrix).toContain('Source-image transform requires a public image reference or uploaded image bytes.')
    expect(matrix).toContain('Text to Image')
  })

  it('keeps Studio capability-first and shows honest blockers for governed adult or blocked routes', () => {
    const studio = source('src/app/admin/dashboard/studio/page.tsx')
    const studioRoute = source('src/app/api/admin/studio/execute/route.ts')

    expect(studio).toContain('adultCapabilityKey(capability)')
    expect(studio).toContain('No adult provider is approved for this app.')
    expect(studio).toContain('Adult video remains blocked until an approved provider exposes a canonical adult-video execution route.')
    expect(studio).toContain("runtimeTruth?.readiness === 'blocked'")
    expect(studio).toContain("runtimeTruth?.readiness === 'post_launch'")
    expect(studioRoute).toContain('musicStudioPost')
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
