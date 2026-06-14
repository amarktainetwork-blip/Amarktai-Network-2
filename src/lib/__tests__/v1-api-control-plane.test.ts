import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALWAYS_BLOCKED_ADULT_CATEGORIES,
  validateAdultCapabilityRequest,
  type AdultAppCapabilityProfile,
} from '@/lib/adult-app-capabilities'
import {
  getVideoModelContract,
  providerSafeVideoParameters,
  requestedVideoDuration,
  shouldUseLongFormVideo,
  VIDEO_MODEL_CONTRACTS,
} from '@/lib/video-route-specs'
import { listGatewayAliases } from '@/lib/provider-gateway'

const ROOT = path.resolve(__dirname, '../../../')
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

describe('V1 API control plane foundation', () => {
  it('routes long-duration and social-video requests to the long-form pipeline', () => {
    expect(shouldUseLongFormVideo({ prompt: 'Create a 30 second product story' })).toBe(true)
    expect(shouldUseLongFormVideo({ prompt: 'Create an Instagram Reel' })).toBe(true)
    expect(shouldUseLongFormVideo({ prompt: 'A four second establishing shot', duration: 4 })).toBe(false)
    expect(requestedVideoDuration('Make a 90 second YouTube ad')).toBe(90)
  })

  it('never sends duration to models that do not support duration customization', () => {
    const contract = getVideoModelContract('qwen', 'wan2.1-t2v-turbo')
    expect(contract).toBeTruthy()
    expect(contract?.supportsDurationCustomization).toBe(false)
    expect(providerSafeVideoParameters(contract!, {
      duration: 30,
      size: '1280*720',
      aspectRatio: '16:9',
      sceneId: 'scene-1',
    })).toEqual({ size: '1280*720' })
  })

  it('separates text-to-video and image-to-video input contracts', () => {
    const text = getVideoModelContract('qwen', 'wan2.1-t2v-turbo')
    const image = getVideoModelContract('qwen', 'wan2.1-i2v-turbo')
    expect(text).toMatchObject({ mode: 'text_to_video', requiresSourceImage: false })
    expect(image).toMatchObject({ mode: 'image_to_video', requiresSourceImage: true })
    expect(VIDEO_MODEL_CONTRACTS.every((entry) => entry.pollingMethod)).toBe(true)
  })

  it('requires explicit per-app adult capability enablement and unambiguous fictional adults', () => {
    const profile: AdultAppCapabilityProfile = {
      appSlug: 'premium-app',
      globalAvailable: true,
      safeMode: false,
      adultModeEnabled: true,
      categoriesAllowed: ['fictional_adult_roleplay'],
      capabilities: {
        adult_text: true,
        adult_image: false,
        adult_voice: false,
        adult_avatar: false,
        adult_short_video: false,
        adult_long_video: false,
      },
      approvedProviders: ['huggingface'],
      approvedModels: ['approved/model'],
      safetyRules: [],
      auditLogging: true,
    }
    expect(validateAdultCapabilityRequest(
      profile,
      'adult_text',
      'Fictional consenting adults aged 25 in a romantic roleplay.',
    )).toEqual({ allowed: true })
    expect(validateAdultCapabilityRequest(profile, 'adult_image', 'Fictional adults aged 25.'))
      .toMatchObject({ allowed: false })
    expect(validateAdultCapabilityRequest(profile, 'adult_text', 'A young-looking schoolgirl.'))
      .toMatchObject({ allowed: false })
    expect(ALWAYS_BLOCKED_ADULT_CATEGORIES).toContain('real_person_sexual_deepfake')
  })

  it('keeps gateway aliases as execution utilities with approved providers', () => {
    const aliases = listGatewayAliases()
    expect(aliases.map((entry) => entry.alias)).toEqual([
      'text.fast',
      'text.balanced',
      'text.premium',
    ])
    expect(aliases.flatMap((entry) => entry.routes).some((route) => route.provider === 'genx')).toBe(true)
    expect(aliases.flatMap((entry) => entry.routes).every((route) =>
      ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'].includes(route.provider),
    )).toBe(true)
  })

  it('uses durable TEXT/LONGTEXT columns for large execution metadata', () => {
    const schema = read('prisma/schema.prisma')
    expect(schema).toContain('model ControlPlaneJob')
    expect(schema).toMatch(
      /model ControlPlaneJob[\s\S]*metadata\s+String\s+@default\("\{\}"\)\s+@db\.LongText/,
    )
    expect(schema).toMatch(
      /responseMetadata\s+String\s+@default\("\{\}"\)\s+@map\("response_metadata"\)\s+@db\.LongText/,
    )
    expect(schema).toContain('model CapabilityTrace')
    expect(schema).toContain('model ApprovedModelRegistry')
    expect(JSON.stringify({ payload: 'x'.repeat(10_000) }).length).toBeGreaterThan(191)
  })

  it('exposes canonical job attempts, provider ids, charge markers, and cancellation', () => {
    const jobs = read('src/app/api/admin/system/jobs/route.ts')
    const page = read('src/app/admin/dashboard/jobs/page.tsx')
    expect(jobs).toContain('providerJobIds')
    expect(jobs).toContain('activeAttempt')
    expect(jobs).toContain('finalAttempt')
    expect(jobs).toContain('charged')
    expect(page).toContain('Provider charge recorded')
    expect(page).toContain('/cancel')
  })

  it('keeps every Studio capability visible and points unavailable paths to setup/test truth', () => {
    const studio = read('src/app/admin/dashboard/studio/page.tsx')
    const matrix = read('src/app/api/admin/system/v1-brain-route-matrix/route.ts')
    expect(studio).toContain('{capabilities.map')
    expect(matrix).toContain('executionControlPlane')
    expect(matrix).toContain('videoContracts')
    expect(matrix).toContain('gatewayAliases')
  })
})
