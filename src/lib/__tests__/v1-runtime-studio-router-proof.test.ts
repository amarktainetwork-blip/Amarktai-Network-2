import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  normalizeRoutingQuality,
  selectCapabilityRoutePlan,
} from '@/lib/capability-routing-policy'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

const ROOT = process.cwd()
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

describe('V1 runtime, Studio, and capability router proof', () => {
  it('uses MariaDB in Prisma and documents the exact production URL format', () => {
    expect(source('prisma/schema.prisma')).toContain('provider = "mysql"')
    expect(source('.env.example')).toContain(
      'DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/amarktai"',
    )
    const deploy = source('docs/deploy/backend-deploy-checklist.md')
    expect(deploy).toContain('apt-get install -y mariadb-server')
    expect(deploy).toContain('CREATE DATABASE amarktai')
    expect(deploy).toContain('prisma db push')
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
    expect(autoImage.selected?.route.provider).toBe('qwen')
    expect(balancedVideo.selected?.route.provider).toBe('qwen')
    expect(premiumText.selected?.route.provider).toBe('genx')
    expect(new Set([
      cheapText.selected?.route.provider,
      autoImage.selected?.route.provider,
      balancedVideo.selected?.route.provider,
      premiumText.selected?.route.provider,
    ]).size).toBeGreaterThan(1)
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

  it('routes Studio image work through the canonical capability router', () => {
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const image = source('src/app/api/brain/image/route.ts')
    const router = source('src/lib/capability-router.ts')
    expect(studio).toContain("imagePost(jsonRequest")
    expect(image).toContain('executeCapability')
    expect(router).toContain('selectCapabilityRoutePlan')
    expect(router).toContain('getProviderCapabilityAdapter')
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

  it('keeps Studio job and artifact truth connected to execution records', () => {
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const media = source('src/lib/media-studio.ts')
    expect(studio).toContain('recordExecutionResponse')
    expect(media).toContain('execution.artifacts.map')
    expect(media).toContain('execution.jobs.at(-1)')
    expect(studio).toContain("readiness: 'NEEDS_CONFIGURATION'")
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
})
