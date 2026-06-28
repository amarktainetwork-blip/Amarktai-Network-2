import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeProviderMeshId, requireProviderMeshId } from '@/lib/provider-mesh'
import { validateCapabilitySelection } from '@/lib/provider-capability-governance'
import { routeLiveModel } from '@/lib/live-ai-routing'
import {
  normalizeLongFormSceneDurations,
  normalizeProviderVideoDuration,
} from '@/lib/provider-video-policy'

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
    expect(route).toContain('executeStudioChat({ prompt, appSlug, route')
    expect(route).toContain('callGenXChat({ model: candidate.model')
    expect(route).toContain('callProvider(candidate.provider, candidate.model, input.prompt)')
    expect(route).not.toContain("assistantChatPost(jsonRequest('/api/admin/amarktai-assistant/chat'")
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

  it('image execution returns processing for async jobs and only records passed proof after real persistence', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(route).toContain("mode: 'image'")
    expect(route).toContain("routePath: '/api/brain/image'")
    expect(route).toContain('persistCanonicalMediaResult')
    expect(route).toContain('recordStudioProof')
    expect(route).toContain("const completed = Boolean(persisted?.success && persisted.status === 'completed')")
    expect(route).toContain("proofStatus: processing ? 'processing' : 'failed'")
    expect(studio).toContain('pollStudioJob')
    expect(studio).toContain("Job completed but no artifact was returned/saved.")
    expect(studio).toContain("result.status === 'completed'")
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

  it('Studio preview uses platform artifact URLs instead of provider file URLs', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(studio).toContain("isPlatformArtifactUrl(rawOutputUrl)")
    expect(studio).toContain("return value.startsWith('/api/artifacts/file/')")
    expect(studio).toContain("Job completed but no platform artifact was returned/saved.")
    expect(studio).toContain('<audio src={result.outputUrl} controls')
    expect(studio).toContain('<video src={result.outputUrl} controls')
    expect(studio).toContain('<img src={result.outputUrl}')
    expect(studio).not.toContain('Generated Studio output')
  })

  it('Assets page lists canonical artifacts and marks external provider URLs as broken', () => {
    const assets = source('app/admin/dashboard/assets/page.tsx')

    expect(assets).toContain('listArtifacts')
    expect(assets).toContain('listAvatarLibraryEntries')
    expect(assets).toContain('Avatar Library')
    expect(assets).toContain('assetFromCanonical')
    expect(assets).toContain('Broken asset: provider URL was not ingested into platform storage.')
    expect(assets).toContain('Broken asset: metadata exists but no platform file is saved.')
    expect(assets).toContain('artifact.storageUrl')
    expect(assets).toContain('artifact.storagePath')
    expect(assets).toContain('avatar.artifactUrl')
  })

  it('Studio video, image-to-video, long-form video, and avatar proof routes are wired honestly', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const videoRoute = source('app/api/brain/video-generate/route.ts')
    const referenceUploadRoute = source('app/api/admin/studio/reference-upload/route.ts')
    const longFormRoute = source('app/api/brain/long-form-video/route.ts')
    const longFormPollRoute = source('app/api/brain/long-form-video/[jobId]/route.ts')
    const longFormStore = source('lib/long-form-video-store.ts')
    const stitcher = source('lib/video-stitcher.ts')
    const videoPoll = source('app/api/brain/video-generate/[jobId]/route.ts')
    const avatarRoute = source('app/api/brain/avatar-video/route.ts')
    const jobs = source('lib/media-job-store.ts')

    expect(route).toContain("if (bodyMode === 'long-video') return 'long_video'")
    expect(route).toContain("if (bodyMode === 'image-to-video') return 'image_to_video'")
    expect(route).toContain("if (mode === 'image_to_video' && !referenceImageUrl)")
    expect(route).toContain('Image-to-video requires a referenceImageUrl or uploaded image artifact before execution.')
    expect(route).toContain("capability: mode === 'image_to_video' ? 'image_to_video' : capability")
    expect(route).toContain("const completed = ['completed', 'succeeded'].includes(status) && Boolean(data.artifactId && data.storageUrl)")
    expect(route).toContain("mode: 'video'")
    expect(route).toContain("mode: 'avatar'")
    expect(route).toContain("routePath: '/api/brain/video-generate'")
    expect(route).toContain("routePath: '/api/brain/avatar-video'")
    expect(route).toContain("'/api/brain/long-form-video'")
    expect(route).not.toContain('Long-form video rendering is not wired.')
    expect(route).toContain("status: 'blocked'")
    expect(route).toContain("proofStatus: 'failed'")
    expect(longFormRoute).toContain('startLongFormVideoJob')
    expect(longFormRoute).toContain('duration: z.number().int().min(90)')
    expect(longFormPollRoute).toContain('pollLongFormVideoJob')
    expect(longFormStore).toContain('direct_provider')
    expect(longFormStore).toContain('scene_stitched')
    expect(longFormStore).toContain('callGenXMedia')
    expect(longFormStore).toContain('stitchVideoClips')
    expect(longFormStore).toContain("subType: 'long_form_video'")
    expect(longFormStore).toContain("proofStatus: 'passed'")
    expect(stitcher).toContain("run('ffmpeg'")
    expect(stitcher).toContain('getStorageDriver')
    expect(videoRoute).toContain("z.enum(['video_generation', 'image_to_video', 'adult_video'])")
    expect(videoRoute).toContain('referenceImageUrl')
    expect(videoRoute).toContain('providerErrorDetails')
    expect(videoRoute).toContain('normalizedRequest')
    expect(videoRoute).toContain('persistCanonicalMediaResult')
    expect(referenceUploadRoute).toContain("subType: 'studio_reference_image'")
    expect(referenceUploadRoute).toContain('referenceImageUrl: artifact.storageUrl')
    expect(videoPoll).toContain("if (parsed.capability === 'image_to_video') return 'image_to_video'")
    expect(videoPoll).toContain('persistCanonicalMediaResult')
    expect(avatarRoute).toContain('callGenXMedia')
    expect(avatarRoute).toContain("const capability = mode === 'video' ? 'avatar_video' : 'avatar_image'")
    expect(avatarRoute).toContain('avatarVideoProofEligible')
    expect(avatarRoute).toContain('recordAvatarLibraryEntry')
    expect(avatarRoute).toContain('createLocalMediaJob')
    expect(jobs).toContain("job.capability === 'avatar_video'")
    expect(jobs).toContain("job.capability === 'avatar_image'")
    expect(jobs).toContain('recordAvatarLibraryEntry')
  })

  it('Studio UI exposes video/avatar controls without provider or model selectors', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(studio).toContain("id: 'image-to-video'")
    expect(studio).toContain("options={['4s', '5s', '6s', '8s']}")
    expect(studio).toContain("fetch('/api/admin/studio/reference-upload'")
    expect(studio).toContain('setLongVideoDuration')
    expect(studio).toContain('Production notes')
    expect(studio).toContain('Reference image URL')
    expect(studio).toContain('Avatar name')
    expect(studio).toContain('Avatar library')
    expect(studio).toContain('setAvatarDuration')
    expect(studio).not.toMatch(/Provider\s*<\/label>|Model\s*<\/label>|provider selector|model selector/i)
  })

  it('normalizes Studio video durations and long-form scene durations to the provider contract', () => {
    expect(normalizeProviderVideoDuration(30)).toBe(8)
    expect(normalizeProviderVideoDuration(1)).toBe(4)
    expect(normalizeProviderVideoDuration('5s')).toBe(5)

    const ninetySecondPlan = normalizeLongFormSceneDurations(90, 6)
    expect(ninetySecondPlan).toHaveLength(12)
    expect(ninetySecondPlan.every((duration) => duration >= 4 && duration <= 8)).toBe(true)
    expect(ninetySecondPlan.reduce((sum, duration) => sum + duration, 0)).toBe(90)
  })

  it('music execution forwards lyrics, structure, vocals, mood, BPM, count, and backend payload metadata', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const musicRoute = source('app/api/admin/music-studio/route.ts')

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
      "const completed = ['completed', 'succeeded'].includes(status)",
      "proofStatus: processing ? 'processing' : 'failed'",
      'buildStudioMusicPrompt',
      'productionPrompt',
    ]) {
      expect(route).toContain(required)
    }
    expect(musicRoute).toContain('musicRequest.prompt?.trim()')
    expect(musicRoute).toContain('productionPrompt: prompt')
    expect(musicRoute).toContain('songStructure: musicRequest.songStructure')
    expect(musicRoute).toContain('musicVideoHandoff: musicRequest.musicVideoHandoff')
  })

  it('successful image and music executions write runtime proof only for completed output', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const jobs = source('lib/media-job-store.ts')

    expect(route).toContain('recordProviderResult')
    expect(route).toContain("proofStatus: input.success && input.executed ? 'passed' : 'failed'")
    expect(route).toContain("capability: 'image_generation'")
    expect(route).toContain("capability: 'music_generation'")
    expect(route).toContain("success: true")
    expect(route).toContain("Poll the job until completed.")
    expect(jobs).toContain("source: 'media_job_poll'")
    expect(jobs).toContain("proofStatus: persisted.artifactId ? 'passed' : 'failed'")
    expect(jobs).toContain('Provider completed but artifact ingestion failed')
  })

  it('Studio UI has no provider or model selector and only displays selected route after execution', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(studio).not.toMatch(/Provider\s*<\/label>|Model\s*<\/label>|provider selector|model selector/i)
    expect(studio).toContain('Resolved provider')
    expect(studio).toContain('Resolved model')
    expect(studio).toContain('No infrastructure selector is exposed')
    expect(studio).toContain('Active jobs')
    expect(studio).toContain('Recent artifacts')
    expect(studio).toContain('<audio src={result.outputUrl} controls')
    expect(studio).toContain('<img src={result.outputUrl}')
  })

  it('Studio UI does not show Completed while proof or job status is processing', () => {
    const studio = source('app/admin/dashboard/studio/page.tsx')

    expect(studio).toContain("if (['queued', 'pending', 'processing', 'running', 'in-progress'].includes(status)) return 'processing'")
    expect(studio).toContain("status === 'processing'")
    expect(studio).toContain("setStatus(initial.status)")
    expect(studio).not.toContain("setStatus('Completed')")
    expect(studio).not.toContain("status: String(data.jobStatus")
  })

  it('Studio chat routing respects budget and quality policy', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const routing = source('lib/live-ai-routing.ts')
    const balanced = routeLiveModel({ capability: 'chat', costMode: 'balanced' })
    const premium = routeLiveModel({ capability: 'chat', costMode: 'premium' })

    expect(route).toContain("chat: ['groq', 'together', 'mimo', 'genx', 'huggingface']")
    expect(route).toContain('STUDIO_PREMIUM_CHAT_PROVIDERS')
    expect(route).toContain('effectiveStudioCostMode')
    expect(route).toContain('routingPolicy')
    expect(route).toContain('studioChatCandidates(route')
    expect(route).toContain("fallbackUsed: candidate.source !== 'primary'")
    expect(routing).toContain('staticModel?.costTier')
    expect(balanced.selectedModel).not.toBe('mimo-v2.5-pro')
    expect(balanced.selectedModel).not.toBe('auto:coding-best')
    expect(premium.selectedModel).toBeTruthy()
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
    const sourceText = source('app/api/admin/studio/execute/route.ts')

    expect(route.blockedReason).not.toBe('Provider is not approved by the provider mesh.')
    expect(route.selectedProvider).toMatch(/^(genx|groq|together|mimo|huggingface)$/)
    expect(normalizeProviderMeshId(route.selectedProvider)).toBe(route.selectedProvider)
    expect(normalizeProviderMeshId(route.selectedModel)).toBeNull()
    expect(sourceText).toContain("if (!value || value === 'auto' || value.startsWith('auto:') || value.startsWith('task:'))")
    expect(sourceText).toContain("genx: 'gpt-5.4-mini'")
    expect(sourceText).toContain("huggingface: 'meta-llama/Llama-3-8b-chat-hf'")
  })

  it('Studio music keeps Hugging Face honest until a Studio music backend route is wired', () => {
    const route = source('app/api/admin/studio/execute/route.ts')
    const media = source('lib/media-capability-registry.ts')
    const music = source('lib/music-studio.ts')

    expect(route).toContain("music: ['genx']")
    expect(media).toContain('music_generation')
    expect(media).toContain("capability: 'music_generation'")
    expect(media).toContain("{ provider: 'genx', model: GENX_AUDIO_MODELS[0] }")
    expect(music).toContain("export type MusicProvider = 'genx' | 'blueprint_only'")
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
