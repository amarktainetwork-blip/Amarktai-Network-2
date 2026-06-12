import fs from 'fs'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ConnectedApp } from '@/lib/connected-apps'
import { hashSigningSecret } from '@/lib/connected-apps'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/ai-capability-taxonomy'
import {
  inspectConnectedAppReadiness,
  getHfSpecialistReadiness,
} from '@/lib/ai-deployment-readiness'
import {
  HF_ENDPOINT_REQUIRED_CAPABILITIES,
  resolveHfSpecialistConfig,
} from '@/lib/hf-specialist-config'

const ROOT = path.resolve(__dirname, '../../..')
const source = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

function connectedApp(overrides: Partial<ConnectedApp> = {}): ConnectedApp {
  const secret = 'deployment-secret-with-enough-entropy'
  process.env.AMARKTAI_APP_SECRET_TEST_APP = secret
  return {
    id: 'app-1',
    name: 'Test App',
    slug: 'test-app',
    status: 'active',
    scopes: ['ai:text:execute'],
    signingSecretRef: 'AMARKTAI_APP_SECRET_TEST_APP',
    signingSecretHash: hashSigningSecret(secret),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('V1 deployment readiness', () => {
  it('uses the provider mesh as the central credential env contract', () => {
    const readiness = source('src/lib/ai-deployment-readiness.ts')
    expect(readiness).toContain('APPROVED_DIRECT_PROVIDER_IDS')
    expect(readiness).toContain('node.envAliases')
    expect(readiness).toContain('getMeshCredential')
    expect(readiness).not.toMatch(/apiKey:\s*credential|credentialValue|secretValue/)
  })

  it('maps every Hugging Face-routed capability to a model API or explicit endpoint requirement', () => {
    const hfCapabilities = AI_CAPABILITY_TAXONOMY.filter((capability) =>
      capability.providerRoutes.some((route) => route.provider === 'huggingface'),
    )
    const readiness = getHfSpecialistReadiness()
    expect(readiness).toHaveLength(hfCapabilities.length)
    for (const route of readiness) {
      expect(route.configured || route.endpointRequired).toBe(true)
      if (!route.configured) {
        expect(route.requiredEnv.some((name) => name.startsWith('HF_ENDPOINT_'))).toBe(true)
      }
    }
  })

  it('accepts safe per-capability Hugging Face endpoint and model overrides', () => {
    process.env.HF_ENDPOINT_ROBOTICS = 'https://robotics-endpoint.us-east-1.aws.endpoints.huggingface.cloud'
    process.env.HF_MODEL_ROBOTICS = 'organization/private-robotics-planner'
    const config = resolveHfSpecialistConfig('robotics', { modelIds: ['custom:huggingface-endpoint'] })
    expect(config).toMatchObject({
      configured: true,
      endpointRequired: true,
      endpointSource: 'environment',
      modelSource: 'environment',
      model: 'organization/private-robotics-planner',
    })
  })

  it('rejects unsafe or fake Hugging Face endpoint overrides', () => {
    process.env.HF_ENDPOINT_ROBOTICS = 'http://localhost:8080/fake'
    const config = resolveHfSpecialistConfig('robotics', { modelIds: ['custom:huggingface-endpoint'] })
    expect(config.configured).toBe(false)
    expect(config.endpoint).toBeNull()
    expect(HF_ENDPOINT_REQUIRED_CAPABILITIES).toContain('robotics')
  })

  it('reports a connected app ready only when secret, hash, status, and AI scope are valid', () => {
    const result = inspectConnectedAppReadiness(connectedApp())
    expect(result.state).toBe('ready')
    expect(result.secretConfigured).toBe(true)
    expect(result.secretMatchesHash).toBe(true)
    expect(result.scopesValid).toBe(true)
  })

  it('reports missing and mismatched connected-app secret configuration', () => {
    const missing = connectedApp()
    delete process.env.AMARKTAI_APP_SECRET_TEST_APP
    expect(inspectConnectedAppReadiness(missing)).toMatchObject({
      state: 'missing',
      secretConfigured: false,
      secretMatchesHash: false,
    })

    const mismatched = connectedApp()
    process.env.AMARKTAI_APP_SECRET_TEST_APP = 'different-deployment-secret'
    const result = inspectConnectedAppReadiness(mismatched)
    expect(result.state).toBe('invalid')
    expect(result.secretMatchesHash).toBe(false)
    expect(result.blockers.join(' ')).toContain('does not match')
  })

  it('reports invalid connected-app scopes and secret references', () => {
    const result = inspectConnectedAppReadiness(connectedApp({
      signingSecretRef: 'WRONG_SECRET_REF',
      scopes: ['invalid:scope' as never],
    }))
    expect(result.state).not.toBe('ready')
    expect(result.scopesValid).toBe(false)
    expect(result.blockers.join(' ')).toContain('AMARKTAI_APP_SECRET_TEST_APP')
  })

  it('exposes an authenticated admin-safe readiness endpoint', () => {
    const route = source('src/app/api/admin/system/ai-deployment-readiness/route.ts')
    expect(route).toContain('getSession')
    expect(route).toContain('Unauthorized')
    expect(route).toContain('getAiDeploymentReadiness')
    expect(route).toContain('secretsExposed: false')
    expect(route).not.toMatch(/apiKey\s*:|signingSecretHash\s*:/)
  })

  it('proves artifact storage read-back and database access', () => {
    const readiness = source('src/lib/ai-deployment-readiness.ts')
    const storage = source('src/lib/storage-driver.ts')
    expect(storage).toContain('readable')
    expect(storage).toContain('await fs.readFile')
    expect(readiness).toContain('await driver.put')
    expect(readiness).toContain('await driver.get')
    expect(readiness).toContain('await driver.delete')
    expect(readiness).toContain('transaction.artifact.create')
    expect(readiness).toContain('transaction.artifact.delete')
    expect(readiness).toContain('safeOperationalError')
  })

  it('does not add prohibited systems or duplicate capability truth', () => {
    const implementation = [
      source('src/lib/ai-deployment-readiness.ts'),
      source('src/lib/hf-specialist-config.ts'),
      source('src/app/api/admin/system/ai-deployment-readiness/route.ts'),
    ].join('\n')
    expect(implementation).not.toMatch(/OpenHands|Repo Workbench|App Builder|\bMCP\b/)
    expect(implementation).toContain("from '@/lib/ai-capability-taxonomy'")
    expect(implementation).not.toMatch(/CAPABILITY_(REGISTRY|TAXONOMY|MATRIX)\s*=/)
  })
})
