import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import {
  ACTIVE_DASHBOARD_PROVIDER_IDS,
  CAPABILITY_STUDIOS,
  DASHBOARD_CONTROL_ROOM_SECTIONS,
  FUTURE_DASHBOARD_PROVIDER_IDS,
  PLANNED_CONNECTED_APPS,
  PROVIDER_MODEL_SURFACE,
} from '@/lib/dashboard-control-room'

const root = process.cwd()
function read(rel: string) { return fs.readFileSync(path.join(root, 'src', rel), 'utf8') }
function exists(rel: string) { return fs.existsSync(path.join(root, rel)) }
function srcExists(rel: string) { return fs.existsSync(path.join(root, 'src', rel)) }

describe('dashboard control room navigation', () => {
  const requiredLabels = [
    'Command Center',
    'Studio',
    'Capabilities',
    'Jobs & Artifacts',
    'App Connections',
    'Providers & Models',
    'Agents & Learning',
    'Settings',
  ] as const

  it('has exactly 8 primary nav sections', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([...requiredLabels])
    expect(DASHBOARD_CONTROL_ROOM_SECTIONS.map((item) => item.label)).toEqual([...requiredLabels])
    expect(DASHBOARD_NAV_ITEMS.length).toBe(8)
  })

  it('does not expose Adult as an active dashboard section', () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label).join(' ')).not.toMatch(/Adult/i)
    expect(DASHBOARD_CONTROL_ROOM_SECTIONS.map((item) => item.label).join(' ')).not.toMatch(/Adult/i)
  })

  it('does not include removed clutter sections in nav', () => {
    const labels = DASHBOARD_NAV_ITEMS.map((item) => item.label)
    for (const removed of ['App Runtime', 'Assets', 'Automation', 'Memory', 'Proof', 'Libraries', 'Readiness', 'Truth', 'VPS', 'Labs', 'App Builder', 'Provider Governance', 'Provider Contracts', 'Webhooks / Handoff', 'System / Settings']) {
      expect(labels).not.toContain(removed)
    }
  })

  it('does not create duplicate dashboard-v2, router-v2, or proof-v2 folders', () => {
    expect(exists('dashboard-v2')).toBe(false)
    expect(exists('router-v2')).toBe(false)
    expect(exists('provider-router-v2')).toBe(false)
    expect(exists('proof-v2')).toBe(false)
  })
})

describe('provider model surface', () => {
  it('active dashboard providers are exactly GenX, Together, and Groq', () => {
    expect([...ACTIVE_DASHBOARD_PROVIDER_IDS]).toEqual(['genx', 'together', 'groq'])
    expect(PROVIDER_MODEL_SURFACE.filter((p) => p.runtimeStatus === 'active_v1').map((p) => p.providerId)).toEqual(['genx', 'together', 'groq'])
  })

  it('shows MiMo as future/workbench only', () => {
    expect([...FUTURE_DASHBOARD_PROVIDER_IDS]).toEqual(['mimo'])
    expect(PROVIDER_MODEL_SURFACE.find((p) => p.providerId === 'mimo')?.runtimeStatus).toBe('future_workbench')
  })

  it('does not show Hugging Face as active provider', () => {
    expect(PROVIDER_MODEL_SURFACE.map((p) => p.providerId)).not.toContain('huggingface')
    expect(read('app/admin/dashboard/providers/page.tsx')).not.toContain('Hugging Face')
  })
})

