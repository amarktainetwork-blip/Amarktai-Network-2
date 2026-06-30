import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getArtifactType, getCapabilityRoute } from '@/lib/capability-display'
import { CAPABILITY_UI_MODES } from '@/lib/capability-ui-schema'
import {
  CORE_PROOF_CAPABILITIES,
  LIVE_MEDIA_PROOF_CAPABILITIES,
  LIVE_MEDIA_PROOF_EXCLUDED_CAPABILITIES,
  extractCoreProofAudioSource,
  hasCoreProofAudioSource,
  normalizeCoreProofRouteResult,
  resolveLiveCoreProofCapabilities,
} from '@/lib/core-capability-proof-runner'
import { PROVIDER_MESH } from '@/lib/provider-mesh'

const root = process.cwd()
const src = (relativePath: string) => fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')
const rootFile = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('core live proof pack and capabilities display', () => {
  it('does not mislabel audio or music artifact types as image', () => {
    expect(getArtifactType({ capabilityId: 'music_generation' }, { artifactType: 'audio' })).toBe('audio')
    expect(getArtifactType({ capabilityId: 'tts' }, { artifactType: null })).toBe('audio')
    expect(getArtifactType({ capabilityId: 'voice_clone' }, { artifactType: null })).toBe('audio')
  })

  it('renders video, transcript, and document artifact types correctly', () => {
    expect(getArtifactType({ capabilityId: 'video_generation' }, { artifactType: null })).toBe('video')
    expect(getArtifactType({ capabilityId: 'stt' }, { artifactType: null })).toBe('transcript')
    expect(getArtifactType({ capabilityId: 'chat' }, { artifactType: null })).toBe('document')
  })

  it('route column uses executionRoute or schema knownRoute, never capabilityId', () => {
    expect(getCapabilityRoute({ capabilityId: 'image_generation', executionRoute: '/api/brain/image' }, { knownRoute: '/schema' })).toBe('/api/brain/image')
    expect(getCapabilityRoute({ capabilityId: 'avatar_generation', executionRoute: null }, { knownRoute: '/api/brain/avatar-video' })).toBe('/api/brain/avatar-video')
    expect(getCapabilityRoute({ capabilityId: 'unknown_capability', executionRoute: null }, { knownRoute: null })).toBe('Missing')

    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('getCapabilityRoute(entry, meta)')
    expect(page).not.toContain("entry.hasExecutionRoute ? entry.capabilityId : 'Missing'")
  })

  it('keeps wired_unproven mapped to Needs proof', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain("wired_unproven: 'Needs proof'")
  })

  it('Studio execute rejects override fields and no longer sends modelOverride to image execution', () => {
    const route = src('app/api/admin/studio/execute/route.ts')
    expect(route).toContain("const forbiddenFields = ['provider', 'model', 'providerOverride', 'modelOverride'] as const")
    expect(route).toContain('Studio UI payload cannot include')
    expect(route).not.toContain('modelOverride: route.selectedModel')
    expect(route).not.toContain('providerOverride: route.selectedProvider')
  })

  it('core schema modes map to executable proof route contracts', () => {
    const coreModes = ['chat', 'image', 'video', 'long_form_video', 'music', 'tts', 'stt', 'avatar']
    for (const modeId of coreModes) {
      const mode = CAPABILITY_UI_MODES.find((entry) => entry.id === modeId)
      expect(mode, `${modeId} missing from UI schema`).toBeDefined()
      expect(CORE_PROOF_CAPABILITIES.some((entry) => entry.mode === modeId || (modeId === 'stt' && entry.capability === 'stt'))).toBe(true)
    }
  })

  it('non-executable Studio modes return blockers instead of fake success', () => {
    const route = src('app/api/admin/studio/execute/route.ts')
    for (const mode of ['automation', 'publishing', 'trading', 'adult_private']) {
      expect(route).toContain(`mode === '${mode}'`)
    }
    expect(route).toContain('nonExecutableModeBlocker')
    expect(route).toContain('executed: false')
    expect(route).toContain('nextAction')
  })

  it('core proof route exposes the JSON contract with a capabilities array', () => {
    const route = src('app/api/admin/proof/core/route.ts')
    const runner = src('lib/core-capability-proof-runner.ts')
    expect(route).toContain('runCoreCapabilityProofPack')
    expect(runner).toContain('success: boolean')
    expect(runner).toContain("mode: CoreProofMode")
    expect(runner).toContain('ranAt: string')
    expect(runner).toContain('capabilities: CoreProofCapabilityResult[]')
  })

  it('HTTP core proof route remains admin protected', () => {
    const route = src('app/api/admin/proof/core/route.ts')
    expect(route).toContain('getSession')
    expect(route).toContain('!session.isLoggedIn')
    expect(route).toContain("error: 'Unauthorized'")
    expect(route).toContain('status: 401')
  })

  it('package proof script runs the auth-safe local wrapper', () => {
    const pkg = JSON.parse(rootFile('package.json')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.proof).toBe('npx tsx scripts/run-core-proof.ts')
    expect(fs.existsSync(path.join(root, 'scripts/run-core-proof.ts'))).toBe(true)
  })

  it('proof CLI reuses the existing runner and defaults to status-only mode', () => {
    const script = rootFile('scripts/run-core-proof.ts')
    expect(script).toContain("from '../src/lib/core-capability-proof-runner'")
    expect(script).toContain('runCoreCapabilityProofPack({')
    expect(script).toContain("process.argv.includes('--live')")
    expect(script).toContain("--capabilities=")
    expect(script).toContain("--maxDurationSeconds=")
    expect(script).toContain("--costMode=")
    expect(script).toContain("--pollSeconds=")
    expect(script).toContain("--pollIntervalMs=")
    expect(script).toContain('JSON.stringify(result, null, compact ? 0 : 2)')
    expect(script).toContain("--compact")
    for (const forbidden of [
      'routeLiveModel',
      'callProvider',
      'callGenXMedia',
      'fetch(',
      '/api/brain/adult',
      'adultTextPost',
      'adultImagePost',
      'providerOverride',
      'modelOverride',
    ]) {
      expect(script).not.toContain(forbidden)
    }
  })

  it('live proof pack A only allows low-cost core media capabilities', () => {
    expect([...LIVE_MEDIA_PROOF_CAPABILITIES]).toEqual(['image_generation', 'tts', 'music_generation', 'stt'])
    expect([...LIVE_MEDIA_PROOF_EXCLUDED_CAPABILITIES]).toEqual(expect.arrayContaining([
      'video_generation',
      'long_form_video',
      'avatar_generation',
      'adult_text',
      'adult_image',
      'adult_voice',
      'adult_avatar',
      'adult_video',
    ]))

    const resolved = resolveLiveCoreProofCapabilities([
      'image_generation',
      'video_generation',
      'adult_image',
      'tts',
    ])
    expect(resolved.selected.map((entry) => entry.capability)).toEqual(['image_generation', 'tts'])
    expect(resolved.rejected.map((entry) => entry.capability)).toEqual(['video_generation', 'adult_image'])
    expect(resolved.rejected.every((entry) => entry.status === 'blocked')).toBe(true)
  })

  it('live proof runner calls existing execution routes/helpers only behind live mode', () => {
    const runner = src('lib/core-capability-proof-runner.ts')
    expect(runner).toContain("if (!options.live)")
    expect(runner).toContain("await import('@/app/api/brain/image/route')")
    expect(runner).toContain("await import('@/app/api/brain/tts/route')")
    expect(runner).toContain("await import('@/app/api/brain/stt/route')")
    expect(runner).toContain("await import('@/lib/hf-fallback')")
    expect(runner).toContain("await import('@/lib/genx-client')")
    expect(runner).toContain("HF_MUSIC_MODEL")
    expect(runner).toContain("getConfiguredGenXMusicModel")
    expect(runner).toContain("GENX_MUSIC_MODEL")
    expect(runner).toContain("await import('@/lib/media-job-store')")
    expect(runner).not.toContain("await import('@/app/api/brain/video-generate/route')")
    expect(runner).not.toContain("await import('@/app/api/brain/long-form-video/route')")
    expect(runner).not.toContain("await import('@/app/api/brain/avatar-video/route')")
    expect(runner).not.toContain("providerOverride:")
    expect(runner).not.toContain("modelOverride:")
  })

  it('does not create a duplicate proof runner layer', () => {
    const files = execFileSync('git', ['ls-files', 'src/lib', 'scripts'], {
      cwd: root,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean)
    expect(files.filter((file) => file.endsWith('core-capability-proof-runner.ts'))).toEqual(['src/lib/core-capability-proof-runner.ts'])
    expect(files.some((file) => /proof-v2|dashboard-v2|studio-v2/i.test(file))).toBe(false)
  })

  it('core proof normalization never marks missing config as proven', () => {
    const result = normalizeCoreProofRouteResult('image_generation', '/api/brain/image', {
      success: false,
      executed: false,
      jobStatus: 'needs_setup',
      blocker: 'Together AI key not configured.',
    })
    expect(result.status).toBe('not_configured')
  })

  it('core proof normalization never marks async jobs as proven without persisted artifact', () => {
    const result = normalizeCoreProofRouteResult('video_generation', '/api/brain/video-generate', {
      success: true,
      executed: true,
      jobStatus: 'processing',
      jobId: 'job_123',
      pollUrl: '/api/brain/video-generate/job_123',
      provider: 'genx',
      model: 'kling-v2.5-turbo',
    })
    expect(result.status).toBe('processing')
    expect(result.jobId).toBe('job_123')
    expect(result.pollUrl).toBe('/api/brain/video-generate/job_123')
    expect(result.proofStatus).toBe('processing')
  })

  it('core proof normalization preserves artifact and storage fields for completed media', () => {
    for (const capability of ['image_generation', 'music_generation', 'tts', 'video_generation']) {
      const result = normalizeCoreProofRouteResult(capability, '/route', {
        success: true,
        executed: true,
        status: 'completed',
        artifactId: `${capability}-artifact`,
        storageUrl: `/api/artifacts/file/${capability}`,
        provider: 'genx',
        model: 'model',
      })
      expect(result.status).toBe('proven')
      expect(result.artifactId).toBe(`${capability}-artifact`)
      expect(result.storageUrl).toBe(`/api/artifacts/file/${capability}`)
    }
  })

  it('core proof normalization requires artifact persistence for media proof', () => {
    const noArtifact = normalizeCoreProofRouteResult('image_generation', '/route', {
      success: true,
      executed: true,
      status: 'completed',
      provider: 'together',
      model: 'flux',
    })
    expect(noArtifact.status).toBe('needs_proof')

    const persistenceFailed = normalizeCoreProofRouteResult('tts', '/route', {
      success: false,
      executed: false,
      status: 'failed',
      provider: 'groq',
      model: 'playai-tts',
      artifactId: null,
      storageUrl: null,
      blocker: 'Generation completed but artifact persistence failed: storage offline',
    })
    expect(persistenceFailed.status).toBe('failed')
    expect(persistenceFailed.proofStatus).toBe('failed')
  })

  it('core proof output includes live selection and rejection metadata', () => {
    const runner = src('lib/core-capability-proof-runner.ts')
    expect(runner).toContain('requestedCapabilities: string[]')
    expect(runner).toContain('selectedCapabilities: string[]')
    expect(runner).toContain('rejectedCapabilities: string[]')
    expect(runner).toContain('liveExecutionAttempted: boolean')
    expect(runner).toContain('requestedCapabilities,')
    expect(runner).toContain('selectedCapabilities: selected.map')
    expect(runner).toContain('rejectedCapabilities: rejected.map')
  })

  it('TTS live proof treats async job responses as processing until polling returns persisted audio', () => {
    const initial = normalizeCoreProofRouteResult('tts', '/api/brain/tts', {
      success: true,
      executed: true,
      jobStatus: 'processing',
      jobId: 'job_tts_1',
      pollUrl: '/api/brain/media-jobs/job_tts_1',
      provider: 'genx',
      model: 'grok-tts',
    })
    expect(initial.status).toBe('processing')

    const completed = normalizeCoreProofRouteResult('tts', '/api/brain/media-jobs/job_tts_1', {
      success: true,
      executed: true,
      status: 'completed',
      jobId: 'job_tts_1',
      artifactId: 'artifact_tts_1',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/audio/tts.mp3',
      audioUrl: '/api/artifacts/file/artifacts/amarktai-network/audio/tts.mp3',
      provider: 'genx',
      model: 'grok-tts',
    })
    expect(completed.status).toBe('proven')
    expect(completed.proofStatus).toBe('passed')
  })

  it('STT accepts same-run TTS artifact references instead of requiring fake inline audio', () => {
    const sourceRef = extractCoreProofAudioSource({
      artifactId: 'artifact_tts_1',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/audio/tts.mp3',
      audioUrl: '/api/artifacts/file/artifacts/amarktai-network/audio/tts.mp3',
    })
    expect(hasCoreProofAudioSource(sourceRef)).toBe(true)
    expect(sourceRef.artifactId).toBe('artifact_tts_1')

    const transcript = normalizeCoreProofRouteResult('stt', '/api/brain/stt', {
      success: true,
      executed: true,
      status: 'completed',
      transcript: 'AmarktAI proof test.',
      artifactId: 'artifact_stt_1',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/transcript/stt.txt',
      provider: 'groq',
      model: 'whisper-large-v3-turbo',
    })
    expect(transcript.status).toBe('proven')
  })

  it('Hugging Face text-to-audio converts Blob audio to a usable Buffer', async () => {
    const { generateHuggingFaceTextToAudio, isUsableAudioBuffer } = await import('@/lib/hf-fallback')
    const audioBlob = new Blob([Buffer.from('RIFF....WAVE....audio-data'.repeat(200))], {
      type: 'audio/wav',
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(audioBlob, {
      status: 200,
      headers: { 'content-type': 'audio/wav' },
    }))

    const result = await generateHuggingFaceTextToAudio({
      token: 'hf_test_token',
      model: 'facebook/musicgen-small',
      prompt: 'A very short instrumental proof loop, calm electronic pulse, no vocals.',
      durationSeconds: 8,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-inference.huggingface.co/models/facebook/musicgen-small',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer hf_test_token' }),
      }),
    )
    expect(result.provider).toBe('huggingface')
    expect(result.model).toBe('facebook/musicgen-small')
    expect(result.rawType).toBe('blob')
    expect(result.contentType).toBe('audio/wav')
    expect(result.extension).toBe('wav')
    expect(isUsableAudioBuffer(result.buffer, result.contentType)).toBe(true)
  })

  it('Hugging Face text-to-audio rejects JSON/text and tiny audio responses', async () => {
    const { generateHuggingFaceTextToAudio } = await import('@/lib/hf-fallback')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ error: 'loading' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    await expect(generateHuggingFaceTextToAudio({
      token: 'hf_test_token',
      model: 'facebook/musicgen-small',
      prompt: 'proof',
    })).rejects.toThrow('instead of audio')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(new Blob([Buffer.from('RIFF')], { type: 'audio/wav' }), {
      status: 200,
      headers: { 'content-type': 'audio/wav' },
    }))
    await expect(generateHuggingFaceTextToAudio({
      token: 'hf_test_token',
      model: 'facebook/musicgen-small',
      prompt: 'proof',
    })).rejects.toThrow('unusable audio')
  })

  it('music proof supports Hugging Face then GenX real audio fallback with canonical model settings', () => {
    const missingModel = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: false,
      executed: false,
      status: 'needs_setup',
      blocker: 'Music audio generation requires one configured real audio provider: HF_MUSIC_MODEL with Hugging Face credentials, or GENX_MUSIC_MODEL with GenX credentials.',
      attempts: [
        { provider: 'huggingface', model: null, status: 'not_configured', blocker: 'Missing HF_MUSIC_MODEL or Hugging Face token.' },
        { provider: 'genx', model: null, status: 'not_configured', blocker: 'Missing GENX_MUSIC_MODEL or GenX credential.' },
      ],
    })
    expect(missingModel.status).toBe('not_configured')
    expect(missingModel.attempts).toHaveLength(2)

    const blueprintOnly = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: false,
      executed: false,
      status: 'needs_setup',
      provider: 'blueprint_only',
      blocker: 'Lyrics and song blueprint generated. Configure GENX_MUSIC_MODEL and GenX credentials for real audio generation.',
    })
    expect(blueprintOnly.status).not.toBe('proven')

    const hfGenerated = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: true,
      executed: true,
      status: 'completed',
      provider: 'huggingface',
      model: 'facebook/musicgen-small',
      artifactId: 'hf_music_artifact',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/hf-song.mp3',
      audioUrl: '/api/artifacts/file/artifacts/amarktai-network/music/hf-song.mp3',
      attempts: [
        { provider: 'huggingface', model: 'facebook/musicgen-small', status: 'ok', artifactId: 'hf_music_artifact', storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/hf-song.mp3' },
      ],
    })
    expect(hfGenerated.status).toBe('proven')
    expect(hfGenerated.provider).toBe('huggingface')

    const genxFallback = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: true,
      executed: true,
      status: 'completed',
      provider: 'genx',
      model: 'lyria-real-model',
      artifactId: 'genx_music_artifact',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/genx-song.mp3',
      audioUrl: '/api/artifacts/file/artifacts/amarktai-network/music/genx-song.mp3',
      attempts: [
        { provider: 'huggingface', model: 'facebook/musicgen-small', status: 'failed', error: 'Hugging Face music returned HTTP 503.' },
        { provider: 'genx', model: 'lyria-real-model', status: 'ok', artifactId: 'genx_music_artifact', storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/genx-song.mp3' },
      ],
    })
    expect(genxFallback.status).toBe('proven')
    expect(genxFallback.provider).toBe('genx')
    expect(genxFallback.attempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'huggingface', status: 'failed' }),
      expect.objectContaining({ provider: 'genx', status: 'ok' }),
    ]))

    const genxOnly = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: true,
      executed: true,
      status: 'completed',
      provider: 'genx',
      model: 'lyria-real-model',
      artifactId: 'genx_music_artifact',
      storageUrl: '/api/artifacts/file/artifacts/amarktai-network/music/genx-song.mp3',
      attempts: [
        { provider: 'huggingface', model: null, status: 'not_configured', blocker: 'Missing HF_MUSIC_MODEL or Hugging Face token.' },
        { provider: 'genx', model: 'lyria-real-model', status: 'ok' },
      ],
    })
    expect(genxOnly.status).toBe('proven')
    expect(genxOnly.attempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'huggingface', status: 'not_configured' }),
      expect.objectContaining({ provider: 'genx', status: 'ok' }),
    ]))

    const missingArtifact = normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: true,
      executed: true,
      status: 'completed',
      provider: 'huggingface',
      model: 'facebook/musicgen-small',
    })
    expect(missingArtifact.status).not.toBe('proven')

    const media = src('lib/media-capability-registry.ts')
    const runner = src('lib/core-capability-proof-runner.ts')
    const truth = src('lib/capability-runtime-truth.ts')
    const hfIndex = runner.indexOf('runHuggingFaceMusicProofAttempt')
    const genxIndex = runner.indexOf('runGenXMusicProofAttempt')
    expect(hfIndex).toBeGreaterThan(-1)
    expect(genxIndex).toBeGreaterThan(hfIndex)
    expect(media).toContain("getConfiguredHuggingFaceMusicModel() ?? 'HF_MUSIC_MODEL'")
    expect(media).toContain("getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL'")
    expect(truth).toContain("providerCandidates: ['huggingface', 'genx']")
    expect(truth).toContain('Music audio generation requires one configured real audio provider: HF_MUSIC_MODEL with Hugging Face credentials, or GENX_MUSIC_MODEL with GenX credentials.')
    expect(runner).toContain('generateHuggingFaceTextToAudio')
    expect(runner).not.toContain('textToSpeech')
    expect(media).not.toContain("{ provider: 'genx', model: GENX_DEFAULT_AUDIO_MODEL }")
  })

  it('STT live proof depends on same-run TTS audio artifact', () => {
    const runner = src('lib/core-capability-proof-runner.ts')
    expect(runner).toContain('Run STT after a valid audio artifact exists.')
    expect(runner).toContain("tts.result.status === 'proven' ? tts.audioSource : null")
    expect(runner).toContain('readAudioSourceBytes')
    expect(runner).toContain('getStorageDriver')
  })

  it('proof page documents status-only and live pack A commands', () => {
    const page = src('app/admin/dashboard/proof/page.tsx')
    expect(page).toContain('npm run proof</span> is status-only')
    expect(page).toContain('npm run proof -- --live --capabilities=image_generation,tts,music_generation,stt')
    expect(page).toContain('Video, long-form video, and avatar proof remain later proof packs.')
  })

  it('adult private is blocked and not included in core proof execution', () => {
    expect(CORE_PROOF_CAPABILITIES.some((entry) => entry.capability.startsWith('adult') || entry.mode === 'adult_private')).toBe(false)
    const route = src('app/api/admin/studio/execute/route.ts')
    expect(route).toContain('Adult private generation execution is intentionally blocked')
  })

  it('Qwen is not active and opencode.json is unchanged', () => {
    expect(PROVIDER_MESH.some((provider) => String(provider.id) === 'qwen')).toBe(false)
    const status = execFileSync('git', ['status', '--short', '--', 'opencode.json'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(status.trim()).toBe('')
  })
})
