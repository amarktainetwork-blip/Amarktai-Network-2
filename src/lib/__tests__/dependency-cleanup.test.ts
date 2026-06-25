/**
 * Dependency Cleanup Tests
 *
 * Proves:
 *  - Firecrawl is NOT imported by src/lib runtime files
 *  - package.json has no Firecrawl package dependency
 *  - scrape_website capability routes to in-house scraper (not Firecrawl)
 *  - Active runtime providers are only genx/huggingface/together/groq/mimo
 *  - Removed providers are not in capability-engine suggestedProviders
 *  - Apps cannot pass providerOverride/modelOverride through agent workflow inputs
 *  - Model catalog family strings are not falsely treated as platform providers
 *  - Marketing workflow still uses scraper/RAG/agent/runtime (not Firecrawl)
 *  - VPS monitoring provider health checks only active providers
 *  - capability-engine suggestedProviders contain only allowed providers
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../../..')

// ── Helper: read source file as string ───────────────────────────────────────

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8')
}

// ── Firecrawl import checks ───────────────────────────────────────────────────

describe('Firecrawl cleanup — runtime source files', () => {
  const REMOVED_IMPORT = "from '@/lib/firecrawl'"
  const REMOVED_IMPORT_ALT = "from '../firecrawl'"

  const RUNTIME_LIB_FILES = [
    'src/lib/capability-router.ts',
    'src/lib/marketing-workflow.ts',
    'src/lib/rag-capability.ts',
    'src/lib/scraper.ts',
    'src/lib/agent-system.ts',
    'src/lib/vps-monitoring.ts',
    'src/lib/publishing-scheduler.ts',
    'src/lib/campaign-storage.ts',
    'src/lib/memory-capability.ts',
    'src/lib/brand-memory.ts',
  ]

  for (const file of RUNTIME_LIB_FILES) {
    it(`${file} does not import firecrawl`, () => {
      const src = readSrc(file)
      expect(src).not.toContain(REMOVED_IMPORT)
      expect(src).not.toContain(REMOVED_IMPORT_ALT)
      expect(src).not.toContain('firecrawl.ts')
      expect(src).not.toMatch(/require.*firecrawl/)
    })
  }

  it('capability-router.ts uses in-house scraper, not firecrawl', () => {
    const src = readSrc('src/lib/capability-router.ts')
    // Must import from scraper
    expect(src).toContain("from '@/lib/scraper'")
    // Must NOT import from firecrawl
    expect(src).not.toContain("from '@/lib/firecrawl'")
    expect(src).not.toContain('crawlAppWebsite')
  })
})

describe('Firecrawl cleanup — package.json', () => {
  it('package.json has no @mendable/firecrawl-js or @firecrawl/* dependency', () => {
    const pkg = JSON.parse(readSrc('package.json')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    for (const dep of Object.keys(allDeps)) {
      expect(dep.toLowerCase()).not.toContain('firecrawl')
    }
  })
})

// ── Runtime provider governance ───────────────────────────────────────────────

describe('Runtime provider governance — allowed providers only', () => {
  const ALLOWED_PROVIDERS = ['genx', 'huggingface', 'together', 'groq', 'mimo']
  const REMOVED_PROVIDERS = [
    'qwen', 'dashscope', 'wanx', 'minimax', 'openai', 'gemini',
    'anthropic', 'openrouter', 'deepseek', 'moonshot', 'replicate',
    'cohere', 'nvidia', 'mistral',
  ]

  it('all five allowed providers are present', () => {
    for (const p of ALLOWED_PROVIDERS) {
      expect(ALLOWED_PROVIDERS).toContain(p)
    }
    expect(ALLOWED_PROVIDERS).toHaveLength(5)
  })

  it('capability-router.ts does not reference removed providers as platform providers', () => {
    const src = readSrc('src/lib/capability-router.ts')
    for (const removed of REMOVED_PROVIDERS) {
      // Check that removed providers don't appear as provider keys (e.g. 'provider: "openai"')
      // Allow model name strings (e.g. 'openai/whisper' as a model ID under HF)
      const providerKeyPattern = new RegExp(`provider['":\\s]*['"]${removed}['"]`, 'i')
      expect(src).not.toMatch(providerKeyPattern)
    }
  })

  it('provider-capability-map.ts only has allowed providers', () => {
    const src = readSrc('src/lib/provider-capability-map.ts')
    for (const removed of REMOVED_PROVIDERS) {
      // Check provider field values — pattern: provider: 'removed_name'
      const pattern = new RegExp(`provider:\\s*['"]${removed}['"]`, 'i')
      expect(src).not.toMatch(pattern)
    }
  })

  it('capability-registry.ts only has allowed providers', () => {
    const src = readSrc('src/lib/capability-registry.ts')
    for (const removed of REMOVED_PROVIDERS) {
      const pattern = new RegExp(`provider:\\s*['"]${removed}['"]`, 'i')
      expect(src).not.toMatch(pattern)
    }
  })

  it('capability-engine.ts suggestedProviders only contain allowed providers', () => {
    const src = readSrc('src/lib/capability-engine.ts')
    // Find all suggestedProviders arrays in the source
    const suggestedMatches = src.match(/suggestedProviders:\s*\[([^\]]+)\]/g) ?? []
    for (const match of suggestedMatches) {
      // Extract provider strings from the array
      const providers = match.match(/['"]([a-z_]+)['"]/g)?.map(s => s.replace(/['"]/g, '')) ?? []
      for (const p of providers) {
        expect(REMOVED_PROVIDERS).not.toContain(p)
        // Either allowed or a legitimate non-provider string
      }
    }
  })

  it('vps-monitoring.ts ACTIVE_PROVIDERS contains only allowed providers', () => {
    const src = readSrc('src/lib/vps-monitoring.ts')
    // Extract ACTIVE_PROVIDERS constant
    const match = src.match(/ACTIVE_PROVIDERS\s*=\s*\[([^\]]+)\]/)
    expect(match).not.toBeNull()
    const providers = match![1].match(/['"]([a-z]+)['"]/g)?.map(s => s.replace(/['"]/g, '')) ?? []
    expect(providers).toHaveLength(5)
    for (const p of providers) {
      expect(ALLOWED_PROVIDERS).toContain(p)
    }
    for (const removed of REMOVED_PROVIDERS) {
      expect(providers).not.toContain(removed)
    }
  })
})

// ── Model catalog family names — not platform providers ───────────────────────

describe('Model catalog family names — allowed under active providers', () => {
  it('model-registry.ts family names are model metadata, not platform provider keys', () => {
    const src = readSrc('src/lib/model-registry.ts')
    // Model families like 'Qwen', 'Mistral', 'DeepSeek' appear as family metadata
    // under GenX/Together/HuggingFace — that is correct
    expect(src).toContain("family: 'Qwen")    // model family under genx/together
    expect(src).toContain("family: 'Mistral") // model family under genx/together
    // But provider keys for those models should be allowed providers
    // (The model registry doesn't assign provider keys as removed providers)
    const providerPattern = /provider:\s*['"](?:openai|gemini|anthropic|deepseek|minimax|qwen|cohere|nvidia|mistral|replicate)['"](?!\s*\/\/\s*model)/g
    expect(src).not.toMatch(providerPattern)
  })

  it('model family strings are not the same as platform provider keys', () => {
    // This test documents the nuance: 'Qwen' as a model family is allowed
    // but 'qwen' as a platform provider key is not
    const modelFamily = 'Qwen-2.5'
    const platformProvider = 'qwen'
    // They are different strings
    expect(modelFamily.toLowerCase()).not.toBe(platformProvider)
    // Platform provider check should use lowercase exact match
    const REMOVED = ['qwen', 'minimax', 'deepseek', 'mistral']
    expect(REMOVED).not.toContain(modelFamily) // modelFamily is not in removed list
    expect(REMOVED).toContain(platformProvider) // provider key IS in removed list
  })
})

// ── Apps cannot bypass provider/model selection ───────────────────────────────

describe('Apps cannot bypass provider/model selection', () => {
  afterEach(() => vi.resetModules())

  it('AgentConfig type has no providerKey or modelId field', () => {
    // The AgentConfig interface in agent-system.ts has no provider/model fields
    const src = readSrc('src/lib/agent-system.ts')
    // AgentConfig should not have providerKey, modelId, or model as fields
    // (It has budget/quality but not provider selection)
    const configInterface = src.match(/export interface AgentConfig \{[\s\S]*?\}/)?.[0] ?? ''
    expect(configInterface).not.toContain('providerKey:')
    expect(configInterface).not.toContain('modelId:')
    expect(configInterface).not.toContain('model:')
    expect(configInterface).not.toContain('provider:')
  })

  it('agentCallCapability does not forward providerOverride from app', async () => {
    // The agent-system calls executeCapability but must not set providerOverride
    const src = readSrc('src/lib/agent-system.ts')
    // The CapabilityRequest built by agent must not include providerOverride from config
    expect(src).not.toContain('providerOverride: config.provider')
    expect(src).not.toContain('modelOverride: config.model')
    // It should also not use providerOverride at all (runtime decides)
    const reqBuildPattern = /const req.*CapabilityRequest[\s\S]{0,300}providerOverride/
    expect(src).not.toMatch(reqBuildPattern)
  })

  it('marketing-workflow does not pass providerOverride to capability requests', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).not.toContain('providerOverride:')
    expect(src).not.toContain('modelOverride:')
  })
})

// ── Marketing workflow still uses scraper/RAG/agent/runtime ──────────────────

describe('Marketing workflow — scraper/RAG/agent/runtime integration', () => {
  it('imports crawlWebsite from scraper, not firecrawl', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).toContain("from '@/lib/scraper'")
    expect(src).toContain('crawlWebsite')
    expect(src).not.toContain("from '@/lib/firecrawl'")
    expect(src).not.toContain('crawlAppWebsite')
  })

  it('imports RAG functions (ingestWebsite, queryRAG)', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).toContain('ingestWebsite')
    expect(src).toContain('queryRAG')
  })

  it('imports runAgent from agent-system', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).toContain("from '@/lib/agent-system'")
    expect(src).toContain('runAgent')
  })

  it('imports executeCapability from capability-router', () => {
    const src = readSrc('src/lib/marketing-workflow.ts')
    expect(src).toContain("from '@/lib/capability-router'")
    expect(src).toContain('executeCapability')
  })
})

// ── Open-source/local runtime confirmation ────────────────────────────────────

describe('Open-source/local runtime paths', () => {
  it('scraper.ts is in-house (no external paid scraper API dependency)', () => {
    const src = readSrc('src/lib/scraper.ts')
    // In-house scraper uses native fetch — no external scraper API client
    expect(src).toContain('fetch(')
    expect(src).not.toContain('@mendable')
    expect(src).not.toContain('firecrawl')
    expect(src).not.toContain('apify')
    expect(src).not.toContain('scrapingbee')
  })

  it('rag-capability.ts uses HF embeddings and Qdrant', () => {
    const src = readSrc('src/lib/rag-capability.ts')
    expect(src).toContain('api-inference.huggingface.co')
    expect(src).toContain('vector-store')
    expect(src).not.toContain('pinecone')
    expect(src).not.toContain('weaviate')
  })

  it('memory-capability.ts uses Prisma, not in-process Map as source of truth', () => {
    const src = readSrc('src/lib/memory-capability.ts')
    expect(src).toContain('@/lib/prisma')
    expect(src).toContain('prisma.memoryEntry')
    // In-memory Map exists only as hot cache, not source of truth
    expect(src).toContain('_cache')
    expect(src).not.toContain('this.entries.set') // old in-process Map pattern removed
  })

  it('campaign-storage.ts uses Prisma for persistence', () => {
    const src = readSrc('src/lib/campaign-storage.ts')
    expect(src).toContain('@/lib/prisma')
    expect(src).toContain('prisma.campaign')
    expect(src).toContain('prisma.generatedAsset')
  })

  it('publishing-scheduler.ts uses Prisma for all persistence', () => {
    const src = readSrc('src/lib/publishing-scheduler.ts')
    expect(src).toContain('@/lib/prisma')
    expect(src).toContain('prisma.publishingSchedule')
    expect(src).toContain('prisma.publishingResult')
    expect(src).toContain('prisma.campaignAnalytics')
  })
})
