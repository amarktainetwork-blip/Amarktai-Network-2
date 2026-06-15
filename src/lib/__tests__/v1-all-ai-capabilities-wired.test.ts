import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
} from '@/lib/ai-capability-taxonomy'
import {
  PROVIDER_CAPABILITY_ADAPTERS,
  getProviderCapabilityAdapter,
} from '@/lib/ai-capability-adapters'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'
import { CONNECTED_APP_SCOPES } from '@/lib/connected-apps'

const ROOT = path.resolve(__dirname, '../../..')
const source = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')

describe('V1 AI capability routing truth', () => {
  it('routes only adapter-backed capabilities through approved executable adapters', () => {
    expect(AI_CAPABILITY_TAXONOMY).toHaveLength(62)
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      for (const route of capability.providerRoutes) {
        expect(APPROVED_DIRECT_PROVIDER_IDS).toContain(route.provider)
        if (route.executable) {
          expect(route.route).toBeTruthy()
          expect(route.adapterImplemented).toBe(true)
          expect(getProviderCapabilityAdapter(route.provider)?.id).toBe(route.adapter)
        } else {
          expect(route.adapterImplemented).toBe(false)
        }
      }
      if (capability.readiness === 'ready' || capability.readiness === 'ready_with_fallback') {
        expect(capability.adapterImplemented).toBe(true)
        expect(capability.providerRoutes.some((route) => route.executable)).toBe(true)
      } else if (capability.readiness === 'needs_input') {
        expect(capability.requiredSourceInput).toBeTruthy()
      } else {
        expect(capability.blocker?.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every app-facing capability a registered connected-app scope', () => {
    for (const capability of AI_CAPABILITY_TAXONOMY) {
      expect(CONNECTED_APP_AI_SCOPES).toContain(capability.requiredScope)
      expect(CONNECTED_APP_SCOPES).toContain(capability.requiredScope)
    }
  })

  it('registers one adapter for each and only each approved provider', () => {
    expect(PROVIDER_CAPABILITY_ADAPTERS.map((adapter) => adapter.provider).sort())
      .toEqual([...APPROVED_DIRECT_PROVIDER_IDS].sort())
    expect(new Set(PROVIDER_CAPABILITY_ADAPTERS.map((adapter) => adapter.id)).size)
      .toBe(PROVIDER_CAPABILITY_ADAPTERS.length)
  })

  it('uses raw-body HMAC and capability scope checks before execution', () => {
    const engine = source('src/lib/connected-app-capability-engine.ts')
    const executeRoute = source('src/app/api/connected-apps/capabilities/execute/route.ts')
    expect(executeRoute).toContain('await request.text()')
    expect(engine).toContain('verifyWebhookSignature')
    expect(engine).toContain('app.status !==')
    expect(engine).toContain('app.scopes.includes(capability.requiredScope)')
    expect(engine).toContain('Missing required scope')
  })

  it('routes every category and persists real long-running jobs', () => {
    const categories = new Set(AI_CAPABILITY_TAXONOMY.map((capability) => capability.group))
    expect(categories).toEqual(new Set([
      'text',
      'multimodal',
      'computer_vision',
      'video',
      'audio',
      'music',
      'avatar_voice',
      'tabular',
      'agents_or_planning',
      'experimental',
    ]))
    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(AI_CAPABILITY_TAXONOMY.some((capability) => capability.longRunning)).toBe(true)
    expect(engine).toContain('LOCAL_STORE_FILES.connectedAppCapabilityJobs')
    expect(engine).toContain("result.status === 'processing'")
    expect(engine).toContain('executeCapability')
    expect(source('src/app/api/connected-apps/capabilities/jobs/[jobId]/route.ts'))
      .toContain('pollConnectedAppCapabilityJob')
  })

  it('creates artifacts only from completed real provider output', () => {
    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(engine).toContain("result.status !== 'completed'")
    expect(engine).toContain('await createArtifact')
    expect(source('src/lib/artifact-store.ts')).toContain('Completed artifacts require persisted content')
    expect(engine).toContain("status: 'failed'")
    expect(engine).not.toMatch(/fake|placeholder artifact|mock result/i)
  })

  it('does not let connected apps select providers, models, or endpoints', () => {
    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(engine).toContain('request.provider || request.model || request.endpointUrl')
    expect(engine).toContain('selection are owned by AmarktAI')
    expect(engine).not.toContain('selectCapabilityRoutePlan')
  })

  it('supports the required references, app context, and safety constraints', () => {
    const adapters = source('src/lib/ai-capability-adapters.ts')
    const engine = source('src/lib/connected-app-capability-engine.ts')
    for (const kind of ['image', 'audio', 'video', 'document', 'tabular', 'brand_kit', 'app_context']) {
      expect(adapters).toContain(`'${kind}'`)
    }
    expect(engine).toContain('appIntelligenceProfile.findUnique')
    expect(engine).toContain('loadAppSafetyConfigFromDB')
    expect(engine).toContain('consentConfirmed')
    expect(engine).toContain('physical actuation is blocked')
  })

  it('exposes unwired and unavailable truth without creating duplicate registries', () => {
    expect(AI_CAPABILITY_TAXONOMY.some(
      (capability) => capability.status === 'provider_available_not_wired',
    )).toBe(true)
    expect(AI_CAPABILITY_TAXONOMY.some(
      (capability) => capability.status === 'unavailable',
    )).toBe(true)
    const engine = source('src/lib/connected-app-capability-engine.ts')
    expect(engine).toContain("from '@/lib/ai-capability-taxonomy'")
    expect(engine).not.toMatch(/CAPABILITY_(REGISTRY|MATRIX)\s*=/)
    expect(source('src/lib/ai-capability-taxonomy.ts'))
      .toContain("from '@/lib/brain/v1-capability-matrix'")
  })

  it('keeps prohibited systems and providers out of the execution implementation', () => {
    const implementation = [
      source('src/lib/ai-capability-adapters.ts'),
      source('src/lib/connected-app-capability-engine.ts'),
      source('src/app/api/connected-apps/capabilities/execute/route.ts'),
    ].join('\n')
    expect(implementation).not.toMatch(/OpenHands|Repo Workbench|App Builder|\bMCP\b/)
    expect(implementation).not.toMatch(/provider:\s*['"](openai|anthropic|gemini|deepseek|minimax|replicate)['"]/i)
  })
})
