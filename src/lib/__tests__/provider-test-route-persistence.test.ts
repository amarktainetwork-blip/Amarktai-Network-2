/**
 * Proves that individual provider test routes never write apiKey: '' and
 * never create ghost integrationConfig rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockUpdateMany = vi.fn()
const mockUpdate = vi.fn()
const mockUpsert = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    integrationConfig: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: mockUpdate,
      upsert: mockUpsert,
    },
  },
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => ({ isLoggedIn: true })),
}))

const mockGetProviderKey = vi.fn()
vi.mock('@/lib/provider-config', () => ({
  getProviderKey: mockGetProviderKey,
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetProviderKey.mockResolvedValue(null)
  mockFindUnique.mockResolvedValue(null)
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockUpdate.mockResolvedValue({})
  mockUpsert.mockResolvedValue({})
})

function okHF() {
  return Promise.resolve(new Response(JSON.stringify({ name: 'user', type: 'user' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}
function okGroq() {
  return Promise.resolve(new Response(JSON.stringify({ data: [{ id: 'm1' }, { id: 'm2' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}
function okTogether() {
  return Promise.resolve(new Response(JSON.stringify([{ id: 'm1' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}
function failHttp(status = 401) {
  return Promise.resolve(new Response('{"error":"bad"}', { status, headers: { 'Content-Type': 'application/json' } }))
}

function makeReq(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/admin/settings/test-x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

/** Return all DB write calls across updateMany, update, and upsert. */
function allWriteCalls() {
  return [
    ...mockUpdateMany.mock.calls,
    ...mockUpdate.mock.calls,
    ...mockUpsert.mock.calls,
  ] as Array<[Record<string, unknown>]>
}

// ── Test 1: HuggingFace ───────────────────────────────────────────────────────

