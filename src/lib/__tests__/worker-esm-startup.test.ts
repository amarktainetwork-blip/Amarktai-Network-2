import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('worker ESM startup', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../job-queue.ts')
  })

  it('imports the worker module in an ESM context', async () => {
    vi.doMock('../job-queue.ts', () => ({
      createWorker: vi.fn(() => null),
    }))

    const workerModule = await import('@/lib/worker')

    expect(typeof workerModule.startWorker).toBe('function')
  })

  it('starts without require being undefined when the queue degrades safely', async () => {
    const createWorker = vi.fn(() => null)
    vi.doMock('../job-queue.ts', () => ({ createWorker }))
    const { startWorker } = await import('@/lib/worker')

    let thrown: unknown
    let result: ReturnType<typeof startWorker> | undefined
    try {
      result = startWorker()
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeUndefined()
    expect(result).toBeNull()
    expect(createWorker).toHaveBeenCalledOnce()
  })

  it('surfaces real startup errors without converting them to require crashes', async () => {
    const startupError = new Error('Redis unavailable during worker startup')
    vi.doMock('../job-queue.ts', () => ({
      createWorker: vi.fn(() => {
        throw startupError
      }),
    }))
    const { startWorker } = await import('@/lib/worker')

    let thrown: unknown
    try {
      startWorker()
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBe(startupError)
    expect(String(thrown)).not.toContain('require is not defined')
  })
})
