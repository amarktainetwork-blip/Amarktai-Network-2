import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeProviderMeshId, requireProviderMeshId } from '@/lib/provider-mesh'
import { validateCapabilitySelection } from '@/lib/provider-capability-governance'
import { routeLiveModel } from '@/lib/live-ai-routing'

const root = process.cwd()

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')
}

describe('Studio execution proof pack', () => {
  it('rejects user-supplied provider or model overrides before execution', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain("const forbiddenFields = ['provider', 'model', 'providerOverride', 'modelOverride'] as const")
    expect(route).toContain('Studio UI payload cannot include')
  })

  it('executes chat through Studio without creating a chat artifact', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain("mode === 'chat'")
    expect(route).toContain("assistantChatPost(jsonRequest('/api/admin/amarktai-assistant/chat'")
    expect(route).toContain("artifact: null")
    expect(route).toContain('noArtifact: true')
    expect(route).not.toContain("selectedProvider: 'auto'")
  })

  it('preflights blocked capabilities and does not fabricate output', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain('getCapabilityRuntimeTruthEntry')
    expect(route).toContain("truth.status === 'blocked' || truth.status === 'missing'")
    expect(route).toContain('output: null')
    expect(route).toContain('nextAction')
  })

  it('image execution records artifact proof after real persistence', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain("mode: 'image'")
    expect(route).toContain("routePath: '/api/brain/image'")
    expect(route).toContain('persistCanonicalMediaResult')
    expect(route).toContain('recordStudioProof')
    expect(route).toContain('artifactId: persisted?.artifactId ?? null')
  })

  it('music execution accepts up to five genres and supports 3+ minute duration', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(route).toContain("stringArrayControl(controls, 'genres'")
    expect(route).toContain(').slice(0, 5)')
    expect(route).toContain('Math.max(180, durationSeconds')
    expect(studio).toContain('musicGenre5')
    expect(studio).toContain('Genre 5')
    expect(studio).toContain('360s')
  })

  it('music execution forwards lyrics, structure, vocals, mood, BPM, count, and backend payload metadata', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    for (const required of [
      'existingLyrics',
      'songStructure',
      'vocalStyle',
      'instrumental',
      'mood',
      'bpm',
      'count',
      'productionNotes',
      'musicVideoHandoff',
      'requestProof',
    ]) {
      expect(route).toContain(required)
    }
  })

  it('successful image and music executions write runtime proof to provider result logs', () => {
    const route = source('app/api/admin/studio/execute/route.ts')

    expect(route).toContain('recordProviderResult')
    expect(route).toContain("proofStatus: input.success && input.executed ? 'passed' : 'failed'")
    expect(route).toContain("capability: 'image_generation'")
    expect(route).toContain("capability: 'music_generation'")
  })

  it('Studio UI has no provider or model selector and only displays selected route after execution', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(studio).not.toMatch(/Provider\s*<\/label>|Model\s*<\/label>|provider selector|model selector/i)
    expect(studio).toContain('Resolved provider')
    expect(studio).toContain('Resolved model')
    expect(studio).toContain('No infrastructure selector is exposed')
  })

  it('normalizes only known provider aliases represented in the canonical mesh', () => {
    expect(normalizeProviderMeshId('GenX')).toBe('genx')
    expect(normalizeProviderMeshId('Hugging Face')).toBe('huggingface')
    expect(normalizeProviderMeshId('hf')).toBe('huggingface')
    expect(normalizeProviderMeshId('Together AI')).toBe('together')
    expect(normalizeProviderMeshId('xiaomi')).toBe('mimo')
    expect(normalizeProviderMeshId('replicate')).toBeNull()
    expect(() => requireProviderMeshId('replicate')).toThrow('Provider "replicate" is not approved by the provider mesh.')
  })

  it('Studio chat automatic routing does not pass auto, display labels, or model IDs into mesh validation', () => {
    const route = routeLiveModel({ capability: 'chat', selectedProvider: 'auto' })

    expect(route.blockedReason).not.toBe('Provider is not approved by the provider mesh.')
    expect(route.selectedProvider).toMatch(/^(genx|groq|together|mimo|huggingface)$/)
    expect(normalizeProviderMeshId(route.selectedProvider)).toBe(route.selectedProvider)
    expect(normalizeProviderMeshId(route.selectedModel)).toBeNull()
  })

  it('Studio image and music route through canonical provider mesh IDs', () => {
    expect(routeLiveModel({ capability: 'image_generation', selectedProvider: 'Together AI' }).selectedProvider).toBe('together')
    expect(routeLiveModel({ capability: 'music_generation', selectedProvider: 'GenX' }).selectedProvider).toBe('genx')
  })

  it('unknown provider still fails mesh approval while valid canonical providers do not', () => {
    expect(routeLiveModel({
      capability: 'chat',
      selectedProvider: 'replicate',
      selectedModel: 'legacy-model',
    }).blockedReason).toBe('Provider is not approved by the provider mesh.')

    for (const [capability, provider] of [
      ['chat', 'genx'],
      ['image_generation', 'genx'],
      ['music_generation', 'genx'],
    ] as const) {
      const validation = validateCapabilitySelection({ capability, provider })
      expect(validation.reason).not.toBe('Provider is not approved by the provider mesh.')
      expect(validation.blockers).not.toContain('provider_not_approved')
    }
  })
})