describe('Test 1: test-huggingface never writes apiKey: empty', () => {
  it('success with stored key → updateMany only, no upsert', async () => {
    mockGetProviderKey.mockResolvedValue('hf-real-key')
    mockFetch.mockReturnValue(okHF())

    const { POST } = await import('@/app/api/admin/settings/test-huggingface/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(true)

    expect(mockUpsert).not.toHaveBeenCalled()
    for (const [arg] of allWriteCalls()) {
      const data = (arg.data ?? {}) as Record<string, unknown>
      expect(data.apiKey).toBeUndefined()
    }
  })

  it('no key → failure, zero DB writes', async () => {
    mockGetProviderKey.mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/settings/test-huggingface/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('API failure with stored key → no DB write', async () => {
    mockGetProviderKey.mockResolvedValue('hf-real-key')
    mockFetch.mockReturnValue(failHttp(401))

    const { POST } = await import('@/app/api/admin/settings/test-huggingface/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

// ── Test 2: Groq ──────────────────────────────────────────────────────────────

describe('Test 2: test-groq never writes apiKey: empty', () => {
  it('success with stored key → updateMany only, no upsert', async () => {
    mockGetProviderKey.mockResolvedValue('groq-real-key')
    mockFetch.mockReturnValue(okGroq())

    const { POST } = await import('@/app/api/admin/settings/test-groq/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(true)

    expect(mockUpsert).not.toHaveBeenCalled()
    for (const [arg] of allWriteCalls()) {
      const data = (arg.data ?? {}) as Record<string, unknown>
      expect(data.apiKey).toBeUndefined()
    }
  })

  it('no key → failure, zero DB writes', async () => {
    mockGetProviderKey.mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/settings/test-groq/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

// ── Test 3: Together ──────────────────────────────────────────────────────────

describe('Test 3: test-together never writes apiKey: empty', () => {
  it('success with stored key → updateMany only, no upsert', async () => {
    mockGetProviderKey.mockResolvedValue('together-real-key')
    mockFetch.mockReturnValue(okTogether())

    const { POST } = await import('@/app/api/admin/settings/test-together/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(true)

    expect(mockUpsert).not.toHaveBeenCalled()
    for (const [arg] of allWriteCalls()) {
      const data = (arg.data ?? {}) as Record<string, unknown>
      expect(data.apiKey).toBeUndefined()
    }
  })

  it('no key → failure, zero DB writes', async () => {
    mockGetProviderKey.mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/settings/test-together/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

// ── Test 4 & 5: Key preservation ─────────────────────────────────────────────

describe('Test 4 & 5: Existing saved apiKey never touched on success or failure', () => {
  it('no write call ever sets apiKey field (HF success path)', async () => {
    mockGetProviderKey.mockResolvedValue('hf-real-key')
    mockFetch.mockReturnValue(okHF())

    const { POST } = await import('@/app/api/admin/settings/test-huggingface/route')
    await POST(makeReq())

    for (const [arg] of allWriteCalls()) {
      const data = (arg.data ?? {}) as Record<string, unknown>
      expect(data).not.toHaveProperty('apiKey')
    }
  })

  it('no write call ever sets apiKey field (Groq failure path)', async () => {
    mockGetProviderKey.mockResolvedValue('groq-real-key')
    mockFetch.mockReturnValue(failHttp(429))

    const { POST } = await import('@/app/api/admin/settings/test-groq/route')
    await POST(makeReq())

    for (const [arg] of allWriteCalls()) {
      const data = (arg.data ?? {}) as Record<string, unknown>
      expect(data).not.toHaveProperty('apiKey')
    }
  })
})

// ── Test 6: No key → missing_key, not connected ───────────────────────────────

describe('Test 6: No key returns missing error; no connected state written', () => {
  it('HF: no key → success:false, no lastTestStatus:passed written', async () => {
    mockGetProviderKey.mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/settings/test-huggingface/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    // No write happened at all
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('Together: no key → success:false, no row created', async () => {
    mockGetProviderKey.mockResolvedValue(null)

    const { POST } = await import('@/app/api/admin/settings/test-together/route')
    const res = await POST(makeReq())
    expect((await res.json()).success).toBe(false)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

// ── Test 7: recordMeshTestResult uses updateMany ──────────────────────────────

describe('Test 7: recordMeshTestResult uses updateMany, not upsert', () => {
  it('calls updateMany, never upsert, data has no apiKey', async () => {
    mockFindUnique.mockResolvedValue(null)

    const { recordMeshTestResult } = await import('@/lib/provider-mesh-status')
    await recordMeshTestResult({ id: 'groq', success: true, capabilities: ['text'] })

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateMany).toHaveBeenCalled()

    const lastCall = mockUpdateMany.mock.calls.at(-1) as [{ where: unknown; data: Record<string, unknown> }]
    expect(lastCall[0].data).not.toHaveProperty('apiKey')
  })

  it('success path writes lastTestStatus:passed in notes', async () => {
    mockFindUnique.mockResolvedValue({ notes: '{}' })

    const { recordMeshTestResult } = await import('@/lib/provider-mesh-status')
    await recordMeshTestResult({ id: 'huggingface', success: true, capabilities: ['text'] })

    const lastCall = mockUpdateMany.mock.calls.at(-1) as [{ data: { notes: string } }]
    const notes = JSON.parse(lastCall[0].data.notes) as Record<string, unknown>
    expect(notes.lastTestStatus).toBe('passed')
    expect(notes.lastTestPassed).toBe(true)
  })

  it('failure path writes lastTestStatus:failed in notes', async () => {
    mockFindUnique.mockResolvedValue({ notes: '{}' })

    const { recordMeshTestResult } = await import('@/lib/provider-mesh-status')
    await recordMeshTestResult({ id: 'groq', success: false, capabilities: [], error: 'rate limited' })

    const lastCall = mockUpdateMany.mock.calls.at(-1) as [{ data: { notes: string } }]
    const notes = JSON.parse(lastCall[0].data.notes) as Record<string, unknown>
    expect(notes.lastTestStatus).toBe('failed')
    expect(notes.lastTestPassed).toBe(false)
  })
})
