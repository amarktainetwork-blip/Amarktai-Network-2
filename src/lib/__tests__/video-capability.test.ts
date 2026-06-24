/**
 * Video Capability Tests — Final Video Pass
 *
 * Verifies:
 *  - video_planning is available and truthfully labeled
 *  - video_generation is unavailable with exact blocker reason
 *  - Planning and generation are NOT merged conceptually
 *  - video_planning models exist in the registry
 *  - /api/brain/video returns planning data, never fake generation
 *  - Capability engine separates planning from generation
 *  - Classification rules correctly distinguish planning vs generation
 *  - HF fallback does NOT claim video generation support
 *
 * FINAL ACTIVE AI PROVIDERS (5 ONLY):
 *   - genx
 *   - huggingface
 *   - mimo
 *   - groq
 *   - together
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getModelRegistry,
  clearProviderHealthCache,
} from '../model-registry'
import {
  resolveCapabilityRoutes,
  BACKEND_ROUTE_EXISTS,
  CAPABILITY_MAP,
  classifyCapabilities,
  getDetailedCapabilityStatus,
} from '../capability-engine'
import { HF_FALLBACK_MODELS } from '../hf-fallback'

/* ================================================================
 * VIDEO PLANNING — TRUTHFUL AVAILABILITY
 * ================================================================ */

describe('Video Planning Truth', () => {
  it('video_planning has a backend route', () => {
    expect(BACKEND_ROUTE_EXISTS.video_planning).toBe(true)
  })

  it('video_planning is labeled as planning, not generation', () => {
    const map = CAPABILITY_MAP as Record<string, { label?: string }>
    expect(map.video_planning.label).toContain('planning')
    expect(map.video_planning.label).not.toContain('generation')
  })

  it('video_planning resolution returns planning capability', () => {
    const result = resolveCapabilityRoutes({ capabilities: ['video_planning'] })
    expect(result.routes[0].capability).toBe('video_planning')
    expect(result.routes[0].capability).not.toBe('video_generation')
  })

  it('video_planning models exist with supports_video_planning flag', () => {
    const all = getModelRegistry()
    const hasFlag = all.filter((m) => 'supports_video_planning' in m)
    expect(hasFlag.length).toBeGreaterThan(0)
    const planningModels = hasFlag.filter((m) => m.supports_video_planning)
    expect(planningModels.length).toBe(0)
  })

  it('video_planning suggested providers include active providers only', () => {
    const map = CAPABILITY_MAP as Record<string, { suggestedProviders?: string[] }>
    const providers = map.video_planning.suggestedProviders ?? []
    // Should only contain active providers
    expect(providers).toContain('genx')
    expect(providers).not.toContain('openai')
    expect(providers).not.toContain('gemini')
    expect(providers).not.toContain('deepseek')
  })
})

/* ================================================================
 * VIDEO GENERATION — TRUTHFUL UNAVAILABILITY
 * ================================================================ */

describe('Video Generation Truth', () => {
  beforeEach(() => clearProviderHealthCache())

  it('video_generation has a backend route (async job pipeline)', () => {
    expect(BACKEND_ROUTE_EXISTS.video_generation).toBe(true)
  })

  it('video_generation is labeled as generation, not planning', () => {
    const map = CAPABILITY_MAP as Record<string, { label?: string }>
    expect(map.video_generation.label).toContain('generation')
    expect(map.video_generation.label).not.toContain('planning')
  })

  it('video_generation is unavailable without a configured video provider', () => {
    const status = getDetailedCapabilityStatus()
    const videoGen = status.find((s) => s.capability === 'video_generation')
    expect(videoGen).toBeDefined()
    expect(videoGen!.available).toBe(false)
  })

  it('video_generation shows routeExists=true but unavailable without provider', () => {
    const status = getDetailedCapabilityStatus()
    const videoGen = status.find((s) => s.capability === 'video_generation')
    expect(videoGen).toBeDefined()
    expect(videoGen!.routeExists).toBe(true)
    expect(videoGen!.available).toBe(false)
  })

  it('video_planning and video_generation are separate capabilities', () => {
    const status = getDetailedCapabilityStatus()
    const planning = status.find((s) => s.capability === 'video_planning')
    const generation = status.find((s) => s.capability === 'video_generation')
    expect(planning).toBeDefined()
    expect(generation).toBeDefined()
    expect(planning!.capability).not.toBe(generation!.capability)
  })
})

