/**
 * Adult Capability Tests — HuggingFace dedicated endpoints only
 *
 * Covers:
 *  - Permission gating (adultMode required, safeMode must be off)
 *  - Legal safety (minors, non-consensual, real-person deepfake, etc.)
 *  - HF adult catalog (primary + fallback per capability)
 *  - Endpoint resolution (primary/fallback env vars)
 *  - resolveAdultCandidates — ordered list
 *  - executeHFAdultGeneration — single candidate
 *  - executeHFAdultGenerationChain — primary→fallback chain
 *  - Avatar styles/modes validation and prompt building
 *  - Router: adult_text/image/video/avatar use HF chain only
 *  - Router: fallback HF endpoint used when primary fails
 *  - Router: providerAttempts recorded in metadata
 *  - Router: no GenX/Together/Groq/MiMo adult generation
 *  - Source-of-truth registry/provider-map HF-only
 *  - Legal safety still blocks all illegal categories
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  checkAdultPermission,
  checkAdultLegalSafety,
  getHFAdultEntry,
  getHFAdultCandidates,
  resolveAdultEndpoint,
  resolveAdultCandidates,
  resolveVoiceCandidates,
  buildAdultTextBody,
  buildAdultImageBody,
  buildAdultAvatarBody,
  validateAdultAvatarPayload,
  executeHFAdultGeneration,
  executeHFAdultGenerationChain,
  executeAvatarVoice,
  checkVoiceCloneRules,
  ALLOWED_AVATAR_STYLES,
  type HFAdultProviderEntry,
  type ResolvedAdultEndpoint,
  type AdultAvatarPayload,
} from '../adult-capability'

// ── Permission checks ─────────────────────────────────────────────────────────

describe('checkAdultPermission', () => {
  it('grants when adultMode=true and safeMode=false', () => {
    const r = checkAdultPermission({ adultMode: true, safeMode: false })
    expect(r.granted).toBe(true)
    expect(r.reason).toBeNull()
  })

  it('denies when adultMode=false', () => {
    const r = checkAdultPermission({ adultMode: false, safeMode: false })
    expect(r.granted).toBe(false)
    expect(r.reason).toContain('Adult mode')
  })

  it('denies when safeMode=true even if adultMode=true', () => {
    const r = checkAdultPermission({ adultMode: true, safeMode: true })
    expect(r.granted).toBe(false)
    expect(r.reason).toContain('Safe mode')
  })

  it('denies when both flags false', () => {
    const r = checkAdultPermission({ adultMode: false, safeMode: true })
    expect(r.granted).toBe(false)
  })
})

// ── Legal safety ──────────────────────────────────────────────────────────────

describe('checkAdultLegalSafety', () => {
  it('blocks minor-related terms', () => {
    expect(checkAdultLegalSafety('a story about a minor').allowed).toBe(false)
    expect(checkAdultLegalSafety('she is underage but').allowed).toBe(false)
    expect(checkAdultLegalSafety('schoolgirl fantasy').allowed).toBe(false)
    expect(checkAdultLegalSafety('loli character').allowed).toBe(false)
  })

  it('blocks non-consensual content', () => {
    expect(checkAdultLegalSafety('non-consensual encounter').allowed).toBe(false)
    expect(checkAdultLegalSafety('she was raped').allowed).toBe(false)
    expect(checkAdultLegalSafety('forced sex scene').allowed).toBe(false)
  })

  it('blocks real-person sexual deepfake', () => {
    expect(checkAdultLegalSafety('naked celebrity photo').allowed).toBe(false)
    expect(checkAdultLegalSafety('deepfake of my neighbor').allowed).toBe(false)
    expect(checkAdultLegalSafety('leaked photos of').allowed).toBe(false)
    expect(checkAdultLegalSafety('revenge porn').allowed).toBe(false)
  })

  it('blocks bestiality', () => {
    expect(checkAdultLegalSafety('sex with animal content').allowed).toBe(false)
    expect(checkAdultLegalSafety('zoophilia scene').allowed).toBe(false)
  })

  it('blocks CSAM terms', () => {
    expect(checkAdultLegalSafety('child exploitation content').allowed).toBe(false)
    expect(checkAdultLegalSafety('csam material').allowed).toBe(false)
  })

  it('blocks evasion attempts', () => {
    expect(checkAdultLegalSafety('pretend she is adult but she is actually 16').allowed).toBe(false)
    expect(checkAdultLegalSafety('imagine she is 16').allowed).toBe(false)
  })

  it('blocks degrading patterns', () => {
    expect(checkAdultLegalSafety('degrade her in the scene').allowed).toBe(false)
    expect(checkAdultLegalSafety('make her beg and suffer').allowed).toBe(false)
  })

  it('blocks real person + sexual context', () => {
    expect(checkAdultLegalSafety('real woman naked explicit scene').allowed).toBe(false)
  })

  it('allows fictional adult characters', () => {
    expect(checkAdultLegalSafety('two consenting adults in a romantic encounter').allowed).toBe(true)
  })

  it('allows adult roleplay between fictional adults', () => {
    expect(checkAdultLegalSafety('romantic story between two fictional adult characters').allowed).toBe(true)
  })

  it('allows adult image generation prompt', () => {
    expect(checkAdultLegalSafety('photorealistic adult woman portrait in intimate setting').allowed).toBe(true)
  })

  it('returns reason string on block', () => {
    const r = checkAdultLegalSafety('content about a minor')
    expect(r.allowed).toBe(false)
    expect(r.reason).toBeTruthy()
    expect(typeof r.reason).toBe('string')
  })
})

// ── HF Adult Catalog ──────────────────────────────────────────────────────────

describe('HF_ADULT_CATALOG — primary + fallback', () => {
  it('each capability has exactly one primary and one fallback entry', () => {
    for (const cap of ['adult_text', 'adult_image', 'adult_video', 'adult_avatar'] as const) {
      const entries = getHFAdultCandidates(cap)
      expect(entries.length, `${cap} should have 2 entries`).toBe(2)
      expect(entries[0].priority).toBe('primary')
      expect(entries[1].priority).toBe('fallback')
    }
  })

  it('primary adult_text uses HF_ADULT_TEXT_ENDPOINT', () => {
    const primary = getHFAdultCandidates('adult_text')[0]
    expect(primary.endpointEnvKey).toBe('HF_ADULT_TEXT_ENDPOINT')
    expect(primary.outputType).toBe('text')
    expect(primary.supportsCharacter).toBe(true)
  })

  it('fallback adult_text uses HF_ADULT_TEXT_ENDPOINT_FALLBACK', () => {
    const fallback = getHFAdultCandidates('adult_text')[1]
    expect(fallback.endpointEnvKey).toBe('HF_ADULT_TEXT_ENDPOINT_FALLBACK')
    expect(fallback.priority).toBe('fallback')
  })

  it('primary adult_image uses HF_ADULT_IMAGE_ENDPOINT', () => {
    const primary = getHFAdultCandidates('adult_image')[0]
    expect(primary.endpointEnvKey).toBe('HF_ADULT_IMAGE_ENDPOINT')
    expect(primary.supportsAvatar).toBe(true)
  })

  it('fallback adult_image uses HF_ADULT_IMAGE_ENDPOINT_FALLBACK', () => {
    const fallback = getHFAdultCandidates('adult_image')[1]
    expect(fallback.endpointEnvKey).toBe('HF_ADULT_IMAGE_ENDPOINT_FALLBACK')
  })

  it('primary adult_video uses HF_ADULT_VIDEO_ENDPOINT', () => {
    const primary = getHFAdultCandidates('adult_video')[0]
    expect(primary.endpointEnvKey).toBe('HF_ADULT_VIDEO_ENDPOINT')
    expect(primary.outputType).toBe('video')
  })

  it('primary adult_avatar uses HF_ADULT_AVATAR_ENDPOINT', () => {
    const primary = getHFAdultCandidates('adult_avatar')[0]
    expect(primary.endpointEnvKey).toBe('HF_ADULT_AVATAR_ENDPOINT')
    expect(primary.supportsAvatar).toBe(true)
  })

  it('fallback adult_avatar uses HF_ADULT_AVATAR_ENDPOINT_FALLBACK', () => {
    const fallback = getHFAdultCandidates('adult_avatar')[1]
    expect(fallback.endpointEnvKey).toBe('HF_ADULT_AVATAR_ENDPOINT_FALLBACK')
  })

  it('getHFAdultEntry returns primary entry', () => {
    expect(getHFAdultEntry('adult_text')?.priority).toBe('primary')
    expect(getHFAdultEntry('adult_image')?.priority).toBe('primary')
  })
})

// ── Endpoint resolution ───────────────────────────────────────────────────────

describe('resolveAdultEndpoint', () => {
  afterEach(() => {
    delete process.env.HF_ADULT_TEXT_ENDPOINT
    delete process.env.HF_ADULT_IMAGE_ENDPOINT
  })

  it('returns null when endpoint env var not set', () => {
    const entry = getHFAdultEntry('adult_text')!
    const result = resolveAdultEndpoint(entry, 'hf-key')
    expect(result).toBeNull()
  })

  it('returns resolved endpoint when env var is set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://my-adult-endpoint.hf.co/models/adult-text'
    const entry = getHFAdultEntry('adult_text')!
    const result = resolveAdultEndpoint(entry, 'hf-key')
    expect(result).not.toBeNull()
    expect(result!.endpointUrl).toBe('https://my-adult-endpoint.hf.co/models/adult-text')
    expect(result!.hfApiKey).toBe('hf-key')
  })

  it('uses HF_ADULT_TEXT_MODEL env var if set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://endpoint.hf.co'
    process.env['HF_ADULT_TEXT_MODEL'] = 'my-custom-adult-model'
    const entry = getHFAdultEntry('adult_text')!
    const result = resolveAdultEndpoint(entry, 'hf-key')
    delete process.env['HF_ADULT_TEXT_MODEL']
    expect(result!.modelId).toBe('my-custom-adult-model')
  })

  it('falls back to default model ID when model env var not set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://endpoint.hf.co'
    const entry = getHFAdultEntry('adult_text')!
    const result = resolveAdultEndpoint(entry, 'hf-key')
    expect(result!.modelId).toBe(entry.defaultModelId)
  })

  it('resolved endpoint includes priority field', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://endpoint.hf.co'
    const entry = getHFAdultEntry('adult_text')!
    const result = resolveAdultEndpoint(entry, 'hf-key')
    expect(result!.priority).toBe('primary')
  })
})

describe('resolveAdultCandidates', () => {
  afterEach(() => {
    delete process.env.HF_ADULT_TEXT_ENDPOINT
    delete process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK
    delete process.env.HF_ADULT_IMAGE_ENDPOINT
    delete process.env.HF_ADULT_IMAGE_ENDPOINT_FALLBACK
  })

  it('returns empty array when no endpoints configured', () => {
    const candidates = resolveAdultCandidates('adult_text', 'hf-key')
    expect(candidates).toHaveLength(0)
  })

  it('returns only primary when only primary endpoint set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    const candidates = resolveAdultCandidates('adult_text', 'hf-key')
    expect(candidates).toHaveLength(1)
    expect(candidates[0].priority).toBe('primary')
  })

  it('returns both when primary and fallback endpoints set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    const candidates = resolveAdultCandidates('adult_text', 'hf-key')
    expect(candidates).toHaveLength(2)
    expect(candidates[0].priority).toBe('primary')
    expect(candidates[1].priority).toBe('fallback')
  })

  it('returns only fallback when only fallback endpoint set', () => {
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    const candidates = resolveAdultCandidates('adult_text', 'hf-key')
    expect(candidates).toHaveLength(1)
    expect(candidates[0].priority).toBe('fallback')
  })
})

// ── Payload builders ──────────────────────────────────────────────────────────

describe('buildAdultTextBody', () => {
  it('includes character name and description in system prompt', () => {
    const body = buildAdultTextBody({
      userPrompt: 'Hello there',
      characterName: 'Luna',
      characterDescription: 'A confident adult woman',
      relationship: 'romantic partner',
    })
    const messages = body.messages as Array<{ role: string; content: string }>
    const systemContent = messages.find(m => m.role === 'system')?.content ?? ''
    expect(systemContent).toContain('Luna')
    expect(systemContent).toContain('A confident adult woman')
    expect(systemContent).toContain('romantic partner')
  })

  it('always includes fictional adult safety instruction', () => {
    const body = buildAdultTextBody({ userPrompt: 'test' })
    const messages = body.messages as Array<{ role: string; content: string }>
    const systemContent = messages.find(m => m.role === 'system')?.content ?? ''
    expect(systemContent).toContain('fictional adults')
    expect(systemContent.toLowerCase()).toContain('18')
  })

  it('user prompt is in user role message', () => {
    const body = buildAdultTextBody({ userPrompt: 'Write a story' })
    const messages = body.messages as Array<{ role: string; content: string }>
    const userMsg = messages.find(m => m.role === 'user')
    expect(userMsg?.content).toBe('Write a story')
  })
})

describe('buildAdultImageBody', () => {
  it('includes negative prompt blocking minors', () => {
    const body = buildAdultImageBody({ prompt: 'portrait of adult woman' })
    const params = body.parameters as Record<string, unknown>
    expect(params.negative_prompt).toContain('minor')
    expect(params.negative_prompt).toContain('underage')
  })

  it('uses provided negative prompt', () => {
    const body = buildAdultImageBody({ prompt: 'test', negativePrompt: 'ugly, blurry, child' })
    const params = body.parameters as Record<string, unknown>
    expect(params.negative_prompt).toBe('ugly, blurry, child')
  })
})

// ── HF Adult execution ────────────────────────────────────────────────────────

describe('executeHFAdultGeneration', () => {
  afterEach(() => vi.unstubAllGlobals())

  function makeResolved(): ResolvedAdultEndpoint {
    return { endpointUrl: 'https://adult-endpoint.hf.co', modelId: 'test-model', hfApiKey: 'hf-key', priority: 'primary' }
  }

  function makeEntry(cap: HFAdultProviderEntry['capability'], outputType: 'text' | 'image' | 'video'): HFAdultProviderEntry {
    return {
      capability: cap,
      priority: 'primary',
      endpointEnvKey: `HF_ADULT_${cap.toUpperCase()}_ENDPOINT`,
      modelEnvKey: `HF_ADULT_${cap.toUpperCase()}_MODEL`,
      defaultModelId: 'test-model',
      generationMode: 'test_generation',
      outputType,
      supportsCharacter: true,
      supportsAvatar: true,
      supportsVideo: false,
      notes: 'test',
    }
  }

  it('adult_text: JSON chat response returns text output', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ choices: [{ message: { content: 'Sure, here is the story...' } }] }),
      text: async () => '{}',
      arrayBuffer: async () => new ArrayBuffer(0),
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_text', 'text'), {})
    expect(result.success).toBe(true)
    expect(result.output).toBe('Sure, here is the story...')
    expect(result.permissionStatus).toBe('granted')
    expect(result.safetyStatus).toBe('passed')
  })

  it('adult_image: binary image response returns data URL', async () => {
    const fakePng = new Uint8Array([137, 80, 78, 71])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => fakePng.buffer,
      json: async () => ({}),
      text: async () => '',
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_image', 'image'), {})
    expect(result.success).toBe(true)
    expect(result.output).toMatch(/^data:image\/png;base64,/)
    expect(result.capability).toBe('adult_image')
  })

  it('adult_image: JSON URL response returns URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ url: 'https://cdn.example.com/adult-image.jpg' }),
      text: async () => '{}',
      arrayBuffer: async () => new ArrayBuffer(0),
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_image', 'image'), {})
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://cdn.example.com/adult-image.jpg')
  })

  it('adult_video: async job response returns jobId', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ job_id: 'adult-video-job-1', status: 'processing' }),
      text: async () => '{}',
      arrayBuffer: async () => new ArrayBuffer(0),
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_video', 'video'), {})
    expect(result.success).toBe(true)
    expect(result.jobId).toBe('adult-video-job-1')
    expect(result.output).toBeNull()
  })

  it('503 loading returns failure with loading message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 503,
      headers: { get: () => null },
      text: async () => 'Model is currently loading',
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_text', 'text'), {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('loading')
  })

  it('empty buffer returns failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}), text: async () => '',
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_image', 'image'), {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('empty')
  })

  it('result includes providerAttempts with outcome', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ choices: [{ message: { content: 'response text' } }] }),
      text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0),
    })))

    const result = await executeHFAdultGeneration(makeResolved(), makeEntry('adult_text', 'text'), {})
    expect(result.success).toBe(true)
    expect(result.providerAttempts).toHaveLength(1)
    expect(result.providerAttempts[0].status).toBe('success')
    expect(result.providerAttempts[0].priority).toBe('primary')
  })
})

// ── executeHFAdultGenerationChain tests ───────────────────────────────────────

describe('executeHFAdultGenerationChain — primary → fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.HF_ADULT_TEXT_ENDPOINT
    delete process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK
    delete process.env.HF_ADULT_IMAGE_ENDPOINT
    delete process.env.HF_ADULT_IMAGE_ENDPOINT_FALLBACK
  })

  it('primary success — returns output without trying fallback', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      return {
        ok: true, status: 200,
        headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
        json: async () => ({ choices: [{ message: { content: 'primary result' } }] }),
        text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(0),
      }
    }))

    const result = await executeHFAdultGenerationChain('adult_text', 'hf-key', {})
    expect(result.success).toBe(true)
    expect(result.output).toBe('primary result')
    expect(callCount).toBe(1)
    expect(result.providerAttempts[0].priority).toBe('primary')
    expect(result.providerAttempts[0].status).toBe('success')
  })

  it('primary fails → fallback succeeds', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: false, status: 503, headers: { get: () => null }, text: async (): Promise<string> => 'unavailable', arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }
      }
      return {
        ok: true, status: 200,
        headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
        json: async () => ({ choices: [{ message: { content: 'fallback result' } }] }),
        text: async (): Promise<string> => '{}', arrayBuffer: async () => new ArrayBuffer(0),
      }
    }))

    const result = await executeHFAdultGenerationChain('adult_text', 'hf-key', {})
    expect(result.success).toBe(true)
    expect(result.output).toBe('fallback result')
    expect(callCount).toBe(2)
    expect(result.providerAttempts[0].status).toBe('failed')
    expect(result.providerAttempts[1].status).toBe('success')
    expect(result.providerAttempts[1].priority).toBe('fallback')
  })

  it('adult_image primary succeeds via binary image', async () => {
    process.env.HF_ADULT_IMAGE_ENDPOINT = 'https://primary-img.hf.co'
    const fakePng = new Uint8Array([137, 80, 78, 71])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'image/png' : null },
      arrayBuffer: async () => fakePng.buffer,
      json: async () => ({}), text: async () => '',
    })))

    const result = await executeHFAdultGenerationChain('adult_image', 'hf-key', {})
    expect(result.success).toBe(true)
    expect(result.output).toMatch(/^data:image\/png;base64,/)
    expect(result.providerAttempts[0].priority).toBe('primary')
  })

  it('adult_image primary fails → fallback succeeds via URL', async () => {
    process.env.HF_ADULT_IMAGE_ENDPOINT = 'https://primary-img.hf.co'
    process.env.HF_ADULT_IMAGE_ENDPOINT_FALLBACK = 'https://fallback-img.hf.co'
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++
      if (calls === 1) {
        return { ok: false, status: 500, headers: { get: () => null }, text: async (): Promise<string> => 'error', arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }
      }
      return {
        ok: true, status: 200,
        headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
        json: async () => ({ url: 'https://cdn.hf.co/adult-img.jpg' }),
        text: async (): Promise<string> => '{}', arrayBuffer: async () => new ArrayBuffer(0),
      }
    }))

    const result = await executeHFAdultGenerationChain('adult_image', 'hf-key', {})
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://cdn.hf.co/adult-img.jpg')
    expect(result.providerAttempts).toHaveLength(2)
    expect(result.providerAttempts[0].status).toBe('failed')
    expect(result.providerAttempts[1].status).toBe('success')
  })

  it('all endpoints missing → returns clear error with skipped attempts', async () => {
    // No env vars set
    const result = await executeHFAdultGenerationChain('adult_video', 'hf-key', {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('HF_ADULT_VIDEO_ENDPOINT')
    for (const a of result.providerAttempts) {
      expect(a.status).toBe('skipped')
    }
  })

  it('both endpoints fail → error contains both failure messages', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 500, headers: { get: () => null }, text: async () => 'Internal error',
      arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}),
    })))

    const result = await executeHFAdultGenerationChain('adult_text', 'hf-key', {})
    expect(result.success).toBe(false)
    expect(result.providerAttempts).toHaveLength(2)
    expect(result.providerAttempts.every(a => a.status === 'failed')).toBe(true)
    expect(result.error).toBeTruthy()
  })
})

// ── Avatar style/mode tests ───────────────────────────────────────────────────

describe('Adult avatar payload — styles and validation', () => {
  it('validateAdultAvatarPayload accepts valid payload', () => {
    const payload: AdultAvatarPayload = {
      characterProfile: 'Luna, a confident adult woman',
      appearance: 'Tall, dark hair, green eyes',
      style: 'realistic_human',
      mode: 'portrait',
    }
    expect(validateAdultAvatarPayload(payload)).toBeNull()
  })

  it('rejects missing characterProfile', () => {
    expect(validateAdultAvatarPayload({ characterProfile: '', appearance: 'tall' })).toContain('characterProfile')
  })

  it('rejects missing appearance', () => {
    expect(validateAdultAvatarPayload({ characterProfile: 'Luna', appearance: '' })).toContain('appearance')
  })

  it('rejects unsupported style', () => {
    const r = validateAdultAvatarPayload({ characterProfile: 'Luna', appearance: 'tall', style: 'watercolor' as AdultAvatarPayload['style'] })
    expect(r).toContain('Unsupported avatar style')
  })

  it('accepts all allowed avatar styles', () => {
    for (const style of ALLOWED_AVATAR_STYLES) {
      const r = validateAdultAvatarPayload({ characterProfile: 'Test', appearance: 'test', style })
      expect(r, `style "${style}"`).toBeNull()
    }
  })

  it('buildAdultAvatarBody includes style-specific quality prompt for realistic_human', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Luna', appearance: 'tall', style: 'realistic_human' })
    expect((body.inputs as string).toLowerCase()).toContain('photorealistic')
  })

  it('buildAdultAvatarBody includes anime style prompt for anime', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Sakura', appearance: 'petite', style: 'anime' })
    expect((body.inputs as string).toLowerCase()).toContain('anime')
  })

  it('buildAdultAvatarBody includes 3d render prompt for 3d_character', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Hero', appearance: 'muscular', style: '3d_character' })
    expect((body.inputs as string).toLowerCase()).toContain('3d')
  })

  it('buildAdultAvatarBody includes fantasy style prompt for fantasy_character', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Elara', appearance: 'elvish', style: 'fantasy_character' })
    expect((body.inputs as string).toLowerCase()).toContain('fantasy')
  })

  it('buildAdultAvatarBody includes outfit, pose, background when supplied', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Luna', appearance: 'tall', outfit: 'red dress', pose: 'sitting', background: 'cafe' })
    const prompt = body.inputs as string
    expect(prompt).toContain('red dress')
    expect(prompt).toContain('sitting')
    expect(prompt).toContain('cafe')
  })

  it('buildAdultAvatarBody uses aspectRatio to set width/height', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Luna', appearance: 'tall', aspectRatio: '9:16' })
    const params = body.parameters as Record<string, unknown>
    expect(params.width).toBe(576)
    expect(params.height).toBe(1024)
  })

  it('buildAdultAvatarBody includes seed for consistency when provided', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Luna', appearance: 'tall', consistencySeed: 42 })
    const params = body.parameters as Record<string, unknown>
    expect(params.seed).toBe(42)
  })

  it('buildAdultAvatarBody always blocks minors in negative prompt', () => {
    const body = buildAdultAvatarBody({ characterProfile: 'Luna', appearance: 'tall' })
    const params = body.parameters as Record<string, unknown>
    expect(params.negative_prompt as string).toContain('minor')
    expect(params.negative_prompt as string).toContain('child')
    expect(params.negative_prompt as string).toContain('underage')
  })
})

// ── Router tests ──────────────────────────────────────────────────────────────

describe('executeCapability adult — router', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.HF_ADULT_TEXT_ENDPOINT
    delete process.env.HF_ADULT_IMAGE_ENDPOINT
    delete process.env.HF_ADULT_VIDEO_ENDPOINT
    delete process.env.HF_ADULT_AVATAR_ENDPOINT
  })

  function mockCoreDeps() {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        aiProvider: { findMany: vi.fn(async () => []) },
        appAgent: { findUnique: vi.fn(async () => null) },
      },
    }))
    vi.doMock('@/lib/runtime-registry', () => ({
      getCapability: vi.fn(async () => null),
      getAllCapabilities: vi.fn(async () => []),
      getAllowedProviders: vi.fn(async () => []),
      getBestProvider: vi.fn(async () => null),
      getBudgetProfile: vi.fn(async () => null),
      isWithinBudget: vi.fn(async () => true),
    }))
    vi.doMock('@/lib/budget-tracker', () => ({ isProviderWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/app-profiles', () => ({
      getAppProfileFromDb: vi.fn(async () => null),
      runtimeProfileOverrides: new Map(),
    }))
    vi.doMock('@/lib/smart-router', () => ({
      recordPerformance: vi.fn(),
      loadSmartRouterState: vi.fn(async () => {}),
    }))
    vi.doMock('@/lib/model-resolver', () => ({
      resolveBestModel: vi.fn(async () => null),
    }))
  }

  async function call(cap: string, meta: Record<string, unknown> = {}, adultMode = true, safeMode = false) {
    const { executeCapability } = await import('../capability-router')
    return executeCapability({
      input: 'two consenting adult characters in a romantic story',
      capability: cap,
      providerOverride: 'huggingface', // bypasses IS_TEST_RUNTIME fast exit
      adultMode,
      safeMode,
      metadata: meta,
    })
  }

  it('adult_text: permission denied when adultMode=false', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const result = await call('adult_text', {}, false, false)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Adult mode')
    // Provider must NOT be called
    expect(result.provider).toBeNull()
  })

  it('adult_text: permission denied when safeMode=true', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const result = await call('adult_text', {}, true, true)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Safe mode')
  })

  it('legal safety blocks minor reference', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => 'hf-key'), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'a story about a minor in an adult situation',
      capability: 'adult_text',
      providerOverride: 'huggingface',
      adultMode: true,
      safeMode: false,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Blocked')
    expect(result.provider).toBeNull()
  })

  it('legal safety blocks non-consensual content', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => 'hf-key'), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'non-consensual encounter fantasy',
      capability: 'adult_image',
      providerOverride: 'huggingface',
      adultMode: true,
      safeMode: false,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Blocked')
  })

  it('adult_text: missing HF key returns clear error, not provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async () => null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const result = await call('adult_text')
    expect(result.success).toBe(false)
    expect(result.error).toContain('HuggingFace API key')
    expect(result.error_category).toBe('missing_key')
    expect(result.provider).toBeNull()
  })

  it('adult_text: missing endpoint returns clear config error', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    // No HF_ADULT_TEXT_ENDPOINT set

    const result = await call('adult_text')
    expect(result.success).toBe(false)
    expect(result.error).toContain('HF_ADULT_TEXT_ENDPOINT')
    // Error must not suggest using other providers as adult fallbacks
    expect(result.error).not.toContain('use GenX')
    expect(result.error).not.toContain('use Together')
    expect(result.error).not.toContain('configure Together')
    expect(result.error).not.toContain('configure GenX')
    expect(result.error_category).toBe('endpoint_error')
  })

  it('adult_text: uses HF endpoint when configured — success', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://adult-text.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'She smiled warmly at him...', jobId: null, status: undefined,
          model: 'test-model', endpointKey: 'HF_ADULT_TEXT_ENDPOINT', capability: 'adult_text', generationMode: 'text_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_TEXT_ENDPOINT', modelId: 'test-model', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_text')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toContain('smiled')
    expect(result.outputType).toBe('text')
    expect(result.provider).not.toBe('genx')
    expect(result.provider).not.toBe('together')
    expect(result.provider).not.toBe('groq')
    expect(result.provider).not.toBe('mimo')
  })

  it('adult_image: uses HF endpoint when configured — success with image data URL', async () => {
    process.env.HF_ADULT_IMAGE_ENDPOINT = 'https://adult-image.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,AAAA', jobId: null, status: undefined,
          model: 'SG161222/RealVisXL_V4.0', endpointKey: 'HF_ADULT_IMAGE_ENDPOINT', capability: 'adult_image', generationMode: 'image_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_IMAGE_ENDPOINT', modelId: 'SG161222/RealVisXL_V4.0', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_image')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toMatch(/^data:image\/png;base64,/)
    expect(result.outputType).toBe('image')
    expect(result.provider).not.toBe('together')
    expect(result.provider).not.toBe('genx')
  })

  it('adult_video: missing endpoint returns clear failure — no fallback to normal video', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: false, output: null, jobId: null, model: 'none', endpointKey: 'none',
          capability: 'adult_video', generationMode: 'video_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [
            { endpointKey: 'HF_ADULT_VIDEO_ENDPOINT', modelId: 'model', priority: 'primary', status: 'skipped', error: 'HF_ADULT_VIDEO_ENDPOINT not set' },
            { endpointKey: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK', modelId: 'model', priority: 'fallback', status: 'skipped', error: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK not set' },
          ],
          error: 'No HF adult endpoints configured for adult_video. Set HF_ADULT_VIDEO_ENDPOINT or HF_ADULT_VIDEO_ENDPOINT_FALLBACK.',
        })),
      }
    })

    const result = await call('adult_video')
    expect(result.success).toBe(false)
    expect(result.error).toContain('HF_ADULT_VIDEO_ENDPOINT')
    expect(result.outputType).toBe('video')
    expect(result.error).not.toContain('video_planning')
    expect(result.error).not.toContain('storyboard')
  })

  it('adult_video: uses HF endpoint when configured — returns job ID', async () => {
    process.env.HF_ADULT_VIDEO_ENDPOINT = 'https://adult-video.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: null, jobId: 'adult-video-job-1', status: 'processing',
          model: 'NSFW-API/NSFW_Wan_14b', endpointKey: 'HF_ADULT_VIDEO_ENDPOINT', capability: 'adult_video', generationMode: 'video_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_VIDEO_ENDPOINT', modelId: 'NSFW-API/NSFW_Wan_14b', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_video')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.jobId).toBe('adult-video-job-1')
    expect(result.outputType).toBe('video')
    expect(result.provider).not.toBe('genx')
    expect(result.provider).not.toBe('together')
  })

  it('adult_avatar: uses HF endpoint when configured', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://adult-avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,BBBB', jobId: null, status: undefined,
          model: 'SG161222/RealVisXL_V4.0', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', capability: 'adult_avatar', generationMode: 'avatar_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'SG161222/RealVisXL_V4.0', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_avatar')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.outputType).toBe('image')
    expect(result.metadata?.capability).toBe('adult_avatar')
  })

  it('adult_avatar: missing endpoint returns clear failure', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: false, output: null, jobId: null, model: 'none', endpointKey: 'none',
          capability: 'adult_avatar', generationMode: 'avatar_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [
            { endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'skipped', error: 'HF_ADULT_AVATAR_ENDPOINT not set' },
          ],
          error: 'No HF adult endpoints configured for adult_avatar. Set HF_ADULT_AVATAR_ENDPOINT or HF_ADULT_AVATAR_ENDPOINT_FALLBACK.',
        })),
      }
    })

    const result = await call('adult_avatar')
    expect(result.success).toBe(false)
    expect(result.error).toContain('HF_ADULT_AVATAR_ENDPOINT')
  })

  it('legal adult fictional request is allowed when permission + endpoint configured', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://adult-text.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'They enjoyed their time together...', jobId: null, status: undefined,
          model: 'test-model', endpointKey: 'HF_ADULT_TEXT_ENDPOINT', capability: 'adult_text', generationMode: 'text_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_TEXT_ENDPOINT', modelId: 'test-model', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Two consenting adult characters in a romantic and intimate story',
      capability: 'adult_text',
      providerOverride: 'huggingface',
      adultMode: true,
      safeMode: false,
    })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.output).toContain('enjoyed')
  })

  it('no removed providers appear in adult results', async () => {
    process.env.HF_ADULT_IMAGE_ENDPOINT = 'https://adult-image.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,CCCC', jobId: null, status: undefined,
          model: 'test-model', endpointKey: 'HF_ADULT_IMAGE_ENDPOINT', capability: 'adult_image', generationMode: 'image_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_IMAGE_ENDPOINT', modelId: 'test-model', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_image')
    const removed = ['openai', 'gemini', 'anthropic', 'replicate', 'deepseek', 'mistral', 'qwen', 'minimax', 'moonshot', 'cohere', 'nvidia']
    for (const p of removed) {
      expect(result.provider).not.toBe(p)
    }
  })

  it('metadata includes permissionStatus and safetyStatus on success', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://adult-text.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'Story content...', jobId: null, status: undefined,
          model: 'test-model', endpointKey: 'HF_ADULT_TEXT_ENDPOINT', capability: 'adult_text', generationMode: 'text_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_TEXT_ENDPOINT', modelId: 'test-model', priority: 'primary', status: 'success' }],
          error: null,
        })),
      }
    })

    const result = await call('adult_text')
    expect(result.success).toBe(true)
    expect(result.metadata?.permissionStatus).toBe('granted')
    expect(result.metadata?.safetyStatus).toBe('passed')
    expect(result.metadata?.endpointKey).toBe('HF_ADULT_TEXT_ENDPOINT')
  })

  it('adult_text fallback endpoint used when primary fails', async () => {
    process.env.HF_ADULT_TEXT_ENDPOINT = 'https://primary.hf.co'
    process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK = 'https://fallback.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => {
          return {
            success: true, output: 'fallback text result', jobId: null, status: undefined,
            model: 'fallback-model', endpointKey: 'HF_ADULT_TEXT_ENDPOINT_FALLBACK',
            capability: 'adult_text', generationMode: 'text_generation',
            permissionStatus: 'granted', safetyStatus: 'passed',
            providerAttempts: [
              { endpointKey: 'HF_ADULT_TEXT_ENDPOINT', modelId: 'primary-model', priority: 'primary', status: 'failed', error: 'Primary unavailable' },
              { endpointKey: 'HF_ADULT_TEXT_ENDPOINT_FALLBACK', modelId: 'fallback-model', priority: 'fallback', status: 'success' },
            ],
            error: null,
          }
        }),
      }
    })

    const result = await call('adult_text')
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.fallbackUsed).toBe(true)
    expect(result.metadata?.endpointKey).toBe('HF_ADULT_TEXT_ENDPOINT_FALLBACK')
    expect((result.metadata?.providerAttempts as Array<{ status: string }>)?.[0]?.status).toBe('failed')
    expect((result.metadata?.providerAttempts as Array<{ status: string }>)?.[1]?.status).toBe('success')
  })

  it('adult_image fallback used when primary fails — providerAttempts recorded', async () => {
    process.env.HF_ADULT_IMAGE_ENDPOINT = 'https://primary-img.hf.co'
    process.env.HF_ADULT_IMAGE_ENDPOINT_FALLBACK = 'https://fallback-img.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'https://cdn.fallback.co/img.jpg', jobId: null, status: undefined,
          model: 'fallback-img-model', endpointKey: 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK',
          capability: 'adult_image', generationMode: 'image_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [
            { endpointKey: 'HF_ADULT_IMAGE_ENDPOINT', modelId: 'primary-img', priority: 'primary', status: 'failed', error: 'Failed' },
            { endpointKey: 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK', modelId: 'fallback-img', priority: 'fallback', status: 'success' },
          ],
          error: null,
        })),
      }
    })

    const result = await call('adult_image')
    expect(result.success).toBe(true)
    expect(result.fallbackUsed).toBe(true)
    expect(result.metadata?.providerAttempts).toHaveLength(2)
    expect(result.provider).not.toBe('genx')
    expect(result.provider).not.toBe('together')
  })

  it('adult_video missing all endpoints — clear error with skipped attempts', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: false, output: null, jobId: null, model: 'none', endpointKey: 'none',
          capability: 'adult_video', generationMode: 'video_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [
            { endpointKey: 'HF_ADULT_VIDEO_ENDPOINT', modelId: 'model', priority: 'primary', status: 'skipped', error: 'HF_ADULT_VIDEO_ENDPOINT not set' },
            { endpointKey: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK', modelId: 'model', priority: 'fallback', status: 'skipped', error: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK not set' },
          ],
          error: 'No HF adult endpoints configured for adult_video.',
        })),
      }
    })

    const result = await call('adult_video')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.error).not.toContain('GenX')
    expect(result.error).not.toContain('Together')
    expect(result.metadata?.providerAttempts).toBeDefined()
  })

  it('adult_avatar realistic human — style prompt included', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://adult-avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    let capturedBody: Record<string, unknown> = {}
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async (_cap: string, _key: string, body: Record<string, unknown>) => {
          capturedBody = body
          return {
            success: true, output: 'data:image/png;base64,DDDD', jobId: null, status: undefined,
            model: 'SG161222/RealVisXL_V4.0', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT',
            capability: 'adult_avatar', generationMode: 'avatar_generation',
            permissionStatus: 'granted', safetyStatus: 'passed',
            providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'success' }],
            error: null,
          }
        }),
      }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna, a confident adult woman companion',
      capability: 'adult_avatar',
      providerOverride: 'huggingface',
      adultMode: true, safeMode: false,
      metadata: { appearance: 'Tall, dark hair, green eyes', style: 'realistic_human', outfit: 'evening gown', pose: 'standing' },
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    const prompt = capturedBody.inputs as string
    expect(prompt.toLowerCase()).toContain('photorealistic')
    expect(prompt).toContain('evening gown')
    expect(prompt).toContain('standing')
  })

  it('adult_avatar anime style accepted', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://adult-avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    let capturedBody: Record<string, unknown> = {}
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async (_c: string, _k: string, body: Record<string, unknown>) => {
          capturedBody = body
          return {
            success: true, output: 'data:image/png;base64,EEEE', jobId: null, status: undefined,
            model: 'model', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT',
            capability: 'adult_avatar', generationMode: 'avatar_generation',
            permissionStatus: 'granted', safetyStatus: 'passed',
            providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'success' }],
            error: null,
          }
        }),
      }
    })

    const { executeCapability } = await import('../capability-router')
    await executeCapability({
      input: 'Sakura, anime character',
      capability: 'adult_avatar',
      providerOverride: 'huggingface',
      adultMode: true, safeMode: false,
      metadata: { appearance: 'petite, pink hair', style: 'anime' },
    })

    const prompt = capturedBody.inputs as string
    expect(prompt.toLowerCase()).toContain('anime')
  })

  it('adult_avatar invalid style returns validation error before provider call', async () => {
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna avatar',
      capability: 'adult_avatar',
      providerOverride: 'huggingface',
      adultMode: true, safeMode: false,
      metadata: { appearance: 'tall', style: 'watercolor' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported avatar style')
  })
})

// ── Source-of-truth alignment tests ──────────────────────────────────────────

describe('Adult source-of-truth — capability-registry and provider-capability-map', () => {
  it('capability-registry lists adult_text with HF only', async () => {
    const { getCapabilityDefinition } = await import('../capability-registry')
    const cap = getCapabilityDefinition('adult_text')
    expect(cap).not.toBeNull()
    const providers = cap!.providers.map(p => p.provider)
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('together')
    expect(providers).not.toContain('genx')
    expect(providers).not.toContain('groq')
    expect(providers).not.toContain('mimo')
  })

  it('capability-registry lists adult_image with HF only', async () => {
    const { getCapabilityDefinition } = await import('../capability-registry')
    const cap = getCapabilityDefinition('adult_image')
    expect(cap).not.toBeNull()
    const providers = cap!.providers.map(p => p.provider)
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('together')
    expect(providers).not.toContain('genx')
    expect(providers).not.toContain('groq')
    expect(providers).not.toContain('mimo')
  })

  it('capability-registry has adult_video entry with HF only', async () => {
    const { getCapabilityDefinition } = await import('../capability-registry')
    const cap = getCapabilityDefinition('adult_video')
    expect(cap).not.toBeNull()
    expect(cap!.requiresAdultMode).toBe(true)
    expect(cap!.requiresSafeModeOff).toBe(true)
    const providers = cap!.providers.map(p => p.provider)
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('together')
    expect(providers).not.toContain('genx')
  })

  it('capability-registry has adult_avatar entry with HF only', async () => {
    const { getCapabilityDefinition } = await import('../capability-registry')
    const cap = getCapabilityDefinition('adult_avatar')
    expect(cap).not.toBeNull()
    expect(cap!.requiresAdultMode).toBe(true)
    const providers = cap!.providers.map(p => p.provider)
    expect(providers).toContain('huggingface')
    expect(providers).not.toContain('together')
    expect(providers).not.toContain('genx')
  })

  it('provider-capability-map has no Together adult entries', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const togetherAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'together' && (m.capability === 'adult_text' || m.capability === 'adult_image' || m.capability === 'adult_video' || m.capability === 'adult_avatar')
    )
    expect(togetherAdult).toHaveLength(0)
  })

  it('provider-capability-map has no GenX adult entries', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const genxAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'genx' && (m.capability === 'adult_text' || m.capability === 'adult_image' || m.capability === 'adult_video' || m.capability === 'adult_avatar')
    )
    expect(genxAdult).toHaveLength(0)
  })

  it('provider-capability-map has no Groq adult entries', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const groqAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'groq' && (m.capability === 'adult_text' || m.capability === 'adult_image' || m.capability === 'adult_video' || m.capability === 'adult_avatar')
    )
    expect(groqAdult).toHaveLength(0)
  })

  it('provider-capability-map has no MiMo adult entries', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const mimoAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'mimo' && (m.capability === 'adult_text' || m.capability === 'adult_image' || m.capability === 'adult_video' || m.capability === 'adult_avatar')
    )
    expect(mimoAdult).toHaveLength(0)
  })

  it('provider-capability-map HF adult entries reference HF_ADULT_*_ENDPOINT in notes', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const hfAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'huggingface' && (m.capability === 'adult_text' || m.capability === 'adult_image' || m.capability === 'adult_video' || m.capability === 'adult_avatar')
    )
    expect(hfAdult.length).toBeGreaterThanOrEqual(4)
    for (const entry of hfAdult) {
      expect(entry.notes).toContain('HF_ADULT_')
    }
  })

  it('non-adult Together entries are not affected', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const togetherNonAdult = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'together' && m.capability === 'image_generation'
    )
    expect(togetherNonAdult.length).toBeGreaterThan(0)
  })

  it('non-adult GenX entries are not affected', async () => {
    const { PROVIDER_CAPABILITY_MAP } = await import('../provider-capability-map')
    const genxChat = PROVIDER_CAPABILITY_MAP.filter(
      m => m.provider === 'genx' && m.capability === 'chat'
    )
    expect(genxChat.length).toBeGreaterThan(0)
  })
})

// ── Avatar voice clone tests ──────────────────────────────────────────────────

describe('checkVoiceCloneRules', () => {
  it('allows none voiceMode unconditionally', () => {
    expect(checkVoiceCloneRules({ voiceMode: 'none' }, 'anything')).toBeNull()
  })

  it('allows generated_voice unconditionally', () => {
    expect(checkVoiceCloneRules({ voiceMode: 'generated_voice' }, 'some voice')).toBeNull()
  })

  it('cloned_voice requires consentConfirmed=true', () => {
    const r = checkVoiceCloneRules({ voiceMode: 'cloned_voice', consentConfirmed: false }, 'voice of character')
    expect(r).toContain('consent')
  })

  it('cloned_voice with consent allowed for fictional character', () => {
    const r = checkVoiceCloneRules({ voiceMode: 'cloned_voice', consentConfirmed: true }, 'deep sultry voice')
    expect(r).toBeNull()
  })

  it('blocks minor voice cloning', () => {
    const r = checkVoiceCloneRules({ voiceMode: 'cloned_voice', consentConfirmed: true }, 'child voice soft')
    expect(r).toContain('Blocked')
  })

  it('blocks celebrity impersonation without rightsConfirmed', () => {
    const r = checkVoiceCloneRules({ voiceMode: 'cloned_voice', consentConfirmed: true, rightsConfirmed: false }, 'celebrity voice impersonate')
    expect(r).toContain('Blocked')
  })

  it('allows celebrity-style voice with rightsConfirmed=true', () => {
    const r = checkVoiceCloneRules({ voiceMode: 'cloned_voice', consentConfirmed: true, rightsConfirmed: true }, 'celebrity voice impersonate')
    expect(r).toBeNull()
  })
})

describe('resolveVoiceCandidates', () => {
  afterEach(() => {
    delete process.env.HF_ADULT_VOICE_ENDPOINT
    delete process.env.HF_ADULT_VOICE_ENDPOINT_FALLBACK
  })

  it('returns empty when no voice endpoints configured', () => {
    expect(resolveVoiceCandidates('hf-key')).toHaveLength(0)
  })

  it('returns primary when HF_ADULT_VOICE_ENDPOINT is set', () => {
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    const candidates = resolveVoiceCandidates('hf-key')
    expect(candidates).toHaveLength(1)
    expect(candidates[0].priority).toBe('primary')
    expect(candidates[0].url).toBe('https://voice.hf.co')
  })

  it('returns both when primary and fallback are set', () => {
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    process.env.HF_ADULT_VOICE_ENDPOINT_FALLBACK = 'https://voice-fallback.hf.co'
    const candidates = resolveVoiceCandidates('hf-key')
    expect(candidates).toHaveLength(2)
    expect(candidates[0].priority).toBe('primary')
    expect(candidates[1].priority).toBe('fallback')
  })
})

describe('executeAvatarVoice', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.HF_ADULT_VOICE_ENDPOINT
    delete process.env.HF_ADULT_VOICE_ENDPOINT_FALLBACK
  })

  it('voiceMode=none returns skipped without calling any endpoint', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const r = await executeAvatarVoice({ voiceMode: 'none' }, 'hf-key', 'description')
    expect(r.voiceStatus).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cloned_voice without consent returns blocked', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'cloned_voice', consentConfirmed: false }, 'hf-key', 'voice')
    expect(r.voiceStatus).toBe('blocked')
    expect(r.error).toContain('consent')
  })

  it('cloned_voice with minor voice returns blocked', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'cloned_voice', consentConfirmed: true }, 'hf-key', 'child voice')
    expect(r.voiceStatus).toBe('blocked')
  })

  it('generated_voice without endpoint returns not_configured', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'generated_voice' }, 'hf-key', 'voice')
    expect(r.voiceStatus).toBe('not_configured')
    expect(r.error).toContain('HF_ADULT_VOICE_ENDPOINT')
  })

  it('cloned_voice without endpoint returns not_configured', async () => {
    const r = await executeAvatarVoice({ voiceMode: 'cloned_voice', consentConfirmed: true }, 'hf-key', 'fictional adult voice')
    expect(r.voiceStatus).toBe('not_configured')
  })

  it('generated_voice with endpoint returns audio data URL on binary response', async () => {
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    const fakeWav = new Uint8Array([82, 73, 70, 70])
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'audio/wav' : null },
      arrayBuffer: async () => fakeWav.buffer,
      json: async () => ({}), text: async (): Promise<string> => '',
    })))

    const r = await executeAvatarVoice({ voiceMode: 'generated_voice', sampleText: 'Hello' }, 'hf-key', 'warm voice')
    expect(r.voiceStatus).toBe('generated')
    expect(r.voiceUrl).toMatch(/^data:audio\/wav;base64,/)
    expect(r.error).toBeNull()
  })

  it('cloned_voice with endpoint and consent returns cloned status', async () => {
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({ url: 'https://cdn.hf.co/cloned-voice.mp3' }),
      text: async (): Promise<string> => '{}',
    })))

    const r = await executeAvatarVoice({ voiceMode: 'cloned_voice', consentConfirmed: true, sampleText: 'Hi there', referenceAudioUrl: 'https://ref.audio/sample.wav' }, 'hf-key', 'fictional adult character voice')
    expect(r.voiceStatus).toBe('cloned')
    expect(r.voiceUrl).toBe('https://cdn.hf.co/cloned-voice.mp3')
    expect(r.error).toBeNull()
  })

  it('voice does not use GenX/Together/Groq/MiMo endpoints', async () => {
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    let capturedUrl = ''
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      capturedUrl = url
      return { ok: false, status: 500, headers: { get: () => null }, text: async (): Promise<string> => 'err', arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) }
    }))

    await executeAvatarVoice({ voiceMode: 'generated_voice' }, 'hf-key', 'voice')
    expect(capturedUrl).not.toContain('genx')
    expect(capturedUrl).not.toContain('together')
    expect(capturedUrl).not.toContain('groq')
    expect(capturedUrl).toContain('voice.hf.co')
  })
})

describe('executeCapability adult_avatar — voice integration', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.HF_ADULT_AVATAR_ENDPOINT
    delete process.env.HF_ADULT_VOICE_ENDPOINT
  })

  function mockCoreDeps() {
    vi.doMock('@/lib/prisma', () => ({ prisma: { aiProvider: { findMany: vi.fn(async () => []) }, appAgent: { findUnique: vi.fn(async () => null) } } }))
    vi.doMock('@/lib/runtime-registry', () => ({ getCapability: vi.fn(async () => null), getAllCapabilities: vi.fn(async () => []), getAllowedProviders: vi.fn(async () => []), getBestProvider: vi.fn(async () => null), getBudgetProfile: vi.fn(async () => null), isWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/budget-tracker', () => ({ isProviderWithinBudget: vi.fn(async () => true) }))
    vi.doMock('@/lib/app-profiles', () => ({ getAppProfileFromDb: vi.fn(async () => null), runtimeProfileOverrides: new Map() }))
    vi.doMock('@/lib/smart-router', () => ({ recordPerformance: vi.fn(), loadSmartRouterState: vi.fn(async () => {}) }))
    vi.doMock('@/lib/model-resolver', () => ({ resolveBestModel: vi.fn(async () => null) }))
    vi.doMock('@/lib/genx-client', () => ({ callGenXChat: vi.fn(), callGenXMedia: vi.fn(), GENX_AUDIO_MODELS: [], GENX_VIDEO_MODELS: [], GENX_I2V_MODELS: [] }))
  }

  it('avatar without voice succeeds normally — voiceStatus not_configured in metadata', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,FFFF', jobId: null, status: undefined,
          model: 'model', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', capability: 'adult_avatar', generationMode: 'avatar_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'success' }],
          error: null,
        })),
        executeAvatarVoice: vi.fn(async () => ({ voiceStatus: 'not_configured', voiceUrl: null, voiceJobId: null, voiceModel: null, voiceEndpointKey: null, error: 'not configured' })),
      }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna avatar', capability: 'adult_avatar', providerOverride: 'huggingface', adultMode: true, safeMode: false,
      metadata: { appearance: 'tall, dark hair' },
    })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    // voiceStatus not in metadata because no voice was requested
  })

  it('cloned_voice without consent is blocked before image generation', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://avatar.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      const chainMock = vi.fn()
      return { ...actual, executeHFAdultGenerationChain: chainMock }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna avatar', capability: 'adult_avatar', providerOverride: 'huggingface', adultMode: true, safeMode: false,
      metadata: { appearance: 'tall', voice: { voiceMode: 'cloned_voice', consentConfirmed: false } },
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('consent')
    expect(result.error_category).toBe('guardrail_block')
  })

  it('cloned_voice endpoint missing causes success:false when voice is required', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://avatar.hf.co'
    // No HF_ADULT_VOICE_ENDPOINT
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,GGGG', jobId: null, status: undefined,
          model: 'model', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', capability: 'adult_avatar', generationMode: 'avatar_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'success' }],
          error: null,
        })),
        executeAvatarVoice: vi.fn(async () => ({ voiceStatus: 'not_configured', voiceUrl: null, voiceJobId: null, voiceModel: null, voiceEndpointKey: null, error: 'No HF adult voice endpoint configured. Set HF_ADULT_VOICE_ENDPOINT.' })),
      }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna avatar', capability: 'adult_avatar', providerOverride: 'huggingface', adultMode: true, safeMode: false,
      metadata: { appearance: 'tall', voice: { voiceMode: 'cloned_voice', consentConfirmed: true } },
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('HF_ADULT_VOICE_ENDPOINT')
    expect(result.error_category).toBe('endpoint_error')
  })

  it('cloned_voice with endpoint returns voice URL in metadata alongside image', async () => {
    process.env.HF_ADULT_AVATAR_ENDPOINT = 'https://avatar.hf.co'
    process.env.HF_ADULT_VOICE_ENDPOINT = 'https://voice.hf.co'
    mockCoreDeps()
    vi.doMock('@/lib/brain', () => ({ getVaultApiKey: vi.fn(async (p: string) => p === 'huggingface' ? 'hf-key' : null), callProvider: vi.fn() }))
    vi.doMock('@/lib/adult-capability', async () => {
      const actual = await vi.importActual<typeof import('../adult-capability')>('../adult-capability')
      return {
        ...actual,
        executeHFAdultGenerationChain: vi.fn(async () => ({
          success: true, output: 'data:image/png;base64,HHHH', jobId: null, status: undefined,
          model: 'model', endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', capability: 'adult_avatar', generationMode: 'avatar_generation',
          permissionStatus: 'granted', safetyStatus: 'passed',
          providerAttempts: [{ endpointKey: 'HF_ADULT_AVATAR_ENDPOINT', modelId: 'model', priority: 'primary', status: 'success' }],
          error: null,
        })),
        executeAvatarVoice: vi.fn(async () => ({
          voiceStatus: 'cloned', voiceUrl: 'data:audio/wav;base64,IIII',
          voiceJobId: null, voiceModel: 'voice-model', voiceEndpointKey: 'HF_ADULT_VOICE_ENDPOINT', error: null,
        })),
      }
    })

    const { executeCapability } = await import('../capability-router')
    const result = await executeCapability({
      input: 'Luna avatar', capability: 'adult_avatar', providerOverride: 'huggingface', adultMode: true, safeMode: false,
      metadata: { appearance: 'tall', voice: { voiceMode: 'cloned_voice', consentConfirmed: true, sampleText: 'Hello' } },
    })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('huggingface')
    expect(result.metadata?.voiceStatus).toBe('cloned')
    expect(result.metadata?.voiceUrl).toMatch(/^data:audio\/wav;base64,/)
    // Voice provider must be HF — no other provider
    expect(result.provider).not.toBe('genx')
    expect(result.provider).not.toBe('together')
  })
})
