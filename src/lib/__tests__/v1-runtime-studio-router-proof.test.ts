import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  normalizeRoutingQuality,
  selectCapabilityRoutePlan,
} from '@/lib/capability-routing-policy'
import { clearProviderPerformanceMemory } from '@/lib/provider-performance'
import {
  buildLyricsPrompt,
  resolveGenre,
  validateMusicRequest,
  type MusicCreationRequest,
} from '@/lib/music-studio'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

const ROOT = process.cwd()
const originalEnv = { ...process.env }
const configured: ApprovedDirectProviderId[] = [
  'genx',
  'huggingface',
  'qwen',
  'mimo',
  'groq',
  'together',
]

function source(file: string) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

beforeEach(() => {
  process.env = { ...originalEnv }
  delete process.env.MIMO_RUNTIME_API_ENABLED
  clearProviderPerformanceMemory()
})

afterEach(() => {
  process.env = { ...originalEnv }
  clearProviderPerformanceMemory()
})

describe('V1 runtime, Studio, and capability router proof', () => {
  it('uses MariaDB in Prisma and documents the exact production URL format', () => {
    expect(source('prisma/schema.prisma')).toContain('provider = "mysql"')
    expect(source('.env.example')).toContain(
      'DATABASE_URL="mysql://amarktai:STRONG_PASSWORD@127.0.0.1:3306/amarktai"',
    )
    const deploy = source('docs/deploy/backend-deploy-checklist.md')
    expect(deploy).toContain('npx prisma generate')
    expect(deploy).toContain('npm run build')
    expect(deploy).toContain('amarktai-platform.service')
    expect(deploy).not.toMatch(/postgresql:|mongodb:/i)
  })

  it('normalizes auto and mixed without creating a fifth execution tier', () => {
    expect(normalizeRoutingQuality('cheap')).toBe('cheap')
    expect(normalizeRoutingQuality('balanced')).toBe('balanced')
    expect(normalizeRoutingQuality('premium')).toBe('premium')
    expect(normalizeRoutingQuality('auto')).toBe('auto')
    expect(normalizeRoutingQuality('mixed')).toBe('auto')
  })

  it('selects providers by capability and requested quality', async () => {
    const cheapText = await selectCapabilityRoutePlan({
      capability: 'chat',
      qualityTier: 'cheap',
      configuredProviderIds: configured,
    })
    const autoImage = await selectCapabilityRoutePlan({
      capability: 'text_to_image',
      qualityTier: 'auto',
      configuredProviderIds: configured,
    })
    const balancedVideo = await selectCapabilityRoutePlan({
      capability: 'text_to_video',
      qualityTier: 'balanced',
      configuredProviderIds: configured,
    })
    const premiumText = await selectCapabilityRoutePlan({
      capability: 'chat',
      qualityTier: 'premium',
      configuredProviderIds: configured,
    })

    expect(cheapText.selected?.route.provider).toBe('groq')
    expect(autoImage.selected?.configured).toBe(true)
    expect(autoImage.selected?.route.executable).toBe(true)
    const qwenImageCandidate = autoImage.candidates.find((candidate) => candidate.route.provider === 'qwen')
    const selectedImageCandidate = autoImage.selected
    expect(qwenImageCandidate).toBeDefined()
    expect(qwenImageCandidate?.configured).toBe(true)
    expect(qwenImageCandidate?.route.executable).toBe(true)
    expect(qwenImageCandidate?.rank).toBeLessThanOrEqual(selectedImageCandidate?.rank ?? Infinity)
    if (selectedImageCandidate?.route.provider !== 'qwen') {
      expect(autoImage.reason).toContain('runtime proof/performance selected')
      expect(autoImage.rejectedCandidates).toEqual(expect.arrayContaining([
        expect.objectContaining({
          provider: 'qwen',
          code: 'RUNTIME_FALLBACK_SELECTED',
        }),
      ]))
    }
    expect(balancedVideo.selected?.route.provider).toBe('qwen')
    expect(premiumText.selected?.configured).toBe(true)
    expect(premiumText.selected?.route.executable).toBe(true)
    const genxPremiumCandidate = premiumText.candidates.find((candidate) => candidate.route.provider === 'genx')
    const selectedPremiumCandidate = premiumText.selected
    expect(genxPremiumCandidate).toBeDefined()
    expect(genxPremiumCandidate?.configured).toBe(true)
    expect(genxPremiumCandidate?.route.executable).toBe(true)
    expect(genxPremiumCandidate?.rank).toBeLessThanOrEqual(selectedPremiumCandidate?.rank ?? Infinity)
    if (selectedPremiumCandidate?.route.provider !== 'genx') {
      expect(premiumText.reason).toContain('runtime proof/performance selected')
      expect(premiumText.rejectedCandidates).toEqual(expect.arrayContaining([
        expect.objectContaining({
          provider: 'genx',
          code: 'RUNTIME_FALLBACK_SELECTED',
        }),
      ]))
    }
    expect(new Set([
      cheapText.selected?.route.provider,
      autoImage.selected?.route.provider,
      balancedVideo.selected?.route.provider,
      premiumText.selected?.route.provider,
    ]).size).toBeGreaterThan(1)
  })

  it('keeps MiMo visible while routing around runtime-blocked audio execution by default', async () => {
    const plan = await selectCapabilityRoutePlan({
      capability: 'text_to_speech',
      qualityTier: 'balanced',
      configuredProviderIds: ['mimo', 'groq'],
    })

    expect(plan.candidates.map((candidate) => candidate.route.provider)).toContain('mimo')
    expect(plan.selected?.route.provider).toBe('groq')
    expect(plan.rejectedCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        provider: 'mimo',
        code: 'RUNTIME_FALLBACK_SELECTED',
      }),
    ]))
  })

  it('allows tests to opt into MiMo runtime execution explicitly without hiding the provider by default', async () => {
    const disabledPlan = await selectCapabilityRoutePlan({
      capability: 'text_to_speech',
      qualityTier: 'balanced',
      configuredProviderIds: ['mimo', 'groq'],
    })

    process.env.MIMO_RUNTIME_API_ENABLED = 'true'
    clearProviderPerformanceMemory()

    const enabledPlan = await selectCapabilityRoutePlan({
      capability: 'text_to_speech',
      qualityTier: 'balanced',
      configuredProviderIds: ['mimo', 'groq'],
    })

    expect(disabledPlan.candidates.map((candidate) => candidate.route.provider)).toContain('mimo')
    expect(enabledPlan.candidates.map((candidate) => candidate.route.provider)).toContain('mimo')
    expect(enabledPlan.selected?.configured).toBe(true)
    expect(enabledPlan.selected?.route.executable).toBe(true)
  })

  it('returns setup required instead of selecting an unconfigured provider', async () => {
    const plan = await selectCapabilityRoutePlan({
      capability: 'text_to_image',
      qualityTier: 'auto',
      configuredProviderIds: [],
    })
    expect(plan.selected).toBeNull()
    expect(plan.setupRequired).toBe(true)
    expect(plan.reason).toContain('No configured provider credential')
  })

  it('routes Studio image work through the canonical orchestrator', () => {
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const image = source('src/app/api/brain/image/route.ts')
    const router = source('src/lib/capability-router.ts')
    expect(studio).toContain('executeCapabilityOrchestration')
    expect(image).toContain('executeCapability')
    expect(router).toContain('return executeCapabilityOrchestration(request)')
  })

  it('supports multi-genre music blends and quality policy', () => {
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const music = source('src/lib/music-studio.ts')
    expect(studio).toContain('genres?: string[]')
    expect(studio).toContain('normalizeGenres')
    expect(studio).toContain('Blend styles:')
    expect(music).toContain('maximum 5 genres allowed')
    expect(music).toContain("'cheap' | 'balanced' | 'premium' | 'auto'")
  })

  it('validates and preserves a multi-genre music blend contract', () => {
    const request: MusicCreationRequest = {
      appSlug: 'marketing',
      theme: 'A confident product launch',
      genre: 'rock',
      genres: ['rock', 'pop', 'folk'],
      moods: ['uplifting'],
      vocalStyle: 'female_lead',
      durationSeconds: 180,
      qualityTier: 'premium',
    }
    expect(() => validateMusicRequest(request)).not.toThrow()
    expect(resolveGenre(request)).toBe('rock')
    expect(buildLyricsPrompt(request)).toContain('Rock, Pop, Folk')
    expect(() => validateMusicRequest({
      ...request,
      genres: ['rock', 'pop', 'folk', 'country', 'jazz', 'soul'],
    })).toThrow('maximum 5 genres allowed')
  })

  it('keeps Studio job and artifact truth connected to execution records', () => {
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const media = source('src/lib/media-studio.ts')
    expect(studio).toContain('recordExecutionResponse')
    expect(media).toContain('execution.artifacts.map')
    expect(media).toContain('execution.jobs.at(-1)')
    expect(source('src/lib/orchestrator.ts')).toContain("'NEEDS_CONFIGURATION'")
  })

  it('keeps connected-app capability, quality, scope, audit, job, and artifact contracts', () => {
    const engine = source('src/lib/connected-app-capability-engine.ts')
    const route = source('src/app/api/connected-apps/capabilities/execute/route.ts')
    expect(engine).toContain('qualityTier?: RoutingQualityTier')
    expect(engine).toContain('callbackUrl?: string')
    expect(engine).toContain('referenceMetadata?: Record<string, unknown>')
    expect(engine).toContain('Missing required scope')
    expect(engine).toContain('recordAcceptedEvent')
    expect(engine).toContain('createArtifact')
    expect(route).toContain('jobId: job.id')
    expect(route).toContain('qualityTier: job.qualityTier')
    expect(route).not.toContain('provider: job.provider')
    expect(route).not.toContain('model: job.model')
    expect(route).not.toContain('adapter: job.adapter')
    const jobRoute = source('src/app/api/connected-apps/capabilities/jobs/[jobId]/route.ts')
    expect(jobRoute).toContain('qualityTier: job.qualityTier')
    expect(jobRoute).not.toContain('provider: job.provider')
    expect(jobRoute).not.toContain('model: job.model')
    expect(jobRoute).not.toContain('adapter: job.adapter')
  })

  it('keeps provider names out of the public website', () => {
    const publicCorpus = [
      'src/app/page.tsx',
      'src/app/platform/page.tsx',
      'src/app/about/page.tsx',
      'src/components/public/PublicShell.tsx',
    ].map(source).join('\n')
    for (const provider of ['GenX', 'Hugging Face', 'Qwen', 'MiMo', 'Groq', 'Together AI']) {
      expect(publicCorpus).not.toContain(provider)
    }
  })

  it('documents and exposes the planned domain and VPS monitoring contract', () => {
    const env = source('.env.example')
    const nginx = source('deploy/nginx.conf')
    const monitor = source('src/lib/vps-monitor.ts')
    const plan = source('docs/audits/V1_DOMAIN_VPS_SUBDOMAIN_STORAGE_MONITORING_PLAN.md')
    expect(env).toContain('VPS_MONITOR_API_KEY')
    expect(nginx).toContain('server_name amarktai.co.za www.amarktai.co.za')
    expect(monitor).toContain('artifactBytes')
    expect(monitor).toContain('upgradeRecommended')
    expect(plan).toContain('marketing.amarktai.co.za')
    expect(plan).toContain('127.0.0.1:3101')
    expect(plan).toContain('/var/www/amarktai/apps/<app-slug>')
  })

  it('documents wildcard DNS without enabling a fake subdomain app router', () => {
    const rootTruth = source('README_VPS_AMARKTAI_OPERATING_TRUTH.md')
    const docsTruth = source('docs/AMARKTAI_V1_OPERATING_TRUTH.md')
    const deploy = source('docs/deploy/DOMAIN_DNS_NGINX_VPS.md')
    const nginx = source('deploy/nginx.conf')

    for (const truth of [rootTruth, docsTruth]) {
      expect(truth).toContain('AmarktAI is the main AI operating system and capability engine')
      expect(truth).toContain('/var/www/amarktai/apps/<app-slug>')
      expect(truth).toContain('HMAC-signed')
      expect(truth).toContain('cheap')
      expect(truth).toContain('balanced')
      expect(truth).toContain('premium')
      expect(truth).toContain('auto')
      expect(truth).toContain('App Builder')
      expect(truth).toContain('Repo Workbench')
      expect(truth).toContain('MCP')
    }

    expect(deploy).toContain('| A | `*` | `VPS_PUBLIC_IP` |')
    expect(deploy).toContain('DNS-01 validation')
    expect(deploy).toContain('Register `<slug>.amarktai.co.za` in AmarktAI Connected Apps')
    expect(nginx).toContain('#     server_name *.amarktai.co.za;')
    expect(nginx).toContain('#     return 404;')
    expect(nginx).not.toMatch(/^\s*server_name \*\.amarktai\.co\.za;/m)
  })
})
