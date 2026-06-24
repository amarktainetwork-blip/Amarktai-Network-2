import { describe, expect, it } from 'vitest'
import { getMediaCapabilityRoute, MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { routeLiveModel } from '@/lib/live-ai-routing'

describe('adult and media capability routing', () => {
  it('routes adult_text to a real text provider route', () => {
    const route = getMediaCapabilityRoute('adult_text')
    expect(route?.route).toBe('/api/brain/adult-text')
    expect(route?.artifactType).toBe('document')
    expect(route?.providers.map((entry) => entry.provider)).toEqual(expect.arrayContaining(['together', 'huggingface']))
  })

  it('routes adult_image to image generation', () => {
    const route = getMediaCapabilityRoute('adult_image')
    expect(route?.route).toBe('/api/brain/adult-image')
    expect(route?.artifactType).toBe('image')
  })

  it('routes adult_video only to real video executors', () => {
    const route = getMediaCapabilityRoute('adult_video')
    expect(route?.route).toBe('/api/brain/video-generate')
    expect(route?.execution).toBe('async_job')
    expect(route?.providers.map((entry) => entry.provider)).toEqual(['genx'])
    expect(route?.providers.map((entry) => entry.provider)).not.toContain('together')
  })

  it('routes adult_voice through audio/TTS executors', () => {
    const route = getMediaCapabilityRoute('adult_voice')
    expect(route?.route).toBe('/api/brain/tts')
    expect(route?.artifactType).toBe('audio')
    expect(route?.providers.map((entry) => entry.provider)).toEqual(expect.arrayContaining(['genx', 'huggingface']))
  })

  it('blocks adult capabilities when policy is disabled', () => {
    const route = routeLiveModel({ capability: 'adult_video', adultPolicy: 'off' })
    expect(route.blockedReason).toContain('Adult capability needs an app policy')
  })

  it('returns a clear provider error for providers outside the mesh', () => {
    const route = routeLiveModel({
      capability: 'adult_voice',
      adultPolicy: 'adult_voice',
      selectedProvider: 'replicate',
      selectedModel: 'legacy-voice',
    })
    expect(route.blockedReason).toContain('Provider is not approved by the provider mesh')
  })

  it('declares every required capability as first class', () => {
    expect(Object.keys(MEDIA_CAPABILITY_ROUTES)).toEqual(expect.arrayContaining([
      'adult_text',
      'adult_image',
      'adult_video',
      'adult_voice',
      'image_generation',
      'video_generation',
      'music_generation',
      'tts',
      'stt',
      'audio',
    ]))
  })
})
