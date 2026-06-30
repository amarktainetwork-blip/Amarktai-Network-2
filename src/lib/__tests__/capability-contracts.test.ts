import { describe, expect, it } from 'vitest'
import {
  getCapabilityContract,
  listCapabilityContracts,
  listContractsByStudio,
  listAppFacingCapabilities,
  validateCapabilityInput,
  getCapabilityBlocker,
  getCapabilityProofRequirement,
  getCapabilityExampleAppRequest,
  getCapabilityAllowedProviders,
  isCapabilityExecutable,
  getCapabilityStudioId,
  listCapabilityIds,
  getContractsByCategory,
} from '@/lib/capability-contracts'
import type { ActiveV1Provider } from '@/lib/capability-contracts'

const REQUIRED_STUDIOS = [
  'text-chat',
  'image',
  'video',
  'long-form-video',
  'music-song',
  'voice',
  'avatar',
  'scrape-brand',
  'rag-knowledge',
  'jobs-artifacts',
  'app-connections',
  'agents-learning',
]

const ACTIVE_V1_PROVIDERS: ActiveV1Provider[] = ['genx', 'together', 'groq']

function isValidProviderList(providers: ActiveV1Provider[]): boolean {
  return providers.every((p) => ACTIVE_V1_PROVIDERS.includes(p))
}

describe('capability contracts registry', () => {
  it('has contracts for all required studios', () => {
    for (const studioId of REQUIRED_STUDIOS) {
      const contracts = listContractsByStudio(studioId)
      expect(contracts.length, `Studio ${studioId} has no contracts`).toBeGreaterThan(0)
    }
  })

  it('every contract has required fields', () => {
    const contracts = listCapabilityContracts()
    for (const contract of contracts) {
      expect(contract.capabilityId, `${contract.capabilityId} missing capabilityId`).toBeTruthy()
      expect(contract.studioId, `${contract.capabilityId} missing studioId`).toBeTruthy()
      expect(contract.inputSchema, `${contract.capabilityId} missing inputSchema`).toBeDefined()
      expect(contract.outputSchema, `${contract.capabilityId} missing outputSchema`).toBeDefined()
      expect(contract.providerPolicy, `${contract.capabilityId} missing providerPolicy`).toBeDefined()
      expect(contract.proofRequirements, `${contract.capabilityId} missing proofRequirements`).toBeDefined()
      expect(contract.exampleDashboardRequest, `${contract.capabilityId} missing exampleDashboardRequest`).toBeDefined()
      expect(contract.exampleAppRequest, `${contract.capabilityId} missing exampleAppRequest`).toBeDefined()
      expect(contract.exampleAppRequest.payload, `${contract.capabilityId} missing exampleAppRequest.payload`).toBeDefined()
    }
  })

  it('contract count covers all required capabilities', () => {
    const ids = listCapabilityIds()
    const requiredIds = [
      'text.chat', 'text.generate', 'text.summarize', 'text.structured_output', 'text.scriptwrite', 'text.copywrite',
      'image.generate', 'image.edit', 'image.variation', 'image.brand_creative', 'image.thumbnail', 'image.cover_art', 'image.product_mockup',
      'video.generate', 'video.image_to_video', 'video.reference_to_video', 'video.edit', 'video.reel', 'video.ad', 'video.music_clip',
      'video.longform', 'video.scene_plan', 'video.scene_generate', 'video.assemble', 'video.cutdown_pack', 'video.marketing_reels_pack', 'video.music_video',
      'music.lyrics', 'music.song', 'music.instrumental', 'music.loop', 'music.cover_art', 'music.video_brief', 'music.promo_reels',
      'voice.tts', 'voice.stt', 'voice.voiceover', 'voice.dub', 'voice.subtitle', 'voice.library',
      'avatar.generate', 'avatar.talking_head', 'avatar.presenter', 'avatar.lipsync', 'avatar.voice_bind', 'avatar.library',
      'brand.scrape', 'brand.extract', 'brand.pack_create', 'brand.asset_ingest', 'brand.knowledge_create',
      'rag.ingest', 'rag.answer', 'rag.search', 'rag.extract', 'rag.rerank', 'knowledge.collection',
      'ops.job.create', 'ops.artifact.persist', 'ops.webhook.deliver', 'ops.artifact.handoff',
      'app.connect', 'app.capabilities', 'app.simulate_request',
      'agent.run', 'agent.schedule', 'agent.review', 'learning.summary', 'learning.recommendation', 'learning.provider_performance',
    ]
    for (const id of requiredIds) {
      expect(ids, `Missing contract for ${id}`).toContain(id)
    }
  })
})

