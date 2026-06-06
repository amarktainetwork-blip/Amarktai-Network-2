import { describe, expect, it } from 'vitest'
import { routeCommand } from '@/lib/command-router'

describe('unified command router', () => {
  it('routes songs to Workspace with approved providers', () => {
    const route = routeCommand('Create a 3-minute rock, pop, and rasta song.', {}, ['genx', 'together'])
    expect(route.intent).toBe('create_song')
    expect(route.surface).toBe('Workspace')
    expect(route.artifacts).toContain('MP3/WAV')
    expect(route.providerStrategy[0]).toContain('GenX')
    expect(route.options.duration).toBe('180')
    expect(route.options.genres).toEqual(expect.arrayContaining(['rock', 'pop', 'rasta/reggae']))
    expect(route.options.combineGenres).toBe(true)
    expect(route.selectedCapability).toBe('music')
    expect(route.selectedProviders).toEqual(['genx'])
  })

  it('routes repo fixes through an approval gate', () => {
    const route = routeCommand('Finish this app and create a PR.')
    expect(['fix_repo', 'create_pr']).toContain(route.intent)
    expect(route.surface).toBe('Workspace')
    expect(route.approvalRequired).toBe(true)
  })

  it('routes VPS health to read-only System diagnostics', () => {
    const route = routeCommand('Is the VPS healthy?')
    expect(route.intent).toBe('monitor_vps')
    expect(route.surface).toBe('Workspace')
    expect(route.approvalRequired).toBe(false)
  })

  it('routes new products to App Builder workflow', () => {
    const route = routeCommand('Build me a marketing app.')
    expect(route.intent).toBe('build_new_app')
    expect(route.surface).toBe('App Builder')
    expect(route.artifacts).toContain('runtime QA')
  })
})