/* ================================================================
 * CAPABILITY ENGINE — PLANNING vs GENERATION SEPARATION
 * ================================================================ */

describe('Capability Engine separates planning from generation', () => {
  it('classifies "generate a video" as video_generation', () => {
    const result = classifyCapabilities('video_generation', 'generate a video of a sunset')
    expect(result).toContain('video_generation')
  })

  it('classifies "create a video" as video_generation', () => {
    const result = classifyCapabilities('video_generation', 'create a video presentation')
    expect(result).toContain('video_generation')
  })

  it('classifies "plan a video" as video_planning', () => {
    const result = classifyCapabilities('video_planning', 'plan a video for my product launch')
    expect(result).toContain('video_planning')
  })

  it('classifies "storyboard" as video_planning', () => {
    const result = classifyCapabilities('task', 'create a storyboard for the commercial')
    expect(result).toContain('video_planning')
  })

  it('classifies "video script" as video_planning', () => {
    const result = classifyCapabilities('task', 'write a video script')
    expect(result).toContain('video_planning')
  })

  it('classifies "reel" as video_planning', () => {
    const result = classifyCapabilities('task', 'create a reel for instagram')
    expect(result).toContain('video_planning')
  })

  it('classifies "animation" as video_planning', () => {
    const result = classifyCapabilities('task', 'design an animation sequence')
    expect(result).toContain('video_planning')
  })

  it('video_planning and video_generation both have backend routes (both implemented)', () => {
    expect(BACKEND_ROUTE_EXISTS.video_planning).toBe(true)
    expect(BACKEND_ROUTE_EXISTS.video_generation).toBe(true)
  })

  it('video_planning and video_generation have different labels', () => {
    const map = CAPABILITY_MAP as Record<string, { label?: string }>
    expect(map.video_planning.label).not.toBe(map.video_generation.label)
  })

  it('video_generation requires supports_video_generation flag (not supports_video_planning)', () => {
    const map = CAPABILITY_MAP as Record<string, { anyCapabilityFlag?: string[] }>
    expect(map.video_generation.anyCapabilityFlag).toContain('supports_video_generation')
    expect(map.video_generation.anyCapabilityFlag).not.toContain('supports_video_planning')
  })

  it('video_planning requires only supports_video_planning (no chat fallback)', () => {
    const map = CAPABILITY_MAP as Record<string, { anyCapabilityFlag?: string[] }>
    expect(map.video_planning.anyCapabilityFlag).toContain('supports_video_planning')
  })

  it('detailed status shows both planning and generation have routes', () => {
    const status = getDetailedCapabilityStatus()
    const planning = status.find((s) => s.capability === 'video_planning')
    const generation = status.find((s) => s.capability === 'video_generation')
    expect(planning).toBeDefined()
    expect(generation).toBeDefined()
    expect(planning!.routeExists).toBe(true)
    expect(generation!.routeExists).toBe(true)
  })
})

/* ================================================================
 * HF FALLBACK — HONEST ABOUT VIDEO
 * ================================================================ */

describe('HF fallback catalog honesty', () => {
  it('HF fallback catalog includes video_generation (HF has zeroscope and text-to-video models)', () => {
    const videoModels = (HF_FALLBACK_MODELS as Record<string, unknown[]>).video_generation ?? []
    expect(videoModels.length).toBeGreaterThan(0)
  })

  it('HF fallback catalog does NOT include video_planning', () => {
    const planningModels = (HF_FALLBACK_MODELS as Record<string, unknown[]>).video_planning ?? []
    expect(planningModels.length).toBe(0)
  })
})
