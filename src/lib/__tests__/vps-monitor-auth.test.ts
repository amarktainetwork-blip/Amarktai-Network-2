import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const session = vi.hoisted(() => ({ isLoggedIn: false }))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => session),
}))

import { isVpsMonitorAuthorized } from '@/lib/vps-monitor-auth'

const originalKey = process.env.VPS_MONITOR_API_KEY

afterEach(() => {
  session.isLoggedIn = false
  if (originalKey === undefined) delete process.env.VPS_MONITOR_API_KEY
  else process.env.VPS_MONITOR_API_KEY = originalKey
})

describe('VPS monitor authorization', () => {
  it('allows an authenticated admin session', async () => {
    session.isLoggedIn = true
    expect(await isVpsMonitorAuthorized(request())).toBe(true)
  })

  it('allows the configured monitor key by header or bearer token', async () => {
    process.env.VPS_MONITOR_API_KEY = 'monitor-secret'
    expect(await isVpsMonitorAuthorized(request({
      'x-amarktai-vps-key': 'monitor-secret',
    }))).toBe(true)
    expect(await isVpsMonitorAuthorized(request({
      authorization: 'Bearer monitor-secret',
    }))).toBe(true)
  })

  it('rejects missing and invalid monitor keys', async () => {
    process.env.VPS_MONITOR_API_KEY = 'monitor-secret'
    expect(await isVpsMonitorAuthorized(request())).toBe(false)
    expect(await isVpsMonitorAuthorized(request({
      'x-amarktai-vps-key': 'wrong-secret',
    }))).toBe(false)
  })
})

function request(headers?: HeadersInit) {
  return new NextRequest('https://amarktai.co.za/api/admin/system/vps', { headers })
}