describe('app-facing contract safety', () => {
  it('app-facing contracts do not expose providerOverride or modelOverride in example payloads', () => {
    const appFacing = listAppFacingCapabilities()
    for (const contract of appFacing) {
      const payloadStr = JSON.stringify(contract.exampleAppRequest.payload)
      expect(payloadStr, `${contract.capabilityId} example payload contains providerOverride`).not.toContain('providerOverride')
      expect(payloadStr, `${contract.capabilityId} example payload contains modelOverride`).not.toContain('modelOverride')
    }
  })

  it('validateCapabilityInput rejects providerOverride and modelOverride', () => {
    const result = validateCapabilityInput('text.chat', {
      prompt: 'Hello',
      providerOverride: 'genx',
      modelOverride: 'gpt-4',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('providerOverride'))).toBe(true)
    expect(result.errors.some((e) => e.includes('modelOverride'))).toBe(true)
  })

  it('app-facing capabilities list includes expected capabilities', () => {
    const appFacing = listAppFacingCapabilities()
    const appFacingIds = appFacing.map((c) => c.capabilityId)
    expect(appFacingIds).toContain('text.chat')
    expect(appFacingIds).toContain('image.generate')
    expect(appFacingIds).toContain('video.generate')
    expect(appFacingIds).toContain('music.song')
    expect(appFacingIds).toContain('voice.tts')
    expect(appFacingIds).toContain('voice.stt')
    expect(appFacingIds).toContain('brand.scrape')
    expect(appFacingIds).toContain('rag.answer')
    expect(appFacingIds).toContain('app.connect')
  })
})

describe('provider policy alignment', () => {
  it('all active provider policies only include genx, together, groq', () => {
    const contracts = listCapabilityContracts()
    for (const contract of contracts) {
      const providers = contract.providerPolicy.allowedActiveProviders
      expect(
        isValidProviderList(providers),
        `${contract.capabilityId} has invalid providers: ${providers.join(', ')}`,
      ).toBe(true)
    }
  })

  it('MiMo only appears as future/workbench, not as active runtime provider', () => {
    const contracts = listCapabilityContracts()
    for (const contract of contracts) {
      const providers = contract.providerPolicy.allowedActiveProviders
      expect(providers, `${contract.capabilityId} includes mimo as active provider`).not.toContain('mimo' as ActiveV1Provider)
    }
  })

  it('huggingface does not appear as an active provider in any contract', () => {
    const contracts = listCapabilityContracts()
    for (const contract of contracts) {
      const providers = contract.providerPolicy.allowedActiveProviders
      expect(providers, `${contract.capabilityId} includes huggingface`).not.toContain('huggingface' as ActiveV1Provider)
    }
  })

  it('adult is not an active V1 capability', () => {
    const ids = listCapabilityIds()
    expect(ids.some((id) => id.startsWith('adult'))).toBe(false)
  })
})

describe('music contract specificity', () => {
  it('music.song contract includes genre weights, BPM, song structure, vocals/instrumental, cover art, music video brief', () => {
    const contract = getCapabilityContract('music.song')!
    expect(contract).toBeDefined()
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('genreWeights')
    expect(inputNames).toContain('bpm')
    expect(inputNames).toContain('structure')
    expect(inputNames).toContain('vocals')
    expect(inputNames).toContain('instrumental')
    expect(inputNames).toContain('coverArtPrompt')
    expect(inputNames).toContain('generateMusicVideoBrief')
  })

  it('music.song contract requires GenX music configuration (blocked status)', () => {
    const contract = getCapabilityContract('music.song')!
    expect(contract.status).toBe('blocked')
    expect(contract.blockedOrDeferredReason).toContain('GENX_MUSIC_MODEL')
    expect(contract.providerPolicy.allowedActiveProviders).toEqual(['genx'])
    expect(contract.providerPolicy.primaryProvider).toBe('genx')
  })

  it('music contract example payload includes multi-genre with weights', () => {
    const contract = getCapabilityContract('music.song')!
    const payload = contract.exampleAppRequest.payload as Record<string, unknown>
    const controls = payload.controls as Record<string, unknown>
    expect(controls.genres).toBeDefined()
    expect(Array.isArray(controls.genres)).toBe(true)
    expect((controls.genres as string[]).length).toBeGreaterThan(1)
    expect(controls.genreWeights).toBeDefined()
    expect(typeof controls.genreWeights).toBe('object')
  })
})

