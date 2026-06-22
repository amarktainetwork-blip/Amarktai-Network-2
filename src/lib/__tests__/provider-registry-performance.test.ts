import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { providerPerformance: db },
}))

import {
  buildProviderAuthHeaders,
  getDefaultModel,
  getProviderInfo,
  listProvidersByCapability,
  validateProviderModel,
} from '@/lib/provider-registry'
import {
  clearProviderPerformanceMemory,
  rankProvidersForCapability,
  recordProviderFailure,
} from '@/lib/provider-performance'

describe('canonical provider registry and performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearProviderPerformanceMemory()
    db.findUnique.mockResolvedValue(null)
    db.upsert.mockResolvedValue(null)
  })

  it('publishes correct provider metadata and auth contracts', () => {
    expect(getProviderInfo('qwen')).toBeNull()
    expect(getProviderInfo('mimo')).toMatchObject({
      authHeaderName: 'api-key',
      authPrefix: '',
    })
    expect(buildProviderAuthHeaders('mimo', 'secret')).toEqual({ 'api-key': 'secret' })
    expect(buildProviderAuthHeaders('groq', 'secret')).toEqual({
      Authorization: 'Bearer secret',
    })
    expect(listProvidersByCapability('image').map((entry) => entry.id)).toContain('together')
    expect(getDefaultModel('huggingface', 'image')).toBe('stabilityai/stable-diffusion-xl-base-1.0')
    expect(validateProviderModel('huggingface', 'stabilityai/stable-diffusion-xl-base-1.0', 'image').valid).toBe(true)
  })

  it('demotes a repeatedly failing provider/model combination', async () => {
    const candidates = [
      { route: { provider: 'huggingface' as const }, model: 'stabilityai/stable-diffusion-xl-base-1.0', rank: 0 },
      {
        route: { provider: 'together' as const },
        model: 'black-forest-labs/FLUX.1-schnell',
        rank: 1,
      },
    ]
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await recordProviderFailure({
        providerId: 'huggingface',
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        capability: 'text_to_image',
        latencyMs: 100,
        errorCategory: 'model_not_supported',
      })
    }

    const ranked = await rankProvidersForCapability('text_to_image', candidates)
    expect(ranked[0].route.provider).toBe('together')
  })
})
