/**
 * Learning System Tests
 *
 * Covers:
 *  - recordFeedback persists to DB
 *  - recordExecutionSignal persists and updates model scores
 *  - getLearningSignals retrieves signals for routing decisions
 *  - getProviderSuccessRates computes per-provider metrics
 *  - logRouteOutcome stores provider/model/success/latency/fallback
 *  - removed providers are not reintroduced
 *  - no fake success paths
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  type UserFeedback,
  type ExecutionSignal,
  type RouteOutcome,
} from '../learning-engine'

// Helper: safely get the JSON content from a mock call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCallContent(mockFn: ReturnType<typeof vi.fn>, callIndex = 0): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args = (mockFn.mock.calls as any[][])[callIndex]
  return JSON.parse(args[0].data.content)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCallImportance(mockFn: ReturnType<typeof vi.fn>, callIndex = 0): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args = (mockFn.mock.calls as any[][])[callIndex]
  return args[0].data.importance
}

// ── logRouteOutcome ───────────────────────────────────────────────────────────

describe('logRouteOutcome', () => {
  afterEach(() => vi.resetModules())

  it('stores route outcome with provider, model, success, latency, fallback', async () => {
    const createCall = vi.fn(async () => ({ id: 1 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { logRouteOutcome } = await import('../learning-engine')
    const outcome: RouteOutcome = {
      appSlug: 'app1', taskType: 'chat', executionMode: 'direct',
      providerKey: 'genx', model: 'auto', success: true, latencyMs: 450,
      confidenceScore: 0.88, fallbackUsed: false, validationPassed: null,
    }
    const result = await logRouteOutcome(outcome)
    expect(result).toBe(true)
    expect(createCall).toHaveBeenCalledOnce()
    const content = getCallContent(createCall)
    expect(content.providerKey).toBe('genx')
    expect(content.success).toBe(true)
    expect(content.latencyMs).toBe(450)
    expect(content.fallbackUsed).toBe(false)
  })

  it('does not introduce removed providers in logged outcomes', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: vi.fn(async () => ({ id: 1 })) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { logRouteOutcome } = await import('../learning-engine')
    const result = await logRouteOutcome({
      appSlug: 'app1', taskType: 'chat', executionMode: 'direct',
      providerKey: 'groq', model: 'llama-3.3-70b-versatile',
      success: true, latencyMs: 200, confidenceScore: null,
      fallbackUsed: false, validationPassed: true,
    })
    expect(result).toBe(true)
  })

  it('returns false gracefully when DB throws', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: vi.fn(async () => { throw new Error('DB down') }) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { logRouteOutcome } = await import('../learning-engine')
    const result = await logRouteOutcome({
      appSlug: 'app1', taskType: 'chat', executionMode: 'direct',
      providerKey: 'genx', model: 'auto', success: true, latencyMs: 100,
      confidenceScore: null, fallbackUsed: false, validationPassed: null,
    })
    expect(result).toBe(false)
  })
})

// ── recordFeedback ────────────────────────────────────────────────────────────

describe('recordFeedback', () => {
  afterEach(() => vi.resetModules())

  it('stores user feedback with rating and acceptance', async () => {
    const createCall = vi.fn(async () => ({ id: 1 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordFeedback } = await import('../learning-engine')
    const feedback: UserFeedback = {
      appSlug: 'app1', capability: 'chat', providerKey: 'genx', model: 'auto',
      rating: 5, comment: 'Very helpful', accepted: true,
    }
    const result = await recordFeedback(feedback)
    expect(result).toBe(true)
    expect(createCall).toHaveBeenCalledOnce()
    const content = getCallContent(createCall)
    expect(content.rating).toBe(5)
    expect(content.accepted).toBe(true)
    expect(content.providerKey).toBe('genx')
    expect(content.signalType).toBe('user_feedback')
  })

  it('records negative feedback (low rating) with higher importance', async () => {
    const createCall = vi.fn(async () => ({ id: 2 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordFeedback } = await import('../learning-engine')
    await recordFeedback({
      appSlug: 'app1', capability: 'chat', providerKey: 'groq', model: 'auto',
      rating: 1, accepted: false,
    })
    expect(getCallImportance(createCall)).toBe(0.9)
  })

  it('returns false when DB throws', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: vi.fn(async () => { throw new Error('DB down') }) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))
    const { recordFeedback } = await import('../learning-engine')
    const result = await recordFeedback({
      appSlug: 'app1', capability: 'chat', providerKey: 'genx', model: 'auto',
      rating: 3, accepted: true,
    })
    expect(result).toBe(false)
  })
})

// ── recordExecutionSignal ─────────────────────────────────────────────────────

describe('recordExecutionSignal', () => {
  afterEach(() => vi.resetModules())

  it('records success, latency, cost, quality, and fallback usage', async () => {
    const createCall = vi.fn(async () => ({ id: 3 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    const signal: ExecutionSignal = {
      appSlug: 'app1', capability: 'image_generation', providerKey: 'together',
      model: 'FLUX.2-dev', success: true, latencyMs: 3200,
      costEstimateUsd: 0.002, qualityScore: 0.87, fallbackUsed: false,
    }
    const result = await recordExecutionSignal(signal)
    expect(result).toBe(true)
    const content = getCallContent(createCall)
    expect(content.providerKey).toBe('together')
    expect(content.latencyMs).toBe(3200)
    expect(content.fallbackUsed).toBe(false)
    expect(content.qualityScore).toBe(0.87)
    expect(content.signalType).toBe('execution_signal')
  })

  it('records fallback usage with reason', async () => {
    const createCall = vi.fn(async () => ({ id: 4 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    await recordExecutionSignal({
      appSlug: 'app1', capability: 'music_generation', providerKey: 'huggingface',
      model: 'facebook/musicgen-small', success: true, latencyMs: 1800,
      fallbackUsed: true, fallbackReason: 'GenX quota exceeded',
    })
    const content = getCallContent(createCall)
    expect(content.fallbackUsed).toBe(true)
    expect(content.fallbackReason).toBe('GenX quota exceeded')
  })

  it('records provider failure with high importance', async () => {
    const createCall = vi.fn(async () => ({ id: 5 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    await recordExecutionSignal({
      appSlug: 'app1', capability: 'video_generation', providerKey: 'genx',
      model: 'veo-3.1', success: false, latencyMs: 5000, fallbackUsed: false,
    })
    expect(getCallImportance(createCall)).toBe(0.8)
  })
})

// ── getLearningSignals ────────────────────────────────────────────────────────

describe('getLearningSignals', () => {
  afterEach(() => vi.resetModules())

  it('retrieves signals and parses provider/success/latency', async () => {
    const mockRows = [
      { id: 1, appSlug: 'app1', key: 'execution_signal', memoryType: 'learned', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'chat', success: true, latencyMs: 300, recordedAt: new Date().toISOString() }), importance: 0.5, expiresAt: null, createdAt: new Date() },
      { id: 2, appSlug: 'app1', key: 'user_feedback', memoryType: 'learned', content: JSON.stringify({ signalType: 'user_feedback', providerKey: 'groq', model: 'auto', capability: 'chat', success: true, latencyMs: 0, recordedAt: new Date().toISOString() }), importance: 0.8, expiresAt: null, createdAt: new Date() },
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => mockRows) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { getLearningSignals } = await import('../learning-engine')
    const signals = await getLearningSignals('app1', 'chat')
    expect(signals.length).toBe(2)
    expect(signals[0].providerKey).toBe('genx')
    expect(signals[0].success).toBe(true)
    expect(signals[1].signalType).toBe('user_feedback')
  })

  it('filters by capability', async () => {
    const mockRows = [
      { id: 1, appSlug: 'app1', key: 'execution_signal', memoryType: 'learned', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'chat', success: true, latencyMs: 200, recordedAt: new Date().toISOString() }), importance: 0.5, expiresAt: null, createdAt: new Date() },
      { id: 2, appSlug: 'app1', key: 'execution_signal', memoryType: 'learned', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'together', model: 'FLUX', capability: 'image_generation', success: true, latencyMs: 3000, recordedAt: new Date().toISOString() }), importance: 0.5, expiresAt: null, createdAt: new Date() },
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => mockRows) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { getLearningSignals } = await import('../learning-engine')
    const signals = await getLearningSignals('app1', 'image_generation')
    expect(signals.length).toBe(1)
    expect(signals[0].providerKey).toBe('together')
  })

  it('returns empty array when DB throws', async () => {
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => { throw new Error('DB down') }) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))
    const { getLearningSignals } = await import('../learning-engine')
    const signals = await getLearningSignals('app1')
    expect(signals).toHaveLength(0)
  })
})

// ── getProviderSuccessRates ───────────────────────────────────────────────────

describe('getProviderSuccessRates', () => {
  afterEach(() => vi.resetModules())

  it('computes success rates per provider from signals', async () => {
    const now = new Date().toISOString()
    const mockRows = [
      { id: 1, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'chat', success: true, latencyMs: 400, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'app1', memoryType: 'learned' },
      { id: 2, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'chat', success: true, latencyMs: 600, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'app1', memoryType: 'learned' },
      { id: 3, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'chat', success: false, latencyMs: 0, recordedAt: now }), importance: 0.8, expiresAt: null, createdAt: new Date(), appSlug: 'app1', memoryType: 'learned' },
      { id: 4, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'groq', model: 'llama', capability: 'chat', success: true, latencyMs: 200, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'app1', memoryType: 'learned' },
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => mockRows) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { getProviderSuccessRates } = await import('../learning-engine')
    const rates = await getProviderSuccessRates('app1', 'chat')
    expect(rates['genx'].successRate).toBeCloseTo(2 / 3, 2)
    expect(rates['genx'].sampleCount).toBe(3)
    expect(rates['groq'].successRate).toBe(1)
    expect(rates['groq'].sampleCount).toBe(1)
  })
})

// ── Cross-cutting: no removed providers ───────────────────────────────────────

describe('learning signals — no removed providers', () => {
  afterEach(() => vi.resetModules())

  it('can log signals for all allowed providers', async () => {
    const createCall = vi.fn(async () => ({ id: 10 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    for (const provider of ['genx', 'huggingface', 'together', 'groq', 'mimo']) {
      await recordExecutionSignal({
        appSlug: 'app1', capability: 'chat', providerKey: provider,
        model: 'auto', success: true, latencyMs: 300, fallbackUsed: false,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loggedProviders = (createCall.mock.calls as any[][]).map(c => JSON.parse(c[0].data.content).providerKey)
    expect(loggedProviders).toEqual(['genx', 'huggingface', 'together', 'groq', 'mimo'])

    const removed = ['openai', 'gemini', 'anthropic', 'deepseek', 'mistral', 'qwen']
    for (const p of loggedProviders) {
      expect(removed).not.toContain(p)
    }
  })
})

// ── Capability-level success/failure signals ───────────────────────────────────

describe('learning — capability-level signals', () => {
  afterEach(() => vi.resetModules())

  it('records capability success separately from provider success', async () => {
    const createCall = vi.fn(async () => ({ id: 20 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    await recordExecutionSignal({
      appSlug: 'app1', capability: 'music_generation', providerKey: 'genx',
      model: 'lyria-3-pro-preview', success: true, latencyMs: 2400,
      fallbackUsed: false, qualityScore: 0.92,
    })

    const content = getCallContent(createCall)
    expect(content.capability).toBe('music_generation')
    expect(content.providerKey).toBe('genx')
    expect(content.success).toBe(true)
    expect(content.qualityScore).toBe(0.92)
  })

  it('records capability failure with error reason in signal', async () => {
    const createCall = vi.fn(async () => ({ id: 21 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    await recordExecutionSignal({
      appSlug: 'app1', capability: 'avatar_generation', providerKey: 'huggingface',
      model: 'stabilityai/stable-diffusion-xl-base-1.0', success: false, latencyMs: 0,
      fallbackUsed: false,
    })

    const content = getCallContent(createCall)
    expect(content.capability).toBe('avatar_generation')
    expect(content.success).toBe(false)
    // failure = higher importance for learning
    expect(getCallImportance(createCall)).toBe(0.8)
  })

  it('records agent execution outcome with agentType', async () => {
    const createCall = vi.fn(async () => ({ id: 22 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { recordExecutionSignal } = await import('../learning-engine')
    await recordExecutionSignal({
      appSlug: 'brand-app', capability: 'chat', providerKey: 'groq',
      model: 'llama-3.3-70b-versatile', success: true, latencyMs: 310,
      fallbackUsed: false, qualityScore: 0.85,
      agentType: 'marketing', taskId: 'task-abc-123',
    })

    const content = getCallContent(createCall)
    expect(content.agentType).toBe('marketing')
    expect(content.taskId).toBe('task-abc-123')
    expect(content.providerKey).toBe('groq')
  })
})

// ── Learning signals usable for routing decisions ─────────────────────────────

describe('learning — signals usable for future routing', () => {
  afterEach(() => vi.resetModules())

  it('getProviderSuccessRates returns data runtime can use to prefer better provider', async () => {
    const now = new Date().toISOString()
    // Scenario: together has 100% success, genx has 50% success → runtime should prefer together
    const mockRows = [
      { id: 1, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'together', model: 'FLUX', capability: 'image_generation', success: true, latencyMs: 800, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'shop', memoryType: 'learned' },
      { id: 2, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'together', model: 'FLUX', capability: 'image_generation', success: true, latencyMs: 900, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'shop', memoryType: 'learned' },
      { id: 3, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'image_generation', success: true, latencyMs: 2000, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'shop', memoryType: 'learned' },
      { id: 4, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'genx', model: 'auto', capability: 'image_generation', success: false, latencyMs: 100, recordedAt: now }), importance: 0.8, expiresAt: null, createdAt: new Date(), appSlug: 'shop', memoryType: 'learned' },
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async () => mockRows) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { getProviderSuccessRates } = await import('../learning-engine')
    const rates = await getProviderSuccessRates('shop', 'image_generation')

    // Runtime can use this to prefer together (100% success) over genx (50% success)
    expect(rates['together'].successRate).toBe(1)
    expect(rates['genx'].successRate).toBe(0.5)
    expect(rates['together'].successRate).toBeGreaterThan(rates['genx'].successRate)
    // avgLatencyMs gives runtime cost proxy
    expect(rates['together'].avgLatencyMs).toBeLessThan(rates['genx'].avgLatencyMs)
  })

  it('getLearningSignals scoped by appSlug — no cross-app leakage', async () => {
    const now = new Date().toISOString()
    const mockRows = [
      { id: 1, key: 'execution_signal', content: JSON.stringify({ signalType: 'execution_signal', providerKey: 'groq', model: 'llama', capability: 'chat', success: true, latencyMs: 200, recordedAt: now }), importance: 0.5, expiresAt: null, createdAt: new Date(), appSlug: 'app-a', memoryType: 'learned' },
    ]
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { findMany: vi.fn(async (args: { where: { appSlug: string } }) => {
          // Only return rows for the requested appSlug
          return mockRows.filter(r => r.appSlug === args.where.appSlug)
        }) },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { getLearningSignals } = await import('../learning-engine')
    const signalsA = await getLearningSignals('app-a')
    const signalsB = await getLearningSignals('app-b')

    expect(signalsA.length).toBe(1)
    expect(signalsB.length).toBe(0) // no cross-app leakage
  })

  it('route outcome records fallback usage so runtime can de-prioritize that provider', async () => {
    const createCall = vi.fn(async () => ({ id: 30 }))
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        memoryEntry: { create: createCall },
        brainEvent: { findMany: vi.fn(async () => []) },
      },
    }))

    const { logRouteOutcome } = await import('../learning-engine')
    await logRouteOutcome({
      appSlug: 'app1', taskType: 'image_generation', executionMode: 'direct',
      providerKey: 'huggingface', model: 'stabilityai/stable-diffusion-xl-base-1.0',
      success: true, latencyMs: 5000, confidenceScore: 0.7,
      fallbackUsed: true, validationPassed: null,
    })

    const content = getCallContent(createCall)
    expect(content.fallbackUsed).toBe(true)
    expect(content.providerKey).toBe('huggingface')
    // Runtime can read fallbackUsed=true to know primary provider was unavailable
    expect(content.latencyMs).toBe(5000)
  })
})