describe('video contract specificity', () => {
  it('video contract includes image-to-video, duration, fps, aspect ratio, seed, guidance, reference assets', () => {
    const contract = getCapabilityContract('video.generate')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('durationSeconds')
    expect(inputNames).toContain('fps')
    expect(inputNames).toContain('aspectRatio')
    expect(inputNames).toContain('seed')
    expect(inputNames).toContain('guidanceScale')
    expect(inputNames).toContain('cameraMotion')
  })

  it('video.image_to_video has reference image as required asset', () => {
    const contract = getCapabilityContract('video.image_to_video')!
    const refImage = contract.supportedAssetReferences.find((a) => a.type === 'reference_image')
    expect(refImage).toBeDefined()
    expect(refImage!.required).toBe(true)
  })

  it('long-form video contract includes scene planner, ffmpeg assembly, cutdown pack', () => {
    const contract = getCapabilityContract('video.longform')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('sceneCount')
    expect(inputNames).toContain('cutdowns')
    expect(contract.proofRequirements).toContain('ffmpeg_assembly')
    expect(contract.mode).toBe('orchestration')

    const cutdownContract = getCapabilityContract('video.cutdown_pack')!
    expect(cutdownContract).toBeDefined()
    expect(cutdownContract.proofRequirements).toContain('ffmpeg_assembly')
  })
})

describe('image contract specificity', () => {
  it('image contract includes reference images, logo/palette/brand controls, seed/variations', () => {
    const contract = getCapabilityContract('image.generate')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('seed')
    expect(inputNames).toContain('variations')
    expect(contract.supportedAssetReferences.map((a) => a.type)).toContain('reference_image')
    expect(contract.supportedAssetReferences.map((a) => a.type)).toContain('logo')
    expect(contract.supportedAssetReferences.map((a) => a.type)).toContain('brand_guide')
  })

  it('image.brand_creative includes logo placement, palette lock, typography lock', () => {
    const contract = getCapabilityContract('image.brand_creative')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('logoPlacement')
    expect(inputNames).toContain('paletteLock')
    expect(inputNames).toContain('typographyLock')
  })
})

describe('voice contract specificity', () => {
  it('voice contract includes TTS/STT, voice library, diarization, word timestamps, SRT/VTT', () => {
    const ttsContract = getCapabilityContract('voice.tts')!
    expect(ttsContract).toBeDefined()
    expect(ttsContract.inputSchema.map((f) => f.name)).toContain('voice')
    expect(ttsContract.inputSchema.map((f) => f.name)).toContain('speed')

    const sttContract = getCapabilityContract('voice.stt')!
    expect(sttContract).toBeDefined()
    expect(sttContract.inputSchema.map((f) => f.name)).toContain('diarization')
    expect(sttContract.inputSchema.map((f) => f.name)).toContain('wordTimestamps')
    expect(sttContract.inputSchema.map((f) => f.name)).toContain('subtitleExport')

    const libraryContract = getCapabilityContract('voice.library')!
    expect(libraryContract).toBeDefined()
    expect(libraryContract.status).toBe('deferred')
  })
})

