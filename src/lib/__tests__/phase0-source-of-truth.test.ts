import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import {
  APPROVED_DIRECT_PROVIDER_IDS,
  AI_PROVIDER_MESH,
  isApprovedDirectProvider,
} from '@/lib/provider-mesh'
import { MODEL_REGISTRY } from '@/lib/model-registry'
import {
  UNIVERSAL_MODEL_ROUTES,
  adultPolicyAllows,
  normalizeAdultPolicy,
} from '@/lib/universal-model-catalog'
import {
  getCapabilityStatus,
  type RuntimeReadinessState,
} from '@/lib/runtime-capability-truth'
import { getAppSafetyConfig } from '@/lib/content-filter'

const ROOT = process.cwd()
const PROHIBITED_DIRECT = [
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'minimax',
  'replicate',
  'suno',
  'udio',
  'openrouter',
  'cohere',
  'mistral',
  'nvidia',
  'grok',
  'xai',
]

function source(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

function filesUnder(directory: string): string[] {
  const absolute = path.join(ROOT, directory)
  if (!fs.existsSync(absolute)) return []
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(relative) : [relative]
  })
}

describe('Phase 0 source-of-truth contract', () => {
  it('removes voice login from source, docs, environment examples, and tests', () => {
    const files = ['src', 'docs']
      .flatMap(filesUnder)
      .filter(file => /\.(ts|tsx|js|jsx|md|json|env|example)$/i.test(file))
      .filter(file => !file.endsWith('phase0-source-of-truth.test.ts'))
    const corpus = files.map(source).join('\n').toLowerCase()
    for (const term of ['voice-login', 'allowvoicelogin', 'loginpassphrase', 'voice passphrase', 'voice access login']) {
      expect(corpus).not.toContain(term)
    }
  })

  it('keeps adult mode off by default and controlled by app policy', () => {
    expect(getAppSafetyConfig('__phase0_unknown_app__')).toMatchObject({
      safeMode: true,
      adultMode: false,
      suggestiveMode: false,
    })
    expect(normalizeAdultPolicy()).toBe('off')
    expect(adultPolicyAllows('off', 'adult_text')).toBe(false)
    expect(adultPolicyAllows('adult_text', 'adult_text')).toBe(true)
    expect(adultPolicyAllows('adult_text', 'adult_image')).toBe(false)
    for (const route of ['adult-text', 'adult-image', 'adult-video', 'tts']) {
      expect(fs.existsSync(path.join(ROOT, 'src', 'app', 'api', 'brain', route, 'route.ts'))).toBe(true)
    }
  })

  it('keeps all required dashboard sections in canonical order', () => {
    expect(DASHBOARD_NAV_ITEMS.map(item => item.label)).toEqual([
      'Command Center',
      'App Builder',
      'Connected Apps',
      'Provider Mesh',
      'Model Universe',
      'Agents',
      'Repo Workbench',
      'Media Studio',
      'Outputs',
      'Avatar / Voice',
      'Jobs / Approvals',
      'Memory / Learning',
      'Control Center / Operations',
      'Settings',
    ])
  })

  it('defines exactly the six approved direct providers in provider-mesh', () => {
    expect(APPROVED_DIRECT_PROVIDER_IDS).toEqual([
      'genx',
      'huggingface',
      'qwen',
      'mimo',
      'groq',
      'together',
    ])
    expect(AI_PROVIDER_MESH.map(provider => provider.id)).toEqual(APPROVED_DIRECT_PROVIDER_IDS)
    for (const provider of PROHIBITED_DIRECT) expect(isApprovedDirectProvider(provider)).toBe(false)
  })

  it('has no prohibited direct provider key or endpoint in executable source', () => {
    const executable = filesUnder('src')
      .filter(file => /\.(ts|tsx)$/i.test(file))
      .filter(file => !file.includes(`${path.sep}__tests__${path.sep}`) && !file.endsWith('.test.ts'))
      .map(source)
      .join('\n')
    for (const provider of PROHIBITED_DIRECT) {
      expect(executable).not.toMatch(new RegExp(`getVaultApiKey\\(['"]${provider}['"]\\)`))
    }
    for (const host of [
      'api.openai.com',
      'generativelanguage.googleapis.com',
      'api.anthropic.com',
      'api.cohere.com',
      'api.deepseek.com',
      'openrouter.ai',
      'api.x.ai',
      'api.mistral.ai',
      'integrate.api.nvidia.com',
    ]) {
      expect(executable).not.toContain(host)
    }
  })

  it('allows routed labels only under GenX and treats Hugging Face IDs as model IDs', () => {
    const claude = UNIVERSAL_MODEL_ROUTES.find(model => model.modelId.includes('claude'))
    const gemini = UNIVERSAL_MODEL_ROUTES.find(model => model.modelId.includes('gemini'))
    const whisper = UNIVERSAL_MODEL_ROUTES.find(model => model.modelId === 'openai/whisper-large-v3')
    expect(claude?.provider).toBe('genx')
    expect(gemini?.provider).toBe('genx')
    expect(whisper?.provider).toBe('huggingface')
    expect(isApprovedDirectProvider(whisper!.modelId.split('/')[0])).toBe(false)
  })

  it('uses only canonical readiness states and never fakes READY without a connection', async () => {
    const states: RuntimeReadinessState[] = [
      'READY',
      'DEGRADED',
      'NEEDS_CONFIGURATION',
      'BLOCKED',
      'UNAVAILABLE',
    ]
    expect(new Set(states).size).toBe(5)
    const capabilities = await getCapabilityStatus(false, [])
    expect(capabilities.every(capability => capability.status === 'NEEDS_CONFIGURATION')).toBe(true)
    expect(capabilities.some(capability => capability.status === 'READY')).toBe(false)
  })

  it('keeps model-registry as a compatibility adapter over the universal catalog', () => {
    expect(MODEL_REGISTRY).toHaveLength(UNIVERSAL_MODEL_ROUTES.length)
    expect(MODEL_REGISTRY.map(model => `${model.provider}:${model.model_id}`)).toEqual(
      UNIVERSAL_MODEL_ROUTES.map(model => `${model.provider}:${model.modelId}`),
    )
    const registrySource = source('src/lib/model-registry.ts')
    expect(registrySource).toContain('UNIVERSAL_MODEL_ROUTES.map(toLegacyModel)')
    expect(registrySource).not.toContain('const MODEL_DECLARATIONS')
  })

  it('keeps the public website entry point', () => {
    expect(fs.existsSync(path.join(ROOT, 'src', 'app', 'page.tsx'))).toBe(true)
  })
})