describe('capability studio architecture', () => {
  const requiredStudios = [
    'Text & Chat Studio',
    'Image Studio',
    'Video Studio',
    'Long-form Video Studio',
    'Music / Song Studio',
    'Voice Studio',
    'Avatar Studio',
    'Scrape / Brand Studio',
    'RAG / Knowledge Studio',
  ] as const

  it.each(requiredStudios)('includes %s', (studioName) => {
    expect(CAPABILITY_STUDIOS.map((studio) => studio.displayName)).toContain(studioName)
  })

  it('has exactly 9 studio tabs', () => {
    expect(CAPABILITY_STUDIOS.length).toBe(9)
  })

  it('all studios include capability ids and example app request payloads', () => {
    for (const studio of CAPABILITY_STUDIOS) {
      expect(studio.capabilityIds.length, studio.displayName).toBeGreaterThan(0)
      expect(studio.exampleAppRequestPayload, studio.displayName).toBeTruthy()
      expect(JSON.stringify(studio.exampleAppRequestPayload), studio.displayName).not.toMatch(/providerOverride|modelOverride/)
    }
  })

  it('Music Studio includes required song controls and genres', () => {
    const music = CAPABILITY_STUDIOS.find((studio) => studio.id === 'music-song')!
    for (const token of ['genreWeights', 'bpmTempoRange', 'vocals', 'instrumental', 'intro', 'verse', 'chorus', 'bridge', 'coverArtPrompt', 'generateMusicVideoBrief']) {
      expect(music.controls).toContain(token)
    }
    expect(JSON.stringify(music.exampleAppRequestPayload)).toContain('amapiano')
    expect(JSON.stringify(music.exampleAppRequestPayload)).toContain('gospel')
  })

  it('Video Studio includes required video modes and settings', () => {
    const video = CAPABILITY_STUDIOS.find((studio) => studio.id === 'video')!
    for (const token of ['standardVideoMode', 'imageToVideo', 'klingKeyframeMode', 'durationSeconds', 'fps', 'aspectRatio', 'seed', 'guidanceScale', 'referenceImages']) {
      expect(video.controls).toContain(token)
    }
  })

  it('Image Studio includes prompt, negative prompt, aspect ratio, seed, variations, references, and brand controls', () => {
    const image = CAPABILITY_STUDIOS.find((studio) => studio.id === 'image')!
    for (const token of ['prompt', 'negativePrompt', 'aspectRatio', 'seed', 'variationCount', 'referenceImages', 'logoPlacement', 'paletteLock', 'brandImageVariantMode']) {
      expect(image.controls).toContain(token)
    }
  })

  it('Voice Studio includes TTS/STT tabs, formats, diarization, and timestamps', () => {
    const voice = CAPABILITY_STUDIOS.find((studio) => studio.id === 'voice')!
    for (const token of ['tabs:TTS/STT/Dubbing/VoiceLibrary', 'voice', 'responseFormat', 'diarization', 'wordTimestamps', 'segmentTimestamps']) {
      expect(voice.controls).toContain(token)
    }
  })

  it('Avatar Studio includes library, voice binding, emotion, framing, and lip-sync states', () => {
    const avatar = CAPABILITY_STUDIOS.find((studio) => studio.id === 'avatar')!
    for (const token of ['avatarLibrary', 'voiceBinding', 'emotion', 'cameraFraming', 'talkingHeadMode']) {
      expect(avatar.controls).toContain(token)
    }
  })

  it('Scrape/Brand Studio includes URL, crawl depth, JS render, screenshots, and asset references', () => {
    const scrape = CAPABILITY_STUDIOS.find((studio) => studio.id === 'scrape-brand')!
    for (const token of ['websiteUrl', 'crawlDepth', 'renderJs', 'screenshotCapture', 'logos', 'products', 'createBrandPack']) {
      expect(scrape.controls).toContain(token)
    }
    expect(scrape.supportedAssetReferences).toContain('brand guide PDF')
  })

  it('RAG Studio includes ingestion, chunking, embeddings, retrieval, rerank, and citations', () => {
    const rag = CAPABILITY_STUDIOS.find((studio) => studio.id === 'rag-knowledge')!
    for (const token of ['sourceUrls', 'chunkingPreset', 'embeddingModel', 'retrievalPreview', 'rerank', 'citationRequired']) {
      expect(rag.controls).toContain(token)
    }
  })

  it('Planned connected apps include all 5 apps', () => {
    expect(PLANNED_CONNECTED_APPS.map((app) => app.displayName)).toEqual(['Marketing App', 'Music App', 'Religious App', 'Crypto App', 'Horse App'])
  })
})

describe('dashboard app-facing controls', () => {
  it('studio filters adult-private mode from active mode list', () => {
    const studioPage = read('app/admin/dashboard/studio/page.tsx')
    expect(studioPage).toContain('filter((mode) => !mode.adultPrivate)')
  })

  it('studio request payload does not include provider/model overrides', () => {
    const studioPage = read('app/admin/dashboard/studio/page.tsx')
    const payloadBlock = studioPage.slice(studioPage.indexOf('const payload ='), studioPage.indexOf('const response = await fetch'))
    expect(payloadBlock).not.toMatch(/providerOverride|modelOverride|provider:\s|model:\s/)
  })

  it('opencode.json is unchanged and valid if present', () => {
    const file = path.join(root, 'opencode.json')
    if (!fs.existsSync(file)) return
    expect(() => JSON.parse(fs.readFileSync(file, 'utf8'))).not.toThrow()
  })

  it('new dashboard pages exist', () => {
    for (const route of [
      'app/admin/dashboard/page.tsx',
      'app/admin/dashboard/studio/page.tsx',
      'app/admin/dashboard/capabilities/page.tsx',
      'app/admin/dashboard/jobs/page.tsx',
      'app/admin/dashboard/apps/page.tsx',
      'app/admin/dashboard/providers/page.tsx',
      'app/admin/dashboard/agents/page.tsx',
      'app/admin/dashboard/settings/page.tsx',
    ]) {
      expect(srcExists(route), route).toBe(true)
    }
  })

  it('old routes redirect to new locations', () => {
    const redirects: Record<string, string> = {
      'app/admin/dashboard/app-runtime/page.tsx': '/admin/dashboard/apps',
      'app/admin/dashboard/assets/page.tsx': '/admin/dashboard/jobs',
      'app/admin/dashboard/automation/page.tsx': '/admin/dashboard/agents',
      'app/admin/dashboard/memory/page.tsx': '/admin/dashboard/agents',
      'app/admin/dashboard/proof/page.tsx': '/admin/dashboard/settings',
      'app/admin/dashboard/libraries/page.tsx': '/admin/dashboard/settings',
      'app/admin/dashboard/adult/page.tsx': '/admin/dashboard/settings',
    }
    for (const [file, target] of Object.entries(redirects)) {
      expect(srcExists(file), file).toBe(true)
      const content = read(file)
      expect(content).toContain(`redirect('${target}')`)
    }
  })
})