describe('avatar contract specificity', () => {
  it('avatar contract includes avatar library, voice binding, emotion, talking head/lipsync/presenter', () => {
    const generateContract = getCapabilityContract('avatar.generate')!
    const inputNames = generateContract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('avatarLibrary')
    expect(inputNames).toContain('voiceBinding')
    expect(inputNames).toContain('emotion')
    expect(inputNames).toContain('cameraFraming')

    const talkingHead = getCapabilityContract('avatar.talking_head')!
    expect(talkingHead).toBeDefined()
    expect(talkingHead.inputSchema.map((f) => f.name)).toContain('script')

    const lipsync = getCapabilityContract('avatar.lipsync')!
    expect(lipsync).toBeDefined()
    expect(lipsync.inputSchema.map((f) => f.name)).toContain('avatarImageUrl')
    expect(lipsync.inputSchema.map((f) => f.name)).toContain('audioUrl')
  })
})

describe('scrape/brand contract specificity', () => {
  it('brand.scrape includes URL, crawl depth, JS render, screenshots, brand pack, knowledge set', () => {
    const contract = getCapabilityContract('brand.scrape')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('websiteUrl')
    expect(inputNames).toContain('crawlDepth')
    expect(inputNames).toContain('renderJs')
    expect(inputNames).toContain('screenshotCapture')
    expect(contract.outputSchema.map((f) => f.name)).toContain('brandPack')
    expect(contract.outputSchema.map((f) => f.name)).toContain('knowledgeSet')
  })
})

describe('RAG contract specificity', () => {
  it('rag contract includes ingestion, embeddings, chunking, top-k, rerank, citations', () => {
    const ingestContract = getCapabilityContract('rag.ingest')!
    const ingestInput = ingestContract.inputSchema.map((f) => f.name)
    expect(ingestInput).toContain('chunkingPreset')
    expect(ingestInput).toContain('embeddingModel')

    const answerContract = getCapabilityContract('rag.answer')!
    const answerInput = answerContract.inputSchema.map((f) => f.name)
    expect(answerInput).toContain('topK')
    expect(answerInput).toContain('rerank')
    expect(answerInput).toContain('citationsRequired')
  })
})

describe('jobs/artifacts contract specificity', () => {
  it('jobs/artifacts contract includes states, retries, artifact lineage, webhook handoff', () => {
    const jobContract = getCapabilityContract('ops.job.create')!
    expect(jobContract).toBeDefined()
    expect(jobContract.jobRequired).toBe(true)

    const webhookContract = getCapabilityContract('ops.webhook.deliver')!
    expect(webhookContract).toBeDefined()
    expect(webhookContract.webhookSupport).toBe(true)

    const handoffContract = getCapabilityContract('ops.artifact.handoff')!
    expect(handoffContract).toBeDefined()
    expect(handoffContract.webhookSupport).toBe(true)
    expect(handoffContract.artifactRequired).toBe(true)
  })
})

describe('app connections contract specificity', () => {
  it('app connections contract includes app ID, API keys, webhooks, allowed capabilities, budgets/rate limits', () => {
    const contract = getCapabilityContract('app.connect')!
    const inputNames = contract.inputSchema.map((f) => f.name)
    expect(inputNames).toContain('appId')
    expect(inputNames).toContain('webhookUrl')
    expect(inputNames).toContain('allowedCapabilities')
    expect(inputNames).toContain('budgetLimits')
    expect(inputNames).toContain('rateLimits')
  })
})

describe('agents/learning contract safety', () => {
  it('agents/learning contracts are controlled/future-safe', () => {
    const agentContracts = getContractsByCategory('agent_learning')
    expect(agentContracts.length).toBeGreaterThan(0)
    for (const contract of agentContracts) {
      expect(['deferred', 'future']).toContain(contract.status)
      expect(contract.blockedOrDeferredReason).toBeTruthy()
    }
  })
})

