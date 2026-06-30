import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ACTIVE_V1_RUNTIME_PROVIDERS,
  FUTURE_WORKBENCH_PROVIDERS,
  INACTIVE_V1_PROVIDERS,
  getAllProviderRuntimes,
  isActiveV1RuntimeProvider,
  isFutureWorkbenchProvider,
} from '@/lib/provider-runtime'
import { getCapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'

const root = process.cwd()
const source = (relativePath: string) => fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')

describe('corrected V1 provider policy', () => {
  it('active V1 runtime providers are exactly genx, together, and groq', () => {
    expect([...ACTIVE_V1_RUNTIME_PROVIDERS]).toEqual(['genx', 'together', 'groq'])
    expect(getAllProviderRuntimes().map((provider) => provider.key)).toEqual(['genx', 'together', 'groq'])
  })

  it('preserves MiMo as future/workbench only and keeps Hugging Face inactive', () => {
    expect([...FUTURE_WORKBENCH_PROVIDERS]).toEqual(['mimo'])
    expect(isFutureWorkbenchProvider('mimo')).toBe(true)
    expect(isActiveV1RuntimeProvider('mimo')).toBe(false)
    expect([...INACTIVE_V1_PROVIDERS]).toContain('huggingface')
    expect(isActiveV1RuntimeProvider('huggingface')).toBe(false)
  })

  it('keeps Groq active for chat and STT while music remains GenX-only', async () => {
    expect((await getCapabilityRuntimeTruthEntry('chat'))?.providerCandidates).toEqual(['groq', 'together', 'genx'])
    expect((await getCapabilityRuntimeTruthEntry('stt'))?.providerCandidates).toEqual(['genx', 'groq'])
    expect((await getCapabilityRuntimeTruthEntry('music_generation'))?.providerCandidates).toEqual(['genx'])
    expect(MEDIA_CAPABILITY_ROUTES.stt.providers.map((entry) => entry.provider)).toEqual(['genx', 'groq'])
    expect(MEDIA_CAPABILITY_ROUTES.music_generation.providers).toEqual([
      expect.objectContaining({ provider: 'genx', model: expect.any(String) }),
    ])
  })

  it('requires GENX_MUSIC_MODEL and does not use Hugging Face for Pack A music', () => {
    const runner = source('lib/core-capability-proof-runner.ts')
    const registry = source('lib/media-capability-registry.ts')

    expect(runner).toContain('GENX_MUSIC_MODEL')
    expect(registry).toContain("getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL'")
    expect(runner).not.toContain('runHuggingFaceMusicProofAttempt')
    expect(runner).not.toContain('generateHuggingFaceTextToAudio')
    expect(registry).not.toContain('HF_MUSIC_MODEL')
  })

  it('defers adult from active V1 runtime while keeping any dashboard surface explicitly deferred', async () => {
    for (const capability of ['adult_text', 'adult_image', 'adult_video', 'adult_voice', 'adult_avatar']) {
      const entry = await getCapabilityRuntimeTruthEntry(capability)
      expect(entry?.providerCandidates).toEqual([])
      expect(entry?.executionRoute).toBeNull()
    }

    expect(source('lib/dashboard-nav.ts')).not.toMatch(/Adult Private|Adult active/i)
    expect(source('app/admin/dashboard/adult/page.tsx')).toContain('Deferred from active V1 runtime')
  })

  it('keeps SDK app request types free of provider and model overrides', () => {
    const sdk = source('lib/sdk/amarktai-client.ts')
    const executeRequest = sdk.slice(sdk.indexOf('export interface ExecuteRequest'), sdk.indexOf('export interface ExecuteResponse'))
    const streamRequest = sdk.slice(sdk.indexOf('export interface StreamRequest'), sdk.indexOf('export interface AgentDispatchRequest'))
    const imageRequest = sdk.slice(sdk.indexOf('export interface ImageRequest'), sdk.indexOf('export interface HeartbeatResponse'))

    for (const block of [executeRequest, streamRequest, imageRequest]) {
      expect(block).not.toContain('provider?:')
      expect(block).not.toContain('model?:')
    }
  })
})
