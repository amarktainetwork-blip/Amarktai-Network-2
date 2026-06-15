import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('PR118 provider runtime and dashboard recovery', () => {
  it('uses the canonical discovery evidence ladder', () => {
    const discovery = source('src/lib/providers/model-discovery.ts')
    const scoring = source('src/lib/providers/provider-scoring.ts')
    expect(discovery).toContain("capabilityEvidence: 'provider_contract'")
    expect(discovery).toContain('model.capabilities.includes(capability)')
    expect(scoring).toContain("model.capabilityEvidence === 'model_metadata'")
  })

  it('does not preselect dashboard provider or model routes', () => {
    const planner = source('src/lib/execution/task-planner.ts')
    const studio = source('src/app/api/admin/studio/execute/route.ts')
    const command = source('src/lib/command-center.ts')
    expect(planner).not.toContain('routeLiveModel')
    expect(studio).not.toContain('selectCapabilityRoutePlan')
    expect(studio).not.toContain('providerOverride: selectedProvider')
    expect(command).not.toContain('providerOverride: input.selectedProvider')
    expect(command).not.toContain('modelOverride: input.selectedModel')
  })

  it('records the provider and model actually selected by canonical execution', () => {
    const runner = source('src/lib/execution/execution-runner.ts')
    expect(runner).toContain('recordCanonicalRoute(executionId, response)')
    expect(runner).toContain('Canonical discovery and scoring selected')
  })

  it('keeps assistant chat and streaming inside the Brain', () => {
    const chat = source('src/app/api/admin/amarktai-assistant/chat/route.ts')
    const stream = source('src/app/api/admin/amarktai-assistant/stream/route.ts')
    expect(chat).toContain('executeCapability({')
    expect(stream).toContain('executeCapability({')
    expect(chat).not.toContain('routeLiveModel')
    expect(stream).not.toContain('streamGenXChat')
    expect(stream).toContain('buffered_canonical_execution')
  })

  it('wires current provider-native runtime endpoints without model defaults', () => {
    const adapters = source('src/lib/ai-capability-adapters.ts')
    expect(adapters).toContain("/hf-inference/models/${model}")
    expect(adapters).toContain("}/videos")
    expect(adapters).toContain("}/audio/transcriptions")
    expect(adapters).toContain("'rerank' : 'embeddings'")
    expect(source('src/app/api/admin/settings/test-qwen/route.ts')).toContain('chatModel.id')
    expect(source('src/app/api/admin/settings/test-genx/route.ts')).toContain('chatModel.id')
    expect(source('src/app/api/admin/settings/test-provider/route.ts')).toContain('chatModel.id')
  })

  it('projects provider diagnostics from canonical runtime discovery', () => {
    const diagnostics = source('src/app/api/admin/system/provider-diagnostics/route.ts')
    expect(diagnostics).toContain('getCanonicalProviderRuntimeTruth')
    expect(diagnostics).not.toContain('UNIVERSAL_MODEL_ROUTES')
    expect(diagnostics).not.toContain('AI_CAPABILITY_TAXONOMY')
  })

  it('does not present wiring as live provider readiness', () => {
    const capabilities = source('src/app/admin/dashboard/capabilities/page.tsx')
    expect(capabilities).toContain("working: { label: 'Wired'")
    expect(capabilities).toContain('Live availability depends on provider discovery')
  })
})
