import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { getArtifactType, getCapabilityRoute } from '@/lib/capability-display'
import { CAPABILITY_UI_MODES } from '@/lib/capability-ui-schema'
import { CORE_PROOF_CAPABILITIES, normalizeCoreProofRouteResult } from '@/lib/core-capability-proof-runner'
import { PROVIDER_MESH } from '@/lib/provider-mesh'

const root = process.cwd()
const src = (relativePath: string) => fs.readFileSync(path.join(root, 'src', relativePath), 'utf8')
const rootFile = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('core live proof pack and capabilities display', () => {
  it('does not mislabel audio or music artifact types as image', () => {
    expect(getArtifactType({ capabilityId: 'music_generation' }, { artifactType: 'audio' })).toBe('audio')
    expect(getArtifactType({ capabilityId: 'tts' }, { artifactType: null })).toBe('audio')
    expect(getArtifactType({ capabilityId: 'voice_clone' }, { artifactType: null })).toBe('audio')
  })

  it('renders video, transcript, and document artifact types correctly', () => {
    expect(getArtifactType({ capabilityId: 'video_generation' }, { artifactType: null })).toBe('video')
    expect(getArtifactType({ capabilityId: 'stt' }, { artifactType: null })).toBe('transcript')
    expect(getArtifactType({ capabilityId: 'chat' }, { artifactType: null })).toBe('document')
  })

  it('route column uses executionRoute or schema knownRoute, never capabilityId', () => {
    expect(getCapabilityRoute({ capabilityId: 'image_generation', executionRoute: '/api/brain/image' }, { knownRoute: '/schema' })).toBe('/api/brain/image')
    expect(getCapabilityRoute({ capabilityId: 'avatar_generation', executionRoute: null }, { knownRoute: '/api/brain/avatar-video' })).toBe('/api/brain/avatar-video')
    expect(getCapabilityRoute({ capabilityId: 'unknown_capability', executionRoute: null }, { knownRoute: null })).toBe('Missing')

    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain('getCapabilityRoute(entry, meta)')
    expect(page).not.toContain("entry.hasExecutionRoute ? entry.capabilityId : 'Missing'")
  })

  it('keeps wired_unproven mapped to Needs proof', () => {
    const page = src('app/admin/dashboard/capabilities/page.tsx')
    expect(page).toContain("wired_unproven: 'Needs proof'")
  })

  it('Studio execute rejects override fields and no longer sends modelOverride to image execution', () => {
    const route = src('app/api/admin/studio/execute/route.ts')
    expect(route).toContain("const forbiddenFields = ['provider', 'model', 'providerOverride', 'modelOverride'] as const")
    expect(route).toContain('Studio UI payload cannot include')
    expect(route).not.toContain('modelOverride: route.selectedModel')
    expect(route).not.toContain('providerOverride: route.selectedProvider')
  })

  it('core schema modes map to executable proof route contracts', () => {
    const coreModes = ['chat', 'image', 'video', 'long_form_video', 'music', 'tts', 'stt', 'avatar']
    for (const modeId of coreModes) {
      const mode = CAPABILITY_UI_MODES.find((entry) => entry.id === modeId)
      expect(mode, `${modeId} missing from UI schema`).toBeDefined()
      expect(CORE_PROOF_CAPABILITIES.some((entry) => entry.mode === modeId || (modeId === 'stt' && entry.capability === 'stt'))).toBe(true)
    }
  })

  it('non-executable Studio modes return blockers instead of fake success', () => {
    const route = src('app/api/admin/studio/execute/route.ts')
    for (const mode of ['automation', 'publishing', 'trading', 'adult_private']) {
      expect(route).toContain(`mode === '${mode}'`)
    }
    expect(route).toContain('nonExecutableModeBlocker')
    expect(route).toContain('executed: false')
    expect(route).toContain('nextAction')
  })

  it('core proof route exposes the JSON contract with a capabilities array', () => {
    const route = src('app/api/admin/proof/core/route.ts')
    const runner = src('lib/core-capability-proof-runner.ts')
    expect(route).toContain('runCoreCapabilityProofPack')
    expect(runner).toContain('success: boolean')
    expect(runner).toContain('ranAt: string')
    expect(runner).toContain('capabilities: CoreProofCapabilityResult[]')
  })

  it('HTTP core proof route remains admin protected', () => {
    const route = src('app/api/admin/proof/core/route.ts')
    expect(route).toContain('getSession')
    expect(route).toContain('!session.isLoggedIn')
    expect(route).toContain("error: 'Unauthorized'")
    expect(route).toContain('status: 401')
  })

  it('package proof script runs the auth-safe local wrapper', () => {
    const pkg = JSON.parse(rootFile('package.json')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.proof).toBe('npx tsx scripts/run-core-proof.ts')
    expect(fs.existsSync(path.join(root, 'scripts/run-core-proof.ts'))).toBe(true)
  })

  it('proof CLI reuses the existing runner and does not copy execution logic', () => {
    const script = rootFile('scripts/run-core-proof.ts')
    expect(script).toContain("from '../src/lib/core-capability-proof-runner'")
    expect(script).toContain('runCoreCapabilityProofPack()')
    expect(script).toContain('JSON.stringify(result, null, compact ? 0 : 2)')
    expect(script).toContain("--compact")
    for (const forbidden of [
      'routeLiveModel',
      'callProvider',
      'callGenXMedia',
      'fetch(',
      '/api/brain/adult',
      'adultTextPost',
      'adultImagePost',
      'providerOverride',
      'modelOverride',
    ]) {
      expect(script).not.toContain(forbidden)
    }
  })

  it('does not create a duplicate proof runner layer', () => {
    const files = execFileSync('git', ['ls-files', 'src/lib', 'scripts'], {
      cwd: root,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean)
    expect(files.filter((file) => file.endsWith('core-capability-proof-runner.ts'))).toEqual(['src/lib/core-capability-proof-runner.ts'])
    expect(files.some((file) => /proof-v2|dashboard-v2|studio-v2/i.test(file))).toBe(false)
  })

  it('core proof normalization never marks missing config as proven', () => {
    const result = normalizeCoreProofRouteResult('image_generation', '/api/brain/image', {
      success: false,
      executed: false,
      jobStatus: 'needs_setup',
      blocker: 'Together AI key not configured.',
    })
    expect(result.status).toBe('not_configured')
  })

  it('core proof normalization never marks async jobs as proven without persisted artifact', () => {
    const result = normalizeCoreProofRouteResult('video_generation', '/api/brain/video-generate', {
      success: true,
      executed: true,
      jobStatus: 'processing',
      jobId: 'job_123',
      pollUrl: '/api/brain/video-generate/job_123',
      provider: 'genx',
      model: 'kling-v2.5-turbo',
    })
    expect(result.status).toBe('needs_proof')
    expect(result.jobId).toBe('job_123')
    expect(result.pollUrl).toBe('/api/brain/video-generate/job_123')
  })

  it('core proof normalization preserves artifact and storage fields for completed media', () => {
    for (const capability of ['image_generation', 'music_generation', 'tts', 'video_generation']) {
      const result = normalizeCoreProofRouteResult(capability, '/route', {
        success: true,
        executed: true,
        status: 'completed',
        artifactId: `${capability}-artifact`,
        storageUrl: `/api/artifacts/file/${capability}`,
        provider: 'genx',
        model: 'model',
      })
      expect(result.status).toBe('proven')
      expect(result.artifactId).toBe(`${capability}-artifact`)
      expect(result.storageUrl).toBe(`/api/artifacts/file/${capability}`)
    }
  })

  it('adult private is blocked and not included in core proof execution', () => {
    expect(CORE_PROOF_CAPABILITIES.some((entry) => entry.capability.startsWith('adult') || entry.mode === 'adult_private')).toBe(false)
    const route = src('app/api/admin/studio/execute/route.ts')
    expect(route).toContain('Adult private generation execution is intentionally blocked')
  })

  it('Qwen is not active and opencode.json is unchanged', () => {
    expect(PROVIDER_MESH.some((provider) => String(provider.id) === 'qwen')).toBe(false)
    const status = execFileSync('git', ['status', '--short', '--', 'opencode.json'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(status.trim()).toBe('')
  })
})
