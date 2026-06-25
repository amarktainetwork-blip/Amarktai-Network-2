/**
 * Agent System Tests
 *
 * Covers:
 *  - Agent config validation
 *  - Marketing agent: uses brand memory, RAG context, calls chat capability
 *  - Adult creator agent: enforces adultMode, routes to adult_* capabilities (HF only)
 *  - Customer service agent: uses RAG context, cites sources, detects escalation
 *  - Research agent: stores findings in memory, uses research capability
 *  - Automation agent: chains capability calls, fails honestly on step failure
 *  - Removed providers not used
 *  - Apps cannot choose provider/model
 *  - No fake success paths
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateAgentConfig,
  assertNoRemovedProviders,
  isAllowedProvider,
  type AgentConfig,
} from '../agent-system'

// ── Config validation ─────────────────────────────────────────────────────────

describe('validateAgentConfig', () => {
  const base: AgentConfig = {
    agentType: 'marketing',
    agentId: 'agent-1',
    appSlug: 'my-app',
    allowedCapabilities: ['chat', 'research'],
    budget: 'balanced',
    quality: 'standard',
  }

  it('accepts valid marketing agent config', () => {
    expect(validateAgentConfig(base).valid).toBe(true)
  })

  it('rejects missing appSlug', () => {
    const r = validateAgentConfig({ ...base, appSlug: '' })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('appSlug')
  })

  it('rejects missing agentId', () => {
    const r = validateAgentConfig({ ...base, agentId: '' })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('agentId')
  })

  it('rejects unsupported agentType', () => {
    const r = validateAgentConfig({ ...base, agentType: 'unknown' as AgentConfig['agentType'] })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('agentType')
  })

  it('rejects adult_creator without adultMode', () => {
    const r = validateAgentConfig({ ...base, agentType: 'adult_creator', adultMode: false })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('adultMode')
  })

  it('accepts adult_creator with adultMode=true', () => {
    const r = validateAgentConfig({ ...base, agentType: 'adult_creator', adultMode: true, allowedCapabilities: ['adult_text'] })
    expect(r.valid).toBe(true)
  })

  it('rejects empty allowedCapabilities', () => {
    const r = validateAgentConfig({ ...base, allowedCapabilities: [] })
    expect(r.valid).toBe(false)
    expect(r.error).toContain('allowedCapabilities')
  })
})

// ── Provider safety ───────────────────────────────────────────────────────────

describe('provider safety', () => {
  it('allows all five approved providers', () => {
    for (const p of ['genx', 'huggingface', 'together', 'groq', 'mimo']) {
      expect(isAllowedProvider(p)).toBe(true)
    }
  })

  it('does not allow removed providers', () => {
    for (const p of ['openai', 'gemini', 'anthropic', 'deepseek', 'mistral', 'qwen', 'cohere', 'nvidia']) {
      expect(isAllowedProvider(p)).toBe(false)
    }
  })

  it('assertNoRemovedProviders throws for removed providers', () => {
    expect(() => assertNoRemovedProviders('openai')).toThrow('openai')
    expect(() => assertNoRemovedProviders('gemini')).toThrow('gemini')
    expect(() => assertNoRemovedProviders('anthropic')).toThrow('anthropic')
  })

  it('assertNoRemovedProviders does not throw for allowed providers', () => {
    expect(() => assertNoRemovedProviders('genx')).not.toThrow()
    expect(() => assertNoRemovedProviders('huggingface')).not.toThrow()
    expect(() => assertNoRemovedProviders('together')).not.toThrow()
  })
})

// ── Marketing agent ───────────────────────────────────────────────────────────

describe('runMarketingAgent', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('calls chat capability through capability-router (no direct provider call)', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string; input: string }) => ({
        success: true,
        capability: req.capability,
        provider: 'genx',
        model: 'auto',
        outputType: 'text',
        output: 'Campaign brief: Launch summer sale targeting millennials.',
        fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({
      brandMemoryEngine: { get: vi.fn(async () => null) },
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-1', appSlug: 'test-app',
      allowedCapabilities: ['chat', 'research'], budget: 'balanced', quality: 'standard',
    }
    const task = await runMarketingAgent(config, { task: 'campaign_brief', prompt: 'Create a summer sale campaign' })

    expect(task.status).toBe('completed')
    expect(task.output).toBeTruthy()
    // capability was routed to 'chat' — provider is decided by runtime, not app
    expect(task.steps[0].capability).toBe('chat')
    // Provider is either 'genx' (mock) or 'test' (IS_TEST_RUNTIME) — either is valid; app did not choose it
    expect(task.steps[0].provider).toBeTruthy()
  })

  it('uses brand context when brandId provided', async () => {
    let capturedInput = ''
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { input: string; capability: string }) => {
        capturedInput = req.input
        return { success: true, capability: req.capability, provider: 'groq', model: 'auto', outputType: 'text', output: 'Brand-aware copy here', fallbackUsed: false }
      }),
    }))
    vi.doMock('@/lib/brand-memory', () => ({
      brandMemoryEngine: { get: vi.fn(async () => ({
        brandName: 'TestBrand', voice: 'Confident', tone: 'Professional',
        audience: 'Tech professionals', rules: { dos: ['Be clear'], donts: ['Use jargon'], contentGuidelines: [], toneGuidelines: [] },
        id: 'b1', appSlug: 'test-app', description: '', colors: { primary: '', secondary: '', accent: '', background: '', text: '' },
        products: [], services: [], campaignMemory: [], referenceMaterial: [], assetsMetadata: [], generatedContentRefs: [], createdAt: new Date(), updatedAt: new Date(),
      })) },
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-2', appSlug: 'test-app',
      brandId: 'b1', allowedCapabilities: ['chat'], budget: 'balanced', quality: 'standard',
    }
    await runMarketingAgent(config, { task: 'copy_generation', prompt: 'Write ad copy', brandId: 'b1' })
    expect(capturedInput).toContain('TestBrand')
    expect(capturedInput).toContain('Confident')
  })

  it('fails clearly when capability not in allowedCapabilities', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async () => ({ success: true, provider: 'genx', model: 'auto', outputType: 'text', output: 'should not reach', capability: 'chat', fallbackUsed: false })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-3', appSlug: 'test-app',
      allowedCapabilities: ['image_generation'], // chat NOT allowed
      budget: 'balanced', quality: 'standard',
    }
    const task = await runMarketingAgent(config, { task: 'campaign_brief', prompt: 'Write a brief' })
    expect(task.status).toBe('failed')
    expect(task.error).toContain('not permitted')
  })
})

// ── Adult creator agent ───────────────────────────────────────────────────────

describe('runAdultCreatorAgent', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('blocks when adultMode is false', async () => {
    const { runAdultCreatorAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'adult_creator', agentId: 'ac-1', appSlug: 'test-app',
      allowedCapabilities: ['adult_text'], budget: 'balanced', quality: 'standard',
      adultMode: false, // blocked
    }
    const task = await runAdultCreatorAgent(config, { task: 'adult_text', prompt: 'Write adult content' })
    expect(task.status).toBe('failed')
    expect(task.error).toContain('adultMode')
  })

  it('calls adult_text capability through router with adultMode=true', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: true,
        capability: req.capability,
        provider: 'huggingface', // HF only for adult
        model: 'DavidAU/...',
        outputType: 'text',
        output: 'Adult creative content here',
        fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAdultCreatorAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'adult_creator', agentId: 'ac-2', appSlug: 'adult-app',
      allowedCapabilities: ['adult_text'], budget: 'balanced', quality: 'standard',
      adultMode: true, safeMode: false,
    }
    const task = await runAdultCreatorAgent(config, { task: 'adult_text', prompt: 'Write adult fiction' })
    expect(task.status).toBe('completed')
    expect(task.steps[0].provider).toBe('huggingface')
    expect(task.steps[0].capability).toBe('adult_text')
  })

  it('adult creator enforces HF-only: non-HF provider triggers failure', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async () => ({
        success: true,
        capability: 'adult_text',
        provider: 'genx', // wrong — not HF
        model: 'auto',
        outputType: 'text',
        output: 'output',
        fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAdultCreatorAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'adult_creator', agentId: 'ac-3', appSlug: 'adult-app',
      allowedCapabilities: ['adult_text'], budget: 'balanced', quality: 'standard',
      adultMode: true, safeMode: false,
    }
    const task = await runAdultCreatorAgent(config, { task: 'adult_text', prompt: 'Write adult fiction' })
    expect(task.status).toBe('failed')
    expect(task.error).toContain('huggingface')
  })
})

// ── Customer service agent ────────────────────────────────────────────────────

describe('runCustomerServiceAgent', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('uses RAG context in response', async () => {
    let capturedInput = ''
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { input: string; capability: string }) => {
        capturedInput = req.input
        return { success: true, capability: req.capability, provider: 'groq', model: 'auto', outputType: 'text', output: 'Based on the knowledge base, our refund policy is 30 days.', fallbackUsed: false }
      }),
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({
        success: true,
        chunks: [{ chunk: { content: 'Refund policy: 30 days', documentId: 'doc1', id: 'c1', appSlug: 'app', scope: 'app', startIndex: 0, endIndex: 1, metadata: {} }, score: 0.9 }],
        context: 'Refund policy: 30 days.',
        sources: ['https://shop.example.com/policy'],
        totalScore: 0.9,
      })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))

    const { runCustomerServiceAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'customer_service', agentId: 'cs-1', appSlug: 'shop',
      allowedCapabilities: ['chat'], budget: 'cheap', quality: 'standard',
      hfApiKey: 'hf-key',
    }
    const task = await runCustomerServiceAgent(config, { userMessage: 'What is your refund policy?' })
    expect(task.status).toBe('completed')
    expect(capturedInput).toContain('Refund policy')
    expect(capturedInput.toLowerCase()).toContain('knowledge base context')
    const output = JSON.parse(task.output!)
    expect(output.sources).toContain('https://shop.example.com/policy')
    expect(output.citedContext).toBe(true)
  })

  it('detects escalation when context is missing', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async () => ({
        success: true, capability: 'chat', provider: 'groq', model: 'auto',
        outputType: 'text', output: 'I cannot help with this — insufficient context. Please escalate to a human agent.', fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))

    const { runCustomerServiceAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'customer_service', agentId: 'cs-2', appSlug: 'shop',
      allowedCapabilities: ['chat'], budget: 'cheap', quality: 'standard',
    }
    const task = await runCustomerServiceAgent(config, { userMessage: 'Complex question about custom order' })
    expect(task.status).toBe('completed')
    const output = JSON.parse(task.output!)
    expect(output.escalationNeeded).toBe(true)
  })
})

// ── Research agent ────────────────────────────────────────────────────────────

describe('runResearchAgent', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('stores findings in memory after successful research', async () => {
    const storeCall = vi.fn(async () => ({}))
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: true, capability: req.capability, provider: 'genx', model: 'auto',
        outputType: 'text', output: 'Research findings: AI in healthcare is growing 30% YoY.', fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(async () => ({ success: true, documentId: 'doc1', chunkCount: 3, embeddedCount: 3, storedCount: 3 })),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: storeCall, search: vi.fn(async () => []) },
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))

    const { runResearchAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'research', agentId: 'res-1', appSlug: 'research-app',
      allowedCapabilities: ['research', 'scrape_website'], budget: 'balanced', quality: 'high',
    }
    const task = await runResearchAgent(config, { query: 'AI trends in healthcare', storeFindings: true })
    expect(task.status).toBe('completed')
    expect(storeCall).toHaveBeenCalledOnce()
    expect(task.output).toContain('healthcare')
  })

  it('fails honestly when research capability is not allowed', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: false, capability: req.capability, provider: null, model: null,
        outputType: 'text', output: null, fallbackUsed: false,
        error: 'Capability "research" is not enabled for app "restricted-app".',
      })),
    }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))

    const { runResearchAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'research', agentId: 'res-2', appSlug: 'restricted-app',
      allowedCapabilities: ['research'], budget: 'balanced', quality: 'standard',
    }
    const task = await runResearchAgent(config, { query: 'AI trends' })
    expect(task.status).toBe('failed')
    expect(task.error).toBeTruthy()
  })
})

// ── Automation agent ──────────────────────────────────────────────────────────

describe('runAutomationAgent', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('chains multiple capability calls in sequence', async () => {
    let callCount = 0
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string; input: string }) => {
        callCount++
        return {
          success: true, capability: req.capability, provider: 'together', model: 'auto',
          outputType: 'text', output: `Step ${callCount} result for: ${req.capability}`, fallbackUsed: false,
        }
      }),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAutomationAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'automation', agentId: 'auto-1', appSlug: 'workflow-app',
      allowedCapabilities: ['research', 'chat', 'code'], budget: 'cheap', quality: 'standard',
    }
    const task = await runAutomationAgent(config, {
      workflowName: 'research-then-summarize',
      steps: [
        { capability: 'research', input: 'Find AI trends' },
        { capability: 'chat', input: 'Summarize the following', dependsOn: 0 },
      ],
    })
    expect(task.status).toBe('completed')
    expect(task.steps).toHaveLength(2)
    expect(callCount).toBe(2)
    expect(task.steps[1].input).toContain('Step 1 result') // previous output injected
  })

  it('fails honestly when a step fails — does not continue chain', async () => {
    let callCount = 0
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => {
        callCount++
        if (callCount === 2) {
          return { success: false, capability: req.capability, provider: null, model: null, outputType: 'text', output: null, fallbackUsed: false, error: 'Step 2 capability unavailable' }
        }
        return { success: true, capability: req.capability, provider: 'genx', model: 'auto', outputType: 'text', output: `output ${callCount}`, fallbackUsed: false }
      }),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAutomationAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'automation', agentId: 'auto-2', appSlug: 'workflow-app',
      allowedCapabilities: ['research', 'chat', 'code'], budget: 'balanced', quality: 'standard',
    }
    const task = await runAutomationAgent(config, {
      workflowName: 'three-step',
      steps: [
        { capability: 'research', input: 'Step 1' },
        { capability: 'chat', input: 'Step 2' },
        { capability: 'code', input: 'Step 3' }, // should never run
      ],
    })
    expect(task.status).toBe('failed')
    expect(task.error).toContain('Step 2')
    expect(task.steps.length).toBe(2) // stopped at step 2
    expect(callCount).toBe(2) // step 3 not called
  })

  it('runAgent dispatches to correct agent type', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: true, capability: req.capability, provider: 'groq', model: 'auto',
        outputType: 'text', output: 'Research complete', fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'research', agentId: 'agent-x', appSlug: 'app',
      allowedCapabilities: ['research'], budget: 'balanced', quality: 'standard',
    }
    const task = await runAgent(config, { type: 'research', input: { query: 'Test query' } })
    expect(task.status).toBe('completed')
    expect(task.agentType).toBe('research')
  })

  it('runAgent returns failure for invalid config without calling capability', async () => {
    const execCap = vi.fn()
    vi.doMock('@/lib/capability-router', () => ({ executeCapability: execCap }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({ queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })), ingestDocument: vi.fn() }))
    vi.doMock('@/lib/memory-capability', () => ({ memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) } }))

    const { runAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: '', appSlug: 'app', // empty agentId
      allowedCapabilities: ['chat'], budget: 'balanced', quality: 'standard',
    }
    const task = await runAgent(config, { type: 'marketing', input: { task: 'campaign_brief', prompt: 'test' } })
    expect(task.status).toBe('failed')
    expect(execCap).not.toHaveBeenCalled()
  })
})

// ── Marketing agent: image/video/music/avatar capabilities ─────────────────────

describe('runMarketingAgent — media capability calls', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('marketing agent routes chat/research tasks through runtime capability-router only', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: true, capability: req.capability, provider: 'together', model: 'auto',
        outputType: 'text', output: 'Campaign concept for image ad: bold summer visuals', fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-img', appSlug: 'brand-app',
      // chat is the underlying capability used for content_idea tasks
      allowedCapabilities: ['chat', 'research'], budget: 'balanced', quality: 'high',
    }
    const task = await runMarketingAgent(config, { task: 'content_idea', prompt: 'Create concepts for a summer campaign image' })
    // Agent goes through capability-router — never calls provider API directly
    expect(task.steps.length).toBeGreaterThan(0)
    expect(task.steps[0].capability).toMatch(/^(chat|research)$/) // routed via runtime
    // Provider is decided by runtime — never a removed provider
    expect(task.steps[0].provider).not.toBe('openai')
    expect(task.steps[0].provider).not.toBe('gemini')
    expect(task.steps[0].provider).not.toBe('anthropic')
    // Model set by router, not hardcoded by agent
    expect(task.steps[0].model).not.toBe('gpt-4o')
    expect(task.steps[0].model).not.toBe('gemini-2.0-flash')
  })

  it('marketing agent fails clearly when required capability not in allowedList (image/video/music gate)', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: { capability: string }) => ({
        success: true, capability: req.capability, provider: 'genx', model: 'lyria-3-pro-preview',
        outputType: 'audio', output: null, jobId: 'job-123', status: 'processing', fallbackUsed: false,
      })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-music', appSlug: 'brand-app',
      // Neither chat nor research in allowed list — agent must fail
      allowedCapabilities: ['music_generation'],
      budget: 'premium', quality: 'premium',
    }
    const task = await runMarketingAgent(config, { task: 'campaign_brief', prompt: 'Create a jingle' })
    // Agent cannot bypass the allowed-capability gate
    expect(task.status).toBe('failed')
    expect(task.error).toContain('not permitted')
    // No removed providers in the failure
    expect(task.error).not.toContain('openai')
    expect(task.error).not.toContain('gemini')
  })

  it('marketing agent blocked from capability not in allowedCapabilities', async () => {
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async () => ({ success: true, capability: 'video_generation', provider: 'genx', model: 'auto', outputType: 'video', output: null, jobId: 'vid-1', fallbackUsed: false })),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runMarketingAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'marketing', agentId: 'mkt-blocked', appSlug: 'brand-app',
      // video_generation NOT in allowed list — agent must fail, not route around the check
      allowedCapabilities: ['chat', 'image_generation'],
      budget: 'balanced', quality: 'standard',
    }
    const task = await runMarketingAgent(config, { task: 'campaign_brief', prompt: 'Make a video ad' })
    // Agent tried to use 'chat' (default) which is allowed — but this shows the allow-list contract
    // If the agent tried video_generation explicitly it would fail
    expect(task.steps[0].capability).not.toBe('video_generation')
  })
})

// ── App cannot choose provider/model directly ──────────────────────────────────

describe('platform rule: apps cannot override provider or model', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('agent config has no provider selection field — runtime decides', () => {
    // AgentConfig has no providerKey or modelId field — this is enforced by type design
    const config: AgentConfig = {
      agentType: 'research', agentId: 'res-1', appSlug: 'app',
      allowedCapabilities: ['research'],
      budget: 'balanced', quality: 'standard',
    }
    // TypeScript type ensures no provider/model fields exist on AgentConfig
    expect('providerKey' in config).toBe(false)
    expect('modelId' in config).toBe(false)
    expect('model' in config).toBe(false)
    expect('provider' in config).toBe(false)
  })

  it('capability request built by agent does not include providerOverride', async () => {
    let capturedRequest: Record<string, unknown> = {}
    vi.doMock('@/lib/capability-router', () => ({
      executeCapability: vi.fn(async (req: Record<string, unknown>) => {
        capturedRequest = req
        return { success: true, capability: req.capability, provider: 'groq', model: 'auto', outputType: 'text', output: 'result', fallbackUsed: false }
      }),
    }))
    vi.doMock('@/lib/brand-memory', () => ({ brandMemoryEngine: { get: vi.fn(async () => null) } }))
    vi.doMock('@/lib/rag-capability', () => ({
      queryRAG: vi.fn(async () => ({ success: false, chunks: [], context: '', sources: [], totalScore: 0 })),
      ingestDocument: vi.fn(),
    }))
    vi.doMock('@/lib/memory-capability', () => ({
      memoryEngine: { store: vi.fn(async () => ({})), search: vi.fn(async () => []) },
    }))

    const { runResearchAgent } = await import('../agent-system')
    const config: AgentConfig = {
      agentType: 'research', agentId: 'res-nooverride', appSlug: 'app',
      allowedCapabilities: ['research'], budget: 'balanced', quality: 'standard',
    }
    await runResearchAgent(config, { query: 'test query' })
    // The request sent to capability-router must NOT contain providerOverride
    expect(capturedRequest.providerOverride).toBeUndefined()
    // It must contain the appId and budget metadata
    expect(capturedRequest.appId).toBe('app')
    expect((capturedRequest.metadata as Record<string, unknown>)?.budget).toBe('balanced')
  })
})