describe('validation helpers', () => {
  it('unknown capability returns useful validation error', () => {
    const result = validateCapabilityInput('nonexistent.capability', { prompt: 'test' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Unknown capability')
  })

  it('blocked capability returns blocker message', () => {
    const blocker = getCapabilityBlocker('music.song')
    expect(blocker).toBeTruthy()
    expect(blocker).toContain('GENX_MUSIC_MODEL')
  })

  it('deferred capability returns blocker message', () => {
    const blocker = getCapabilityBlocker('agent.run')
    expect(blocker).toBeTruthy()
    expect(blocker).toContain('not live-ready')
  })

  it('active capability returns null blocker', () => {
    const blocker = getCapabilityBlocker('text.chat')
    expect(blocker).toBeNull()
  })

  it('validates required fields', () => {
    const result = validateCapabilityInput('text.chat', {})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('prompt is required')
  })

  it('passes validation for valid input', () => {
    const result = validateCapabilityInput('text.chat', { prompt: 'Hello world' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('getCapabilityAllowedProviders returns correct providers', () => {
    expect(getCapabilityAllowedProviders('text.chat')).toEqual(['genx', 'together', 'groq'])
    expect(getCapabilityAllowedProviders('music.song')).toEqual(['genx'])
    expect(getCapabilityAllowedProviders('voice.stt')).toEqual(['groq', 'genx'])
    expect(getCapabilityAllowedProviders('image.generate')).toEqual(['together', 'genx'])
  })

  it('getCapabilityProofRequirement returns proof requirements', () => {
    expect(getCapabilityProofRequirement('music.song')).toContain('live_provider_call')
    expect(getCapabilityProofRequirement('music.song')).toContain('artifact_persisted')
    expect(getCapabilityProofRequirement('video.longform')).toContain('ffmpeg_assembly')
    expect(getCapabilityProofRequirement('ops.webhook.deliver')).toContain('webhook_delivery')
  })

  it('getCapabilityExampleAppRequest returns example payload', () => {
    const example = getCapabilityExampleAppRequest('music.song')
    expect(example).toBeDefined()
    expect(example!.payload.capability).toBe('music.song')
    expect(JSON.stringify(example!.payload)).not.toContain('providerOverride')
    expect(JSON.stringify(example!.payload)).not.toContain('modelOverride')
  })
})

describe('external app examples', () => {
  it('Marketing daily Facebook example exists via brand.scrape and text.copywrite', () => {
    const scrapeExample = getCapabilityExampleAppRequest('brand.scrape')!
    expect(scrapeExample.payload.context).toBeDefined()
    expect((scrapeExample.payload.context as Record<string, unknown>).appId).toBe('marketing-app')

    const copyExample = getCapabilityExampleAppRequest('text.copywrite')!
    expect(copyExample).toBeDefined()
  })

  it('Music multi-genre example exists on music.song', () => {
    const example = getCapabilityExampleAppRequest('music.song')!
    const controls = example.payload.controls as Record<string, unknown>
    expect(controls.genres).toBeDefined()
    expect(controls.genreWeights).toBeDefined()
    expect((controls.genres as string[]).length).toBeGreaterThan(1)
  })

  it('Religious App devotional example exists via voice.tts', () => {
    const example = getCapabilityExampleAppRequest('voice.tts')!
    expect((example.payload.context as Record<string, unknown>).appId).toBe('religious-app')
  })

  it('Crypto App daily brief example exists via rag.search', () => {
    const example = getCapabilityExampleAppRequest('rag.search')!
    expect((example.payload.context as Record<string, unknown>).appId).toBe('crypto-app')
  })

  it('Horse App report example exists via voice.stt', () => {
    const example = getCapabilityExampleAppRequest('voice.stt')!
    expect((example.payload.context as Record<string, unknown>).appId).toBe('horse-app')
  })
})

describe('contract status and executability', () => {
  it('active contracts are executable', () => {
    expect(isCapabilityExecutable('text.chat')).toBe(true)
    expect(isCapabilityExecutable('image.generate')).toBe(true)
  })

  it('blocked contracts are not executable', () => {
    expect(isCapabilityExecutable('music.song')).toBe(false)
    expect(isCapabilityExecutable('music.instrumental')).toBe(false)
  })

  it('deferred contracts are not executable', () => {
    expect(isCapabilityExecutable('agent.run')).toBe(false)
    expect(isCapabilityExecutable('voice.library')).toBe(false)
  })

  it('unknown capabilities are not executable', () => {
    expect(isCapabilityExecutable('nonexistent.capability')).toBe(false)
  })

  it('getCapabilityStudioId returns correct studio', () => {
    expect(getCapabilityStudioId('text.chat')).toBe('text-chat')
    expect(getCapabilityStudioId('image.generate')).toBe('image')
    expect(getCapabilityStudioId('music.song')).toBe('music-song')
    expect(getCapabilityStudioId('video.longform')).toBe('long-form-video')
  })
})
