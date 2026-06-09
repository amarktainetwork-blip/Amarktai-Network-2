# Phase 5B — Live Model Catalog Source of Truth

## Decision

AmarktAI must use all connected provider capabilities, but it must not fake model availability.

The dashboard currently proves provider/service connectivity.
The model registry must prove model/capability coverage.
The execution routes must prove real artifact/job creation.

These are separate truths.

## Approved connected providers/services

Primary AI providers:
- GenX
- Hugging Face
- Qwen / DashScope / Wan
- Xiaomi MiMo
- Groq
- Together AI

Platform services:
- GitHub
- Redis
- Qdrant
- Local Crawler
- Playwright
- Scrapy
- Trafilatura
- ffmpeg
- Storage
- SMTP

## Provider catalog rules

### GenX

Use GenX as a dynamic managed model gateway.

Required:
- Add/keep a GenX model catalog sync route/client.
- Pull `/api/v1/models`.
- Support `?category=text|image|video|voice|audio`.
- Cache the result for dashboard/catalog usage.
- Streaming text uses `/v1/chat/completions` or `/v1/messages`.
- Image/video/audio/voice uses async `/api/v1/generate` and `/api/v1/jobs/:id`.

Do not:
- Manually hardcode 58 GenX models as static truth.
- Pretend GenX-routed models are direct OpenAI/Gemini providers.

### Hugging Face

Use Hugging Face as the open-source/open-model fallback layer.

Required:
- Keep provider key as `huggingface`.
- Use Hugging Face Inference Providers / task clients for non-chat tasks.
- Use HF router OpenAI-compatible endpoint for chat only.
- Add task-aware model rows for:
  - text/chat
  - embeddings
  - image
  - video
  - speech-to-text
  - text-to-speech
  - music/audio where a route exists
- Curated rows are allowed when backed by known HF model IDs and honest routes.

Do not:
- Treat `task:*` aliases as real model IDs unless they are explicitly adapter aliases.
- Mark every HF model on the Hub routable. Only connected route-compatible rows count.

### Qwen / DashScope / Wan

Use provider key `qwen`.

Required:
- Qwen text/reasoning/coding/vision models.
- Wan/Qwen image generation.
- Wan text-to-video and image-to-video.
- Qwen speech synthesis/recognition where configured.

Do not:
- Rename runtime provider to Alibaba.
- Mix Qwen/Wan with fake Gemini/OpenAI direct providers.

### Xiaomi MiMo

Use provider key `mimo`.

Required:
- Keep current MiMo rows.
- Use live API/model discovery where available.
- Add MiMo TTS/ASR/video/audio only after live API proves exact model IDs and routes.

Do not:
- Invent model IDs from marketing text.

### Groq

Use provider key `groq`.

Required:
- Live model discovery for text/coding/vision/STT/TTS.
- Whisper STT rows must be correct:
  - `whisper-large-v3`
  - `whisper-large-v3-turbo`
- Add `distil-whisper-large-v3-en` only if live models endpoint confirms it.
- Add TTS rows only if live models endpoint confirms the model IDs.

Do not:
- Keep old tests forcing `playai-tts` if the account/API does not expose it.

### Together AI

Use provider key `together`.

Required:
- Serverless chat models.
- Images endpoint models, especially FLUX/Qwen/Imagen/Wan if available.
- Audio endpoint models where supported.
- Video rows only where endpoint/API supports execution.

Do not:
- Use Together as generic fake voice/music provider.

## Stale test policy

Tests must be changed or deleted if they assert direct providers that are not approved Settings providers.

Stale expectations include:
- direct OpenAI provider required
- direct Gemini provider required
- direct NVIDIA provider required
- direct Suno provider required
- direct Udio provider required
- exact old dashboard section names that conflict with final AmarktAI OS navigation

Keep or rewrite tests that assert:
- provider connectivity truth
- model catalog truth
- capability routing truth
- execution creates artifact/job/output
- dashboard does not fake green
- App Builder exists and works
- Repo Workbench can import/audit/patch/test/PR/deploy
- Media Studio can generate or truthfully block image/video/voice/music
- Connected Apps can register, report health, send events, and receive commands

## Immediate implementation order

1. Commit this source-of-truth contract.
2. Add provider catalog sync architecture.
3. Convert model-registry adapter to read:
   - static curated fallbacks
   - dynamic provider catalog cache
   - provider capability governance
4. Rewrite/delete stale tests.
5. Run focused model/capability tests.
6. Then move to dashboard/frontend rebuild.

## Stale direct-provider test expectations found

src/lib/__tests__/core-intelligence.test.ts:138:      const caps = classifyCapabilities('stt', 'transcribe this audio')
src/lib/__tests__/core-intelligence.test.ts:603:          model: 'gpt-4o-mini',
src/lib/__tests__/core-intelligence.test.ts:619:        providerKey: 'openai',
src/lib/__tests__/core-intelligence.test.ts:620:        model: 'gpt-4o-mini',
src/lib/__tests__/core-intelligence.test.ts:697:        evidence: { sampleSize: 50, metric: 'success_rate', before: null, after: 0.95, improvement: null, model: 'gpt-4o-mini' },
src/lib/__tests__/adult-media-routing.test.ts:27:  it('routes adult_voice through audio/TTS executors', () => {
src/lib/__tests__/adult-media-routing.test.ts:30:    expect(route?.artifactType).toBe('audio')
src/lib/__tests__/adult-media-routing.test.ts:60:      'audio',
src/lib/__tests__/final-dashboard-ux.test.ts:29:    expect(nav).toContain("label: 'Media Studio / Playground'")
src/lib/__tests__/infrastructure-items.test.ts:85:      expect(getVoiceOverride('joy', 'openai')).toBe('nova')
src/lib/__tests__/infrastructure-items.test.ts:93:      expect(getVoiceOverride('anger', 'gemini')).toBe('Charon')
src/lib/__tests__/infrastructure-items.test.ts:102:      const providers: TTSProvider[] = ['openai', 'groq', 'gemini']
src/lib/__tests__/infrastructure-items.test.ts:133:      const config = buildAffectiveVoiceConfig('Hello!', analysis, 'openai')
src/lib/__tests__/infrastructure-items.test.ts:145:      const config = buildAffectiveVoiceConfig('I feel down', analysis, 'gemini')
src/lib/__tests__/infrastructure-items.test.ts:154:      const config = buildAffectiveVoiceConfig('Normal text', analysis, 'openai')
src/lib/__tests__/infrastructure-items.test.ts:200:    expect(server).toContain('openai.com/v1/realtime')
src/lib/__tests__/genx-client.test.ts:60:      type: 'audio',
src/lib/__tests__/genx-client.test.ts:73:        type: 'audio',
src/lib/__tests__/platform-systems.test.ts:3: * Semantic Cache, Prompt Studio, Guardrails, Smart Router, Workflow Engine,
src/lib/__tests__/platform-systems.test.ts:600:// ── Prompt Studio ────────────────────────────────────────────────────────────
src/lib/__tests__/platform-systems.test.ts:611:} from '../prompt-studio'
src/lib/__tests__/platform-systems.test.ts:613:describe('Prompt Studio', () => {
src/lib/__tests__/platform-systems.test.ts:781:        modelId: 'gpt-4o-mini', provider: 'openai', taskType: 'chat',
src/lib/__tests__/platform-systems.test.ts:793:      recordPerformance({ modelId: 'gpt-4o-mini', provider: 'openai', taskType: 'code', success: true, latencyMs: 200, confidence: 0.9, costEstimate: 0.001, timestamp: Date.now() })
src/lib/__tests__/platform-systems.test.ts:797:    const candidates = getModelRegistry().filter(m => m.model_id === 'gpt-4o-mini' || m.model_id === 'llama-3.3-70b-versatile')
src/lib/__tests__/platform-systems.test.ts:906:    expect(MODALITIES).toContain('audio')
src/lib/__tests__/platform-systems.test.ts:920:        { name: 'S1', inputModality: 'text', outputModality: 'text', provider: 'openai', model: 'gpt-4o-mini', config: {} },
src/lib/__tests__/platform-systems.test.ts:1113:    const childId = startSpan(traceId, spanId, 'provider.call', { provider: 'openai', model: 'gpt-4o-mini' })
src/lib/__tests__/platform-systems.test.ts:1150:    incrementCounter('requests.total', { provider: 'openai' })
src/lib/__tests__/platform-systems.test.ts:1179:      details: { model: 'gpt-4o-mini', latencyMs: 200 },
src/lib/__tests__/platform-systems.test.ts:1187:    recordAuditEntry({ actor: { type: 'system', id: 'sys' }, action: 'provider.health_check', resource: { type: 'provider', id: 'openai' }, outcome: 'success' })
src/lib/__tests__/api-routes-and-labs.test.ts:15: *  - Prompt Studio
src/lib/__tests__/api-routes-and-labs.test.ts:1024:// ── Prompt Studio ────────────────────────────────────────────────────────────
src/lib/__tests__/api-routes-and-labs.test.ts:1040:} from '../prompt-studio'
src/lib/__tests__/api-routes-and-labs.test.ts:1042:describe('Prompt Studio', () => {
src/lib/__tests__/voice-expansion.test.ts:66:    expect(ids).toContain('openai/whisper-large-v3')
src/lib/__tests__/voice-expansion.test.ts:67:    expect(ids).toContain('openai/whisper-small')
src/lib/__tests__/voice-expansion.test.ts:72:    const small = hf.find((m) => m.model_id === 'openai/whisper-small')
src/lib/__tests__/voice-expansion.test.ts:86:    expect(providers).toContain('openai')
src/lib/__tests__/voice-expansion.test.ts:87:    expect(providers).toContain('gemini')
src/lib/__tests__/voice-expansion.test.ts:105:  it('has 2 Groq TTS models (playai-tts, playai-tts-arabic)', () => {
src/lib/__tests__/voice-expansion.test.ts:110:    expect(ids).toContain('playai-tts')
src/lib/__tests__/voice-expansion.test.ts:111:    expect(ids).toContain('playai-tts-arabic')
src/lib/__tests__/voice-expansion.test.ts:114:  it('playai-tts-arabic has correct properties', () => {
src/lib/__tests__/voice-expansion.test.ts:116:    const arabic = groq.find((m) => m.model_id === 'playai-tts-arabic')
src/lib/__tests__/voice-expansion.test.ts:149:    expect(providers).toContain('openai')
src/lib/__tests__/voice-expansion.test.ts:150:    expect(providers).toContain('gemini')
src/lib/__tests__/voice-expansion.test.ts:169:    expect(byProvider.get('openai')).toBeGreaterThanOrEqual(1)
src/lib/__tests__/voice-expansion.test.ts:170:    expect(byProvider.get('gemini')).toBeGreaterThanOrEqual(1)
src/lib/__tests__/voice-expansion.test.ts:182:    expect(byProvider.get('openai')).toBeGreaterThanOrEqual(2)
src/lib/__tests__/voice-expansion.test.ts:183:    expect(byProvider.get('gemini')).toBeGreaterThanOrEqual(1)
src/lib/__tests__/voice-expansion.test.ts:252:    const openai = getModelsByProvider('openai')
src/lib/__tests__/voice-expansion.test.ts:253:    const voice = openai.filter(
src/lib/__tests__/voice-expansion.test.ts:262:    const gemini = getModelsByProvider('gemini')
src/lib/__tests__/voice-expansion.test.ts:263:    const voice = gemini.filter(
src/lib/__tests__/voice-expansion.test.ts:300:    expect(models).toContain('openai/whisper-base')
src/lib/__tests__/voice-expansion.test.ts:301:    expect(models).toContain('openai/whisper-small')
src/lib/__tests__/voice-expansion.test.ts:302:    expect(models).toContain('openai/whisper-large-v3')
src/lib/__tests__/voice-expansion.test.ts:329:    expect(map.voice_input.suggestedProviders).toEqual(['groq', 'openai', 'gemini', 'qwen', 'huggingface'])
src/lib/__tests__/voice-expansion.test.ts:334:    expect(map.voice_output.suggestedProviders).toEqual(['groq', 'openai', 'gemini', 'huggingface'])
src/lib/__tests__/voice-expansion.test.ts:337:  it('realtime_voice suggests openai only', () => {
src/lib/__tests__/voice-expansion.test.ts:339:    expect(map.realtime_voice.suggestedProviders).toEqual(['openai'])
src/lib/__tests__/model-registry.test.ts:57:      expect(providers.has('openai')).toBe(true)
src/lib/__tests__/model-registry.test.ts:59:      expect(providers.has('nvidia')).toBe(true)
src/lib/__tests__/model-registry.test.ts:68:      const openaiModels = getModelsByProvider('openai')
src/lib/__tests__/model-registry.test.ts:69:      expect(openaiModels.length).toBeGreaterThan(0)
src/lib/__tests__/model-registry.test.ts:70:      expect(openaiModels.every(m => m.provider === 'openai')).toBe(true)
src/lib/__tests__/model-registry.test.ts:106:      const model = getModelById('openai', 'gpt-4o')
src/lib/__tests__/model-registry.test.ts:108:      expect(model?.provider).toBe('openai')
src/lib/__tests__/model-registry.test.ts:109:      expect(model?.model_id).toBe('gpt-4o')
src/lib/__tests__/model-registry.test.ts:113:      expect(getModelById('openai', 'nonexistent')).toBeUndefined()
src/lib/__tests__/model-registry.test.ts:171:      const providers = ['openai', 'groq', 'deepseek', 'grok', 'huggingface', 'nvidia']
src/lib/__tests__/model-registry.test.ts:213:      expect(getProviderHealth('openai')).toBe('unconfigured')
src/lib/__tests__/model-registry.test.ts:217:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:218:      expect(getProviderHealth('openai')).toBe('healthy')
src/lib/__tests__/model-registry.test.ts:222:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:225:      expect(getProviderHealth('openai')).toBe('unconfigured')
src/lib/__tests__/model-registry.test.ts:230:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:234:      expect(snapshot.get('openai')?.status).toBe('healthy')
src/lib/__tests__/model-registry.test.ts:240:      expect(isProviderUsable('openai')).toBe(false)
src/lib/__tests__/model-registry.test.ts:245:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:247:      expect(isProviderUsable('openai')).toBe(true)
src/lib/__tests__/model-registry.test.ts:252:      setProviderHealth('openai', 'healthy') // populate cache so size > 0
src/lib/__tests__/model-registry.test.ts:262:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:268:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:270:      expect(isProviderDegraded('openai')).toBe(false)
src/lib/__tests__/model-registry.test.ts:275:      const model = getModelById('openai', 'gpt-4o')!
src/lib/__tests__/model-registry.test.ts:280:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:281:      const model = getModelById('openai', 'gpt-4o')!
src/lib/__tests__/model-registry.test.ts:293:      const openaiCount = allEnabled.filter(m => m.provider === 'openai').length
src/lib/__tests__/model-registry.test.ts:295:      // Mark openai as healthy, everything else as unconfigured
src/lib/__tests__/model-registry.test.ts:296:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:300:      setProviderHealth('nvidia', 'unconfigured')
src/lib/__tests__/model-registry.test.ts:304:      setProviderHealth('gemini', 'unconfigured')
src/lib/__tests__/model-registry.test.ts:307:      expect(usable.length).toBe(openaiCount)
src/lib/__tests__/model-registry.test.ts:308:      expect(usable.every(m => m.provider === 'openai')).toBe(true)
src/lib/__tests__/model-registry.test.ts:312:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/model-registry.test.ts:316:      setProviderHealth('nvidia', 'unconfigured')
src/lib/__tests__/model-registry.test.ts:320:      setProviderHealth('gemini', 'unconfigured')
src/lib/__tests__/model-registry.test.ts:324:      expect(providers.has('openai')).toBe(true)
src/lib/__tests__/app-profiles.test.ts:55:      expect(isProviderAllowed(profile, 'openai')).toBe(true)
src/lib/__tests__/image-dispatch-guard.test.ts:6: * execute through the generic callProvider() chat path (gpt-4o-mini) and
src/lib/__tests__/image-dispatch-guard.test.ts:45:  setProviderHealth('openai', 'healthy')
src/lib/__tests__/image-dispatch-guard.test.ts:95:  it('no gpt-4o-mini model has supports_image_generation=true', () => {
src/lib/__tests__/image-dispatch-guard.test.ts:97:    const chatOnlyModel = imageModels.find((m) => m.model_id === 'gpt-4o-mini')
src/lib/__tests__/image-dispatch-guard.test.ts:108:        m.model_id === 'gpt-4o-mini',
src/lib/__tests__/image-dispatch-guard.test.ts:120:  it('resolves image_generation capability when openai is configured', () => {
src/lib/__tests__/image-dispatch-guard.test.ts:131:      (m) => m.model_id === 'gpt-4o-mini',
src/lib/__tests__/image-dispatch-guard.test.ts:147:  it('image_generation route never includes gpt-4o-mini regardless of provider health', () => {
src/lib/__tests__/image-dispatch-guard.test.ts:149:    setProviderHealth('openai', 'healthy')
src/lib/__tests__/image-dispatch-guard.test.ts:154:      const badModel = route.models.find((m) => m.model_id === 'gpt-4o-mini')
src/lib/__tests__/integration-verification.test.ts:20:    setProviderHealth('openai', 'healthy')
src/lib/__tests__/integration-verification.test.ts:23:    setProviderHealth('gemini', 'configured')
src/lib/__tests__/integration-verification.test.ts:28:    setProviderHealth('nvidia', 'configured')
src/lib/__tests__/integration-verification.test.ts:42:      const brainProviders = ['openai', 'groq', 'deepseek', 'openrouter', 'together', 'grok', 'huggingface', 'nvidia']
src/lib/__tests__/integration-verification.test.ts:58:      const orchestratorProviders = ['openai', 'groq', 'deepseek', 'openrouter', 'together', 'grok', 'huggingface', 'nvidia']
src/lib/__tests__/live-media-execution-contract.test.ts:67:      subType: 'studio_image',
src/lib/__tests__/live-media-execution-contract.test.ts:90:      subType: 'generated_audio',
src/lib/__tests__/live-media-execution-contract.test.ts:127:      type: 'audio',
src/lib/__tests__/live-media-execution-contract.test.ts:157:    expect(read('app/api/brain/tts/route.ts')).toContain('Groq TTS is not an approved working audio execution route.')
src/lib/__tests__/live-media-execution-contract.test.ts:160:  it('uses canonical video capability and exposes local polling in Studio', () => {
src/lib/__tests__/live-media-execution-contract.test.ts:161:    const studio = read('app/api/admin/studio/execute/route.ts')
src/lib/__tests__/live-media-execution-contract.test.ts:162:    expect(studio).toContain("if (tab === 'Video') return 'video_generation'")
src/lib/__tests__/live-media-execution-contract.test.ts:163:    expect(studio).toContain('pollUrl: tracked?.pollUrl ?? null')
src/lib/__tests__/live-media-execution-contract.test.ts:164:    expect(studio).toContain("vocalStyle: 'instrumental_only'")
src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:44:    for (const label of ['App Builder', 'Repo Workbench', 'Media Studio / Playground', 'Outputs', 'Settings', 'Advanced Admin']) {
src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:50:    const studio = read('app/admin/dashboard/studio/page.tsx')
src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:52:      expect(studio).toContain(label)
src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:59:    expect(outputs).toContain('<audio')
src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:76:    const route = read('app/api/admin/music-studio/route.ts')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:5:import { STUDIO_ROUTE_MAP, STUDIO_TABS } from '@/lib/studio-route-map'
src/lib/__tests__/phase2-real-studio-workbench.test.ts:13:describe('Phase 2 real Studio and Workbench wiring', () => {
src/lib/__tests__/phase2-real-studio-workbench.test.ts:43:  it('maps every Studio tab to the protected route that owns its real execution state', () => {
src/lib/__tests__/phase2-real-studio-workbench.test.ts:50:      'Music / Audio',
src/lib/__tests__/phase2-real-studio-workbench.test.ts:58:    expect(STUDIO_ROUTE_MAP.Image.route).toBe('/api/admin/studio/execute')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:59:    expect(STUDIO_ROUTE_MAP.Research.route).toBe('/api/admin/studio/execute')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:60:    expect(STUDIO_ROUTE_MAP['Voice / TTS'].route).toBe('/api/admin/studio/execute')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:61:    expect(STUDIO_ROUTE_MAP['STT / Transcription'].route).toBe('/api/admin/studio/stt')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:66:  it('Command routes into real Studio surfaces and persists command jobs', () => {
src/lib/__tests__/phase2-real-studio-workbench.test.ts:67:    const execute = read('app/api/admin/studio/execute/route.ts')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:68:    const stt = read('app/api/admin/studio/stt/route.ts')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:86:  it('Adult Studio routes text, image, video, and voice through real capability routes', () => {
src/lib/__tests__/phase2-real-studio-workbench.test.ts:87:    const execute = read('app/api/admin/studio/execute/route.ts')
src/lib/__tests__/phase2-real-studio-workbench.test.ts:88:    const routeMap = read('lib/studio-route-map.ts')
src/lib/__tests__/video-capability.test.ts:55:    expect(planningModels.length).toBeGreaterThanOrEqual(6) // GPT-4o, o4-mini, Gemini 1.5 Pro, 2.0 Flash, 2.5 Pro, 2.5 Flash
src/lib/__tests__/video-capability.test.ts:63:    expect(providers).toContain('gemini')
src/lib/__tests__/video-capability.test.ts:64:    expect(providers).toContain('openai')
src/lib/__tests__/video-capability.test.ts:67:  it('video_planning suggested providers include gemini, openai, deepseek', () => {
src/lib/__tests__/video-capability.test.ts:69:    expect(map.video_planning.suggestedProviders).toContain('gemini')
src/lib/__tests__/video-capability.test.ts:70:    expect(map.video_planning.suggestedProviders).toContain('openai')
src/lib/__tests__/video-capability.test.ts:75:    const gemini = getModelsByProvider('gemini')
src/lib/__tests__/video-capability.test.ts:76:    const planningModels = gemini.filter((m) => 'supports_video_planning' in m && m.supports_video_planning)
src/lib/__tests__/video-capability.test.ts:81:    const openai = getModelsByProvider('openai')
src/lib/__tests__/video-capability.test.ts:82:    const planningModels = openai.filter((m) => 'supports_video_planning' in m && m.supports_video_planning)
src/lib/__tests__/video-capability.test.ts:84:    expect(ids).toContain('gpt-4o')
src/lib/__tests__/video-capability.test.ts:233:    const model = getModelRegistry().find((m) => m.model_id === 'gpt-4o' && m.provider === 'openai')
src/lib/__tests__/video-capability.test.ts:239:    const model = getModelRegistry().find((m) => m.model_id === 'gemini-1.5-pro' && m.provider === 'gemini')
src/lib/__tests__/video-capability.test.ts:245:    const model = getModelRegistry().find((m) => m.model_id === 'gemini-2.0-flash' && m.provider === 'gemini')
src/lib/__tests__/video-capability.test.ts:251:    const model = getModelRegistry().find((m) => m.model_id === 'gemini-2.5-pro-preview-05-06' && m.provider === 'gemini')
src/lib/__tests__/video-capability.test.ts:256:  it('o4-mini has supports_video_planning', () => {
src/lib/__tests__/video-capability.test.ts:257:    const model = getModelRegistry().find((m) => m.model_id === 'o4-mini' && m.provider === 'openai')
src/lib/__tests__/public-website-rebuild.test.ts:49:    for (const name of ['Marketing App', 'Crypto / Trading App', 'App Builder', 'Content Studio', 'Research Engine', 'Automation Hub', 'Sales', 'Support', 'Finance', 'Retail / Ecommerce', 'Operations']) {
src/lib/__tests__/provider-governance.test.ts:39:    const required = ['genx', 'github', 'qwen', 'minimax', 'mimo', 'deepseek', 'gemini', 'huggingface', 'groq', 'together', 'local-crawler', 'mem0', 'webdock']
src/lib/__tests__/provider-governance.test.ts:88:    expect(keys.has('openai')).toBe(false)
src/lib/__tests__/provider-governance.test.ts:115:  it('includes suno and udio from main governance backlog', () => {
src/lib/__tests__/provider-governance.test.ts:117:    expect(keys.has('suno')).toBe(true)
src/lib/__tests__/provider-governance.test.ts:118:    expect(keys.has('udio')).toBe(true)
src/lib/__tests__/provider-governance.test.ts:141:    'cohere', 'mistral', 'suno', 'udio',
src/lib/__tests__/provider-governance.test.ts:316:    // suno and udio are backlog
src/lib/__tests__/provider-governance.test.ts:317:    expect(keys.has('suno')).toBe(false)
src/lib/__tests__/provider-governance.test.ts:318:    expect(keys.has('udio')).toBe(false)
src/lib/__tests__/research-capability.test.ts:38:    expect(map.research_search.suggestedProviders).toContain('openai')
src/lib/__tests__/research-capability.test.ts:45:    expect(map.deep_research.suggestedProviders).toContain('openai')
src/lib/__tests__/research-capability.test.ts:46:    expect(map.deep_research.suggestedProviders).toContain('gemini')
src/lib/__tests__/routing-engine.test.ts:29:  setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:32:  setProviderHealth('gemini', 'configured')
src/lib/__tests__/routing-engine.test.ts:37:  setProviderHealth('nvidia', 'configured')
src/lib/__tests__/routing-engine.test.ts:205:      // Mark only openai as healthy, everything else as unconfigured
src/lib/__tests__/routing-engine.test.ts:206:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:210:      setProviderHealth('nvidia', 'unconfigured')
src/lib/__tests__/routing-engine.test.ts:214:      setProviderHealth('gemini', 'unconfigured')
src/lib/__tests__/routing-engine.test.ts:218:      expect(decision.primaryModel?.provider).toBe('openai')
src/lib/__tests__/routing-engine.test.ts:219:      // All fallbacks should also be from openai
src/lib/__tests__/routing-engine.test.ts:221:        expect(fb.provider).toBe('openai')
src/lib/__tests__/routing-engine.test.ts:226:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:230:      setProviderHealth('nvidia', 'error')
src/lib/__tests__/routing-engine.test.ts:234:      setProviderHealth('gemini', 'error')
src/lib/__tests__/routing-engine.test.ts:238:      expect(decision.primaryModel?.provider).toBe('openai')
src/lib/__tests__/routing-engine.test.ts:242:      setProviderHealth('openai', 'error')
src/lib/__tests__/routing-engine.test.ts:246:      setProviderHealth('nvidia', 'unconfigured')
src/lib/__tests__/routing-engine.test.ts:250:      setProviderHealth('gemini', 'unconfigured')
src/lib/__tests__/routing-engine.test.ts:258:      // Mark groq as degraded, openai and deepseek as healthy
src/lib/__tests__/routing-engine.test.ts:259:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:263:      setProviderHealth('nvidia', 'configured')
src/lib/__tests__/routing-engine.test.ts:267:      setProviderHealth('gemini', 'configured')
src/lib/__tests__/routing-engine.test.ts:274:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:278:      setProviderHealth('nvidia', 'configured')
src/lib/__tests__/routing-engine.test.ts:282:      setProviderHealth('gemini', 'configured')
src/lib/__tests__/routing-engine.test.ts:295:      setProviderHealth('openai', 'healthy')
src/lib/__tests__/routing-engine.test.ts:299:      setProviderHealth('nvidia', 'configured')
src/lib/__tests__/routing-engine.test.ts:303:      setProviderHealth('gemini', 'configured')
src/lib/__tests__/new-systems.test.ts:66:    const cost = estimateCostUsd('gpt-4o', 1000)
src/lib/__tests__/new-systems.test.ts:77:    const small = estimateCostUsd('gpt-4o-mini', 100)
src/lib/__tests__/new-systems.test.ts:78:    const large = estimateCostUsd('gpt-4o-mini', 10000)
src/lib/__tests__/new-systems.test.ts:92:    const within = await isProviderWithinBudget('openai')
src/lib/__tests__/adult-agent-audit.test.ts:109:    it('planner agent uses openai (callable) provider', () => {
src/lib/__tests__/adult-agent-audit.test.ts:111:      expect(entry!.defaultProvider).toBe('openai')
src/lib/__tests__/adult-agent-audit.test.ts:115:    it('retrieval agent uses openai (callable) provider', () => {
src/lib/__tests__/adult-agent-audit.test.ts:117:      expect(entry!.defaultProvider).toBe('openai')
src/lib/__tests__/adult-agent-audit.test.ts:119:      // Previously used cohere (NOT callable); upgraded to openai
src/lib/__tests__/adult-agent-audit.test.ts:123:    it('creative agent uses gemini (callable) provider', () => {
src/lib/__tests__/adult-agent-audit.test.ts:125:      expect(entry!.defaultProvider).toBe('gemini')
src/lib/__tests__/adult-agent-audit.test.ts:127:      // Previously used anthropic (NOT callable); upgraded to gemini
src/lib/__tests__/adult-agent-audit.test.ts:131:    it('security agent is openai-based (callable)', () => {
src/lib/__tests__/adult-agent-audit.test.ts:133:      expect(entry!.defaultProvider).toBe('openai')
src/lib/__tests__/adult-agent-audit.test.ts:137:    it('travel_planner agent uses gemini (callable)', () => {
src/lib/__tests__/adult-agent-audit.test.ts:139:      expect(entry!.defaultProvider).toBe('gemini')
src/lib/__tests__/adult-agent-audit.test.ts:145:    it('classifies openai-based agents correctly', () => {
src/lib/__tests__/adult-agent-audit.test.ts:146:      const openaiAgents = ['planner', 'router', 'validator', 'memory', 'campaign',
src/lib/__tests__/adult-agent-audit.test.ts:150:      for (const type of openaiAgents) {
src/lib/__tests__/adult-agent-audit.test.ts:152:        if (entry?.defaultProvider === 'openai') {
src/lib/__tests__/orchestrator.test.ts:64:      providerKey: 'openai',
src/lib/__tests__/orchestrator.test.ts:65:      model: 'gpt-4o-mini',
src/lib/__tests__/orchestrator.test.ts:117:      providerKey: 'openai',
src/lib/__tests__/orchestrator.test.ts:118:      model: 'gpt-4o',
src/lib/__tests__/platform-expansion.test.ts:4: *   - music-studio
src/lib/__tests__/platform-expansion.test.ts:86:      providerKey: 'openai',
src/lib/__tests__/platform-expansion.test.ts:96:      providerKey: 'openai',
src/lib/__tests__/platform-expansion.test.ts:104:    const d0 = shouldRetry(p.retryPolicy, { attempt: 0, lastErrorMessage: null, providerKey: 'openai' })
src/lib/__tests__/platform-expansion.test.ts:105:    const d1 = shouldRetry(p.retryPolicy, { attempt: 1, lastErrorMessage: null, providerKey: 'openai' })
src/lib/__tests__/platform-expansion.test.ts:111:// ── Music Studio ─────────────────────────────────────────────────────────────
src/lib/__tests__/platform-expansion.test.ts:116:  getMusicStudioStatus,
src/lib/__tests__/platform-expansion.test.ts:117:  getMusicStudioSummary,
src/lib/__tests__/platform-expansion.test.ts:122:} from '../music-studio'
src/lib/__tests__/platform-expansion.test.ts:124:describe('Music Studio', () => {
src/lib/__tests__/platform-expansion.test.ts:164:    const result = parseLyricsOutput(raw, baseRequest, 'gpt-4o')
src/lib/__tests__/platform-expansion.test.ts:170:    expect(result.model).toBe('gpt-4o')
src/lib/__tests__/platform-expansion.test.ts:175:    const result = parseLyricsOutput('some lyrics without title marker', baseRequest, 'gpt-4o')
src/lib/__tests__/platform-expansion.test.ts:197:  it('getMusicStudioStatus returns a valid status object', () => {
src/lib/__tests__/platform-expansion.test.ts:198:    const status = getMusicStudioStatus()
src/lib/__tests__/platform-expansion.test.ts:200:    expect(['available', 'needs_key']).toContain(status.audioGeneration)
src/lib/__tests__/platform-expansion.test.ts:205:  it('getMusicStudioSummary returns valid summary before any artifacts', () => {
src/lib/__tests__/platform-expansion.test.ts:206:    const summary = getMusicStudioSummary()
src/lib/__tests__/platform-expansion.test.ts:258:    const cost = estimateCost('chat', 'gpt-4o', 5000, 2000)
src/lib/__tests__/platform-expansion.test.ts:264:    const musicCost = estimateCost('music', 'suno-v3.5', 0, 0)
src/lib/__tests__/platform-expansion.test.ts:273:      model: 'gpt-4o',
src/lib/__tests__/platform-expansion.test.ts:274:      provider: 'openai',
src/lib/__tests__/platform-expansion.test.ts:355:  it('includes suno-v3.5, musicgen-melody, udio-v1', () => {
src/lib/__tests__/platform-expansion.test.ts:360:    expect(ids).toContain('suno-v3.5')
src/lib/__tests__/platform-expansion.test.ts:362:    expect(ids).toContain('udio-v1')
src/lib/__tests__/settings-provider-source-of-truth.test.ts:62:    const openai = getHiddenProviders().find(p => p.key === 'openai')
src/lib/__tests__/settings-provider-source-of-truth.test.ts:63:    expect(openai).toBeDefined()
src/lib/__tests__/settings-provider-source-of-truth.test.ts:64:    expect(openai?.displayName).toContain('compatibility fallback')
src/lib/__tests__/settings-provider-source-of-truth.test.ts:71:  const doNotShow = ['cohere', 'mistral', 'suno', 'udio', 'perplexity', 'tavily', 'jina', 'runpod', 'fal', 'fireworks', 'cerebras']
src/lib/__tests__/settings-provider-source-of-truth.test.ts:104:  it('suno, udio are in backlog providers', () => {
src/lib/__tests__/settings-provider-source-of-truth.test.ts:106:    expect(backlogKeys.has('suno')).toBe(true)
src/lib/__tests__/settings-provider-source-of-truth.test.ts:107:    expect(backlogKeys.has('udio')).toBe(true)
src/lib/__tests__/settings-provider-source-of-truth.test.ts:131:    expect(keys.has('openai')).toBe(false)
src/lib/__tests__/runtime-capability-truth.test.ts:375:  it('backlog providers (suno/udio) are not in runtime provider status', async () => {
src/lib/__tests__/runtime-capability-truth.test.ts:382:    const sunoEntry = providers.find(p => p.key === 'suno')
src/lib/__tests__/runtime-capability-truth.test.ts:383:    const udioEntry = providers.find(p => p.key === 'udio')
src/lib/__tests__/runtime-capability-truth.test.ts:386:    expect(sunoEntry).toBeUndefined()
src/lib/__tests__/runtime-capability-truth.test.ts:387:    expect(udioEntry).toBeUndefined()
src/lib/__tests__/runtime-capability-truth.test.ts:409:      prisma: makePrisma({ gemini: { apiKey: 'AIza_q1234567890abcdef12345' } }),
src/lib/__tests__/suggestive-capability.test.ts:188:    const result = validateSuggestivePrompt('Fashion model wearing elegant black lingerie in a studio')
src/lib/__tests__/backend-wiring-core-network.test.ts:187:    expect(block).not.toContain('openai')
src/lib/__tests__/backend-wiring-core-network.test.ts:189:    expect(block).not.toContain('suno')
src/lib/__tests__/backend-wiring-core-network.test.ts:504:      body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', keys: ['openai', 'anthropic', 'suno'] }),
src/lib/__tests__/provider-capability-governance.test.ts:50:  it('classifies Lyria as music and routes Studio music through music_generation, not voice_tts', () => {
src/lib/__tests__/provider-capability-governance.test.ts:55:      route: '/api/admin/music-studio',
src/lib/__tests__/provider-capability-governance.test.ts:60:    const studioExecute = read('app/api/admin/studio/execute/route.ts')
src/lib/__tests__/provider-capability-governance.test.ts:61:    expect(studioExecute).toContain("if (tab === 'Music / Audio') return 'music_generation'")
src/lib/__tests__/provider-capability-governance.test.ts:62:    expect(studioExecute).not.toContain("if (tab === 'Music / Audio') return 'voice_tts'")
src/app/admin/dashboard/page.tsx:10:    href: '/admin/dashboard/studio',
src/app/admin/dashboard/page.tsx:71:            href="/admin/dashboard/studio"
src/app/admin/dashboard/studio/page.tsx:34:type StudioTab =
src/app/admin/dashboard/studio/page.tsx:38:  | 'Music / Audio'
src/app/admin/dashboard/studio/page.tsx:49:  tab: StudioTab
src/app/admin/dashboard/studio/page.tsx:76:  audioUrl?: string
src/app/admin/dashboard/studio/page.tsx:120:    tab: 'Music / Audio',
src/app/admin/dashboard/studio/page.tsx:149:    placeholder: 'Enter text to turn into spoken audio.',
src/app/admin/dashboard/studio/page.tsx:158:    placeholder: 'Upload audio or video to transcribe.',
src/app/admin/dashboard/studio/page.tsx:175:export default function StudioPage() {
src/app/admin/dashboard/studio/page.tsx:229:      return grouped.music ?? grouped.tts ?? grouped.stt ?? grouped.audio_generation ?? allModels
src/app/admin/dashboard/studio/page.tsx:261:      const endpoint = mode.id === 'coding' ? '/api/admin/studio/workbench-handoff' : '/api/admin/studio/execute'
src/app/admin/dashboard/studio/page.tsx:333:        metadata: { appSlug, dashboardContext: true, studioTab: mode.tab },
src/app/admin/dashboard/studio/page.tsx:347:      setStatus('Choose an audio or video file first')
src/app/admin/dashboard/studio/page.tsx:357:    const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
src/app/admin/dashboard/studio/page.tsx:477:                  {uploadFile?.name ?? 'Choose audio or video file'}
src/app/admin/dashboard/studio/page.tsx:479:                <input type="file" accept="audio/*,video/*" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
src/app/admin/dashboard/studio/page.tsx:631:  if (isAudioUrl(url)) {
src/app/admin/dashboard/studio/page.tsx:632:    return <audio controls src={url} className="w-full" />
src/app/admin/dashboard/studio/page.tsx:658:    result.audioUrl,
src/app/admin/dashboard/studio/page.tsx:664:    nested.audioUrl,
src/app/admin/dashboard/studio/page.tsx:695:  if (result.storageUrl || result.mediaUrl || result.imageUrl || result.audioUrl || result.videoUrl) return 'Generated result ready'
src/app/admin/dashboard/studio/page.tsx:703:function isAudioUrl(url: string) {
src/app/admin/dashboard/studio/page.tsx:704:  return /\.(mp3|mpeg|wav|ogg|m4a|aac)(\?|$)/i.test(url) || url.startsWith('data:audio/')
src/app/admin/dashboard/operations/page.tsx:35:  const studioReady = storage.writable && providerCount > 0
src/app/admin/dashboard/operations/page.tsx:37:  const studioBlockers = [
src/app/admin/dashboard/operations/page.tsx:51:    'broken Studio execution',
src/app/admin/dashboard/operations/page.tsx:69:          Provider tests, Studio readiness, Workbench readiness, jobs, artifacts, and cost tracking in one go-live view.
src/app/admin/dashboard/operations/page.tsx:123:      {/* Studio + Workbench readiness */}
src/app/admin/dashboard/operations/page.tsx:125:        <div className={['rounded-2xl border p-5 backdrop-blur-xl', studioReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'].join(' ')}>
src/app/admin/dashboard/operations/page.tsx:128:              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Studio</p>
src/app/admin/dashboard/operations/page.tsx:129:              <h3 className="mt-1 text-base font-black text-slate-100">{studioReady ? 'Studio ready' : 'Studio blocked'}</h3>
src/app/admin/dashboard/operations/page.tsx:131:            <span className={['rounded-full border px-2.5 py-1 text-xs font-black', studioReady ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300'].join(' ')}>
src/app/admin/dashboard/operations/page.tsx:132:              {studioReady ? 'Ready' : 'Blocked'}
src/app/admin/dashboard/operations/page.tsx:138:          {studioBlockers.length > 0 && (
src/app/admin/dashboard/operations/page.tsx:140:              {studioBlockers.map((blocker) => (
src/app/admin/dashboard/operations/page.tsx:214:          <OpsRow label="Studio jobs" value={String(jobs.filter((job) => String((job as { type?: unknown; source?: unknown }).type ?? (job as { source?: unknown }).source).includes('studio')).length)} />
src/app/admin/dashboard/outputs/page.tsx:138:  if ((type === 'audio' || type === 'music') && url) {
src/app/admin/dashboard/outputs/page.tsx:139:    return <audio controls preload="metadata" src={url} className="mt-4 w-full" />
src/app/admin/dashboard/outputs/page.tsx:159:    for (const key of ['mediaUrl', 'resultUrl', 'imageUrl', 'audioUrl', 'musicUrl', 'videoUrl']) {
src/app/admin/dashboard/outputs/page.tsx:169:  if (['image', 'audio', 'music', 'video'].includes(type)) return Boolean(getArtifactUrl(artifact))
src/app/api/realtime/session/route.ts:8: * connects to that URL to start bidirectional audio streaming.
src/app/api/realtime/session/route.ts:64:  const openaiProvider = await prisma.aiProvider.findFirst({
src/app/api/realtime/session/route.ts:65:    where: { providerKey: 'openai', enabled: true },
src/app/api/realtime/session/route.ts:69:  if (!openaiProvider?.apiKey) {
src/app/api/realtime/session/route.ts:79:  if (openaiProvider.healthStatus === 'error' || openaiProvider.healthStatus === 'disabled') {
src/app/api/realtime/session/route.ts:83:        detail: `OpenAI health status: ${openaiProvider.healthStatus}. Check provider configuration.`,
src/app/api/realtime/session/route.ts:109:    .createHmac('sha256', openaiProvider.apiKey)
src/app/api/realtime/session/route.ts:124:    model: 'gpt-4o-realtime-preview',
src/app/api/realtime/session/route.ts:144:    provider: 'openai',
src/app/api/realtime/session/route.ts:145:    model: 'gpt-4o-realtime-preview',
src/app/api/realtime/health/route.ts:8: *   { serviceRunning: true/false, serviceUrl, openaiConfigured: true/false, ready: true/false }
src/app/api/realtime/health/route.ts:21:  const openaiProvider = await prisma.aiProvider.findFirst({
src/app/api/realtime/health/route.ts:22:    where: { providerKey: 'openai', enabled: true },
src/app/api/realtime/health/route.ts:26:  const openaiConfigured =
src/app/api/realtime/health/route.ts:27:    !!openaiProvider?.apiKey &&
src/app/api/realtime/health/route.ts:28:    openaiProvider.healthStatus !== 'error' &&
src/app/api/realtime/health/route.ts:29:    openaiProvider.healthStatus !== 'disabled';
src/app/api/realtime/health/route.ts:36:      openaiConfigured,
src/app/api/realtime/health/route.ts:64:  const ready = serviceRunning && openaiConfigured;
src/app/api/realtime/health/route.ts:71:    openaiConfigured,
src/app/api/fine-tune/route.ts:9:  provider: 'openai' | 'together' | 'qwen'
src/app/api/fine-tune/route.ts:69:      const supportedProviders = ['openai', 'together', 'qwen']
src/app/api/fine-tune/route.ts:143:      supportedProviders: ['openai', 'together', 'qwen'],
src/app/api/fine-tune/route.ts:145:        openai: ['gpt-4o-mini-2024-07-18', 'gpt-3.5-turbo-0125'],
src/app/api/artifacts/file/[...key]/route.ts:11:  mp3: 'audio/mpeg',
src/app/api/artifacts/file/[...key]/route.ts:12:  wav: 'audio/wav',
src/app/api/artifacts/file/[...key]/route.ts:13:  ogg: 'audio/ogg',
src/app/api/artifacts/file/[...key]/route.ts:19:  mpeg: 'audio/mpeg',
src/app/api/artifacts/file/[...key]/route.ts:20:  mpga: 'audio/mpeg',
src/app/api/artifacts/file/[...key]/route.ts:21:  m4a: 'audio/mp4',
src/app/api/artifacts/file/[...key]/route.ts:22:  oga: 'audio/ogg',
src/app/api/artifacts/file/[...key]/route.ts:23:  flac: 'audio/flac',
src/app/api/artifacts/file/[...key]/route.ts:24:  aac: 'audio/aac',
src/app/api/prompts/route.ts:14:} from '@/lib/prompt-studio'
src/app/api/admin/media-studio/models/route.ts:66:      if (category === 'audio' || caps.some((cap) => cap.includes('music') || cap.includes('audio'))) mapped = 'music'
src/app/api/admin/ai-routing/route.ts:21:    'audio',
src/app/api/admin/ai-routing/smart/route.ts:13:    'voice_tts', 'voice_stt', 'tts', 'stt', 'audio', 'music_generation', 'embeddings',
src/app/api/admin/provider-capability-test/route.ts:76:      const audioOrBinary = specialist.bytes ? Buffer.byteLength(Buffer.from(specialist.bytes)) : 0
src/app/api/admin/provider-capability-test/route.ts:86:        bytes: audioOrBinary,
src/app/api/admin/ai-partner/chat/route.ts:49:  { key: 'groq',      baseUrl: 'https://api.groq.com/openai', defaultModel: 'llama-3.3-70b-versatile' },
src/app/api/admin/ai-partner/chat/route.ts:50:  { key: 'openai',    baseUrl: 'https://api.openai.com',      defaultModel: 'gpt-4o-mini' },
src/app/api/admin/ai-partner/chat/route.ts:51:  { key: 'gemini',    baseUrl: null,                          defaultModel: 'gemini-2.0-flash' },
src/app/api/admin/ai-partner/chat/route.ts:68:  if (providerKey === 'gemini') {
src/app/api/admin/ai-partner/chat/route.ts:94:  const base = baseUrl ?? 'https://api.openai.com'
src/app/api/admin/settings/test-adult/route.ts:53:const ADULT_TEST_PROMPT = 'a tasteful artistic portrait of a woman in soft studio lighting'
src/app/api/admin/settings/test-adult/route.ts:182:        adult_voice:         'audio',
src/app/api/admin/settings/reset-approved-keys/route.ts:28:  'gemini',
src/app/api/admin/settings/test-groq/route.ts:33:    const res = await fetch('https://api.groq.com/openai/v1/models', {
src/app/api/admin/settings/test-openai/route.ts:2: * POST /api/admin/settings/test-openai
src/app/api/admin/settings/test-openai/route.ts:25:  const key = inlineKey || await getProviderKey('openai') || ''
src/app/api/admin/settings/test-openai/route.ts:33:    const res = await fetch('https://api.openai.com/v1/models', {
src/app/api/admin/settings/test-openai/route.ts:49:        where: { key: 'openai' },
src/app/api/admin/settings/test-openai/route.ts:50:        create: { key: 'openai', displayName: 'OpenAI', apiKey: '', enabled: true, notes: JSON.stringify({ lastTestStatus: 'passed', lastTestPassed: true, lastTestedAt: new Date().toISOString() }) },
src/app/api/admin/artifacts/route.ts:166:      'openai.com',
src/app/api/admin/studio/workbench-handoff/route.ts:27:      description: body.repoFullName ? `Repo: ${body.repoFullName}` : 'Studio coding prompt for Workbench',
src/app/api/admin/studio/stt/route.ts:15:    return NextResponse.json({ success: false, error: 'audio file is required' }, { status: 400 })
src/app/api/admin/studio/stt/route.ts:24:  form.append('file', file, file instanceof File ? file.name : 'audio.webm')
src/app/api/admin/studio/stt/route.ts:29:  const response = await sttPost(new NextRequest(new URL('/api/brain/stt', 'http://studio.local'), {
src/app/api/admin/studio/stt/route.ts:41:        subType: 'studio_stt',
src/app/api/admin/studio/stt/route.ts:42:        title: `Transcript: ${(file instanceof File ? file.name : 'audio').slice(0, 80)}`,
src/app/api/admin/studio/stt/route.ts:43:        description: 'Studio STT transcription',
src/app/api/admin/studio/stt/route.ts:48:        metadata: { language: data.language ?? language, sourceFile: file instanceof File ? file.name : 'audio' },
src/app/api/admin/studio/execute/route.ts:8:import { getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'
src/app/api/admin/studio/execute/route.ts:16:import { POST as musicPost } from '@/app/api/admin/music-studio/route'
src/app/api/admin/studio/execute/route.ts:18:type StudioExecuteTab =
src/app/api/admin/studio/execute/route.ts:24:  | 'Music / Audio'
src/app/api/admin/studio/execute/route.ts:32:  tab?: StudioTab
src/app/api/admin/studio/execute/route.ts:53:  return new NextRequest(new URL(path, 'http://studio.local'), {
src/app/api/admin/studio/execute/route.ts:99:function normalizeCapability(tab: StudioTab, adultMode?: string): AiCapability {
src/app/api/admin/studio/execute/route.ts:103:  if (tab === 'Music / Audio') return 'music_generation'
src/app/api/admin/studio/execute/route.ts:116:function normalizeStudioTab(input: unknown, body?: ExecuteBody): StudioExecuteTab | null {
src/app/api/admin/studio/execute/route.ts:152:      value === 'audio' ||
src/app/api/admin/studio/execute/route.ts:153:      value === 'music audio' ||
src/app/api/admin/studio/execute/route.ts:155:      value === 'audio generation'
src/app/api/admin/studio/execute/route.ts:156:    ) return 'Music / Audio'
src/app/api/admin/studio/execute/route.ts:221:  const tab = normalizeStudioTab(body.tab ?? body.mode ?? body.capability, body)
src/app/api/admin/studio/execute/route.ts:227:  const config = getStudioRouteConfig(tab)
src/app/api/admin/studio/execute/route.ts:269:        description: 'Studio Research Agent result',
src/app/api/admin/studio/execute/route.ts:295:          subType: 'studio_image',
src/app/api/admin/studio/execute/route.ts:309:          subType: 'studio_image',
src/app/api/admin/studio/execute/route.ts:376:    if (tab === 'Music / Audio') {
src/app/api/admin/studio/execute/route.ts:377:      const response = await musicPost(jsonRequest('/api/admin/music-studio', {
src/app/api/admin/studio/execute/route.ts:462:      error: error instanceof Error ? error.message : 'Studio execution failed',
src/app/api/admin/amarktai-assistant/context/route.ts:45:      { provider: 'openai', label: 'OpenAI TTS', status: process.env.OPENAI_API_KEY ? 'Configured' : 'Needs key/test' },
src/app/api/admin/amarktai-assistant/tts/route.ts:17:  const selectedProvider = body.voiceId && ['minimax', 'genx', 'groq', 'openai'].includes(body.voiceId) ? body.voiceId : 'auto'
src/app/api/admin/amarktai-assistant/tts/route.ts:44:    error: `${route.selectedProvider} voice route is selected, but live audio playback needs a configured provider endpoint.`,
src/app/api/admin/specialist/minimax-tts/route.ts:35:        contentType: result.contentType ?? 'audio/mpeg',
src/app/api/admin/specialist/minimax-tts/route.ts:60:        'Content-Type': result.contentType ?? 'audio/mpeg',
src/app/api/admin/apps/intelligence/route.ts:264:  const cheapFallbacks = ['gemini', 'qwen', 'groq', 'grok', 'openrouter']
src/app/api/admin/music-studio/route.ts:10:  getMusicStudioStatusAsync,
src/app/api/admin/music-studio/route.ts:11:  getMusicStudioSummaryAsync,
src/app/api/admin/music-studio/route.ts:16:} from '@/lib/music-studio'
src/app/api/admin/music-studio/route.ts:22: * GET /api/admin/music-studio
src/app/api/admin/music-studio/route.ts:28: *   status   - return music studio status (vault-aware async check)
src/app/api/admin/music-studio/route.ts:46:    return NextResponse.json({ status: await getMusicStudioStatusAsync() })
src/app/api/admin/music-studio/route.ts:50:    return NextResponse.json({ summary: await getMusicStudioSummaryAsync() })
src/app/api/admin/music-studio/route.ts:80:  const status = await getMusicStudioStatusAsync()
src/app/api/admin/music-studio/route.ts:89: * POST /api/admin/music-studio
src/app/api/admin/music-studio/route.ts:151:      const status = await getMusicStudioStatusAsync()
src/app/api/admin/music-studio/route.ts:152:      if (!status.audioProviderConfigured) {
src/app/api/admin/music-studio/route.ts:153:        const blocker = 'No connected music/audio provider can start real song generation. Configure and test GenX audio generation.'
src/app/api/admin/music-studio/route.ts:173:        type: 'audio',
src/app/api/admin/music-studio/route.ts:181:        const blocker = generated.error ?? 'Music provider returned no playable audio or trackable provider job.'
src/app/api/admin/music-studio/route.ts:193:          subType: 'generated_audio',
src/app/api/admin/music-studio/route.ts:212:          audioUrl: persisted.mediaUrl,
src/app/api/admin/music-studio/route.ts:223:        subType: 'generated_audio',
src/app/api/admin/music-studio/route.ts:237:    const completed = result.status === 'generated' && Boolean(result.artifact.audioUrl)
src/app/api/admin/music-studio/route.ts:246:      storageUrl: completed ? result.artifact.audioUrl : null,
src/app/api/admin/music-studio/route.ts:247:      audioUrl: completed ? result.artifact.audioUrl : null,
src/app/api/admin/music-studio/route.ts:248:      musicUrl: completed ? result.artifact.audioUrl : null,
src/app/api/admin/music-studio/route.ts:249:      error: completed ? null : 'Music provider returned no playable audio.',
src/app/api/admin/music-studio/route.ts:250:      blocker: completed ? null : 'Music provider returned no playable audio. The saved output is a planning artifact, not a completed song.',
src/app/api/admin/music-studio/route.ts:254:    const error = err instanceof Error ? err.message : 'Music studio error'
src/app/api/admin/music-studio/jobs/[jobId]/route.ts:3:import { getMusicJob, cancelMusicJob, retryMusicJob } from '@/lib/music-studio'
src/app/api/admin/music-studio/jobs/[jobId]/route.ts:6: * GET /api/admin/music-studio/jobs/[jobId]
src/app/api/admin/music-studio/jobs/[jobId]/route.ts:31: * DELETE /api/admin/music-studio/jobs/[jobId]
src/app/api/admin/music-studio/jobs/[jobId]/route.ts:65: * POST /api/admin/music-studio/jobs/[jobId]
src/app/api/admin/sdk/route.ts:54:const audio = await ai.tts('Welcome to the future.', { emotionAware: true })
src/app/api/admin/brain/test/route.ts:306:  // to the default chat model (e.g. gpt-4o-mini) instead of the image API.
src/app/api/admin/brain/test/route.ts:316:        responseFormat: 'audio',
src/app/api/admin/brain/test/route.ts:323:        const audioUrl = `data:audio/mpeg;base64,${base64}`
src/app/api/admin/brain/test/route.ts:337:          output: '[TTS audio generated]', audioUrl,
src/app/api/admin/brain/test/route.ts:357:          success: false, executed: false, traceId, output: null, audioUrl: null,
src/app/api/admin/brain/test/route.ts:369:            success: false, executed: false, traceId, output: null, audioUrl: null,
src/app/api/admin/brain/test/route.ts:386:          error: 'STT requires an audio file upload. Use POST /api/brain/stt with multipart/form-data.',
src/app/api/admin/voice/options/route.ts:21:  { id: 'elevenlabs:default:studio', label: 'ElevenLabs Studio Voice', provider: 'elevenlabs', model: 'default', verified: false, blocker: null },
src/app/api/admin/voice/preview/route.ts:25:  'elevenlabs:default:studio': { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voiceId: 'EXAVITQu4vr4xnSDxMaL', gender: 'female', label: 'ElevenLabs Studio Voice' },
src/app/api/admin/voice/preview/route.ts:83:      responseFormat: 'audio',
src/app/api/admin/voice/preview/route.ts:99:  const audio = await ttsResponse.arrayBuffer()
src/app/api/admin/voice/preview/route.ts:100:  return new NextResponse(audio, {
src/app/api/admin/voice/preview/route.ts:103:      'Content-Type': ttsResponse.headers.get('Content-Type') ?? 'audio/mpeg',
src/app/api/admin/voice/preview/route.ts:104:      'Content-Length': String(audio.byteLength),
src/app/api/admin/monetization/route.ts:148:          String(body.model ?? 'gpt-4o'),
src/app/api/admin/command/route.ts:7:import type { StudioCommandOptions } from '@/lib/studio-options'
src/app/api/admin/command/route.ts:32:  const body = await request.json().catch(() => ({})) as { prompt?: string; options?: StudioCommandOptions }
src/app/api/admin/command/route.ts:89:  options: StudioCommandOptions | undefined,
src/app/api/admin/command/route.ts:147:          appSlug: 'content-studio',
src/app/api/admin/command/route.ts:153:    const response = await (await import('@/app/api/admin/music-studio/route')).POST(request)
src/app/api/admin/provider-governance/route.ts:36:      advancedOnly: ['openai', 'xai'],
src/app/api/brain/image/route.ts:109:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/image/route.ts:110:    if (openaiKey && (!providerOverride || providerOverride === 'openai')) {
src/app/api/brain/image/route.ts:150:          const response = await fetch('https://api.openai.com/v1/images/generations', {
src/app/api/brain/image/route.ts:153:              Authorization: `Bearer ${openaiKey}`,
src/app/api/brain/image/route.ts:171:                provider: 'openai',
src/app/api/brain/image/route.ts:237:    const geminiKey = await getVaultApiKey('gemini');
src/app/api/brain/image/route.ts:238:    if (geminiKey && (!providerOverride || providerOverride === 'gemini')) {
src/app/api/brain/image/route.ts:241:          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(geminiKey)}`;
src/app/api/brain/image/route.ts:261:              provider: 'gemini',
src/app/api/brain/image/route.ts:359:    if (!openaiKey) rejectionReasons.push('openai: no API key configured');
src/app/api/brain/image/route.ts:361:    if (!geminiKey) rejectionReasons.push('gemini: no API key configured (Imagen 3.0)');
src/app/api/brain/image/route.ts:375:        providers_checked: ['genx', 'openai', 'together', 'gemini', 'qwen'],
src/app/api/brain/suggestive-video/route.ts:38:  audioDirection?: string;
src/app/api/brain/suggestive-video/route.ts:60:    fashion: 'Clean, well-lit studio shot with neutral background; model in elegant clothing',
src/app/api/brain/suggestive-video/route.ts:102:      audioDirection:
src/app/api/brain/image-edit/route.ts:111:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/image-edit/route.ts:112:    if (openaiKey) {
src/app/api/brain/image-edit/route.ts:143:          const response = await fetch('https://api.openai.com/v1/images/edits', {
src/app/api/brain/image-edit/route.ts:146:              Authorization: `Bearer ${openaiKey}`,
src/app/api/brain/image-edit/route.ts:163:                provider: 'openai',
src/app/api/brain/image-edit/route.ts:258:    if (!openaiKey) rejectionReasons.push('openai: no API key configured (needed for DALL-E 2 inpainting)');
src/app/api/brain/image-edit/route.ts:270:        providers_checked: ['openai', 'huggingface'],
src/app/api/brain/stt/route.ts:10: *   - Gemini STT (premium multimodal — gemini-2.0-flash-live-001)
src/app/api/brain/stt/route.ts:11: *   - Hugging Face STT (free fallback — openai/whisper-large-v3 / openai/whisper-small)
src/app/api/brain/stt/route.ts:16: *   - file (audio file, required) — audio to transcribe
src/app/api/brain/stt/route.ts:19: *   - provider (string, optional) — 'groq' | 'openai' | 'gemini' | 'huggingface' | 'auto' (default: 'auto')
src/app/api/brain/stt/route.ts:50:      return unavailable('invalid_request', 'Content-Type must be multipart/form-data with an audio file', 400);
src/app/api/brain/stt/route.ts:57:      return unavailable('invalid_request', 'An audio file is required in the "file" field', 400);
src/app/api/brain/stt/route.ts:66:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/stt/route.ts:67:    const geminiKey = await getVaultApiKey('gemini');
src/app/api/brain/stt/route.ts:72:    // GenX STT accepts audio as base64 via the media generate endpoint.
src/app/api/brain/stt/route.ts:77:        const audioBytes = await file.arrayBuffer();
src/app/api/brain/stt/route.ts:78:        const audioBase64 = Buffer.from(audioBytes).toString('base64');
src/app/api/brain/stt/route.ts:79:        const mimeType = (file as File).type || 'audio/mpeg';
src/app/api/brain/stt/route.ts:82:          prompt: audioBase64,
src/app/api/brain/stt/route.ts:83:          type: 'audio',
src/app/api/brain/stt/route.ts:107:    let provider: 'groq' | 'openai' | 'gemini' | 'huggingface' | 'qwen';
src/app/api/brain/stt/route.ts:113:    } else if (requestedProvider === 'openai') {
src/app/api/brain/stt/route.ts:114:      if (!openaiKey) {
src/app/api/brain/stt/route.ts:115:        return unavailable('provider_not_configured', 'OpenAI STT requested but no OpenAI API key is configured. Add it via Admin → AI Providers.', 503, 'openai');
src/app/api/brain/stt/route.ts:117:      provider = 'openai';
src/app/api/brain/stt/route.ts:118:    } else if (requestedProvider === 'gemini') {
src/app/api/brain/stt/route.ts:119:      if (!geminiKey) {
src/app/api/brain/stt/route.ts:120:        return unavailable('provider_not_configured', 'Gemini STT requested but no Gemini API key is configured. Add it via Admin → AI Providers.', 503, 'gemini');
src/app/api/brain/stt/route.ts:122:      provider = 'gemini';
src/app/api/brain/stt/route.ts:136:      if (openaiKey) {
src/app/api/brain/stt/route.ts:137:        provider = 'openai';
src/app/api/brain/stt/route.ts:140:      } else if (geminiKey) {
src/app/api/brain/stt/route.ts:141:        provider = 'gemini';
src/app/api/brain/stt/route.ts:157:      ?? (provider === 'groq' ? 'whisper-large-v3' : provider === 'gemini' ? 'gemini-2.0-flash-live-001' : provider === 'qwen' ? 'qwen-audio-turbo' : provider === 'huggingface' ? 'openai/whisper-large-v3' : 'whisper-1');
src/app/api/brain/stt/route.ts:162:      upstream.append('file', file, 'audio.webm');
src/app/api/brain/stt/route.ts:166:      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
src/app/api/brain/stt/route.ts:189:    if (provider === 'gemini') {
src/app/api/brain/stt/route.ts:191:      const audioBytes = Buffer.from(await file.arrayBuffer());
src/app/api/brain/stt/route.ts:192:      const audioBase64 = audioBytes.toString('base64');
src/app/api/brain/stt/route.ts:193:      const mimeType = (file as File).type || 'audio/webm';
src/app/api/brain/stt/route.ts:196:        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
src/app/api/brain/stt/route.ts:204:                  { inline_data: { mime_type: mimeType, data: audioBase64 } },
src/app/api/brain/stt/route.ts:205:                  { text: language ? `Transcribe this audio. The language is ${language}.` : 'Transcribe this audio accurately.' },
src/app/api/brain/stt/route.ts:216:        return unavailable('transcription_failed', `Gemini transcription failed: ${err}`, response.status, 'gemini');
src/app/api/brain/stt/route.ts:225:        provider: 'gemini',
src/app/api/brain/stt/route.ts:234:      const ALLOWED_HF_STT_MODELS = ['openai/whisper-large-v3', 'openai/whisper-small', 'openai/whisper-base'] as const;
src/app/api/brain/stt/route.ts:236:      const hfModel = matched ?? 'openai/whisper-large-v3';
src/app/api/brain/stt/route.ts:237:      const audioBytes = Buffer.from(await file.arrayBuffer());
src/app/api/brain/stt/route.ts:243:          'Content-Type': (file as File).type || 'audio/webm',
src/app/api/brain/stt/route.ts:245:        body: audioBytes,
src/app/api/brain/stt/route.ts:266:      // Qwen Audio (qwen-audio-turbo / qwen-audio-chat) via DashScope compatible-mode.
src/app/api/brain/stt/route.ts:267:      // The model accepts audio inline_data as base64 in the messages content array.
src/app/api/brain/stt/route.ts:268:      const audioBytes = Buffer.from(await file.arrayBuffer());
src/app/api/brain/stt/route.ts:269:      const audioBase64 = audioBytes.toString('base64');
src/app/api/brain/stt/route.ts:270:      const mimeType = (file as File).type || 'audio/webm';
src/app/api/brain/stt/route.ts:272:        ? `Transcribe this audio accurately. The spoken language is ${language}. Output only the transcribed text.`
src/app/api/brain/stt/route.ts:273:        : 'Transcribe this audio accurately. Output only the transcribed text.';
src/app/api/brain/stt/route.ts:290:                    type: 'audio_url',
src/app/api/brain/stt/route.ts:291:                    audio_url: { url: `data:${mimeType};base64,${audioBase64}` },
src/app/api/brain/stt/route.ts:304:        return unavailable('transcription_failed', `Qwen Audio transcription failed: ${err}`, response.status, 'qwen');
src/app/api/brain/stt/route.ts:324:    upstream.append('file', file, 'audio.webm');
src/app/api/brain/stt/route.ts:328:    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
src/app/api/brain/stt/route.ts:330:      headers: { Authorization: `Bearer ${openaiKey}` },
src/app/api/brain/stt/route.ts:336:      return unavailable('transcription_failed', `OpenAI transcription failed: ${err}`, response.status, 'openai');
src/app/api/brain/stt/route.ts:344:      provider: 'openai',
src/app/api/brain/stream/route.ts:12:  openai:     { baseUrl: 'https://api.openai.com' },
src/app/api/brain/stream/route.ts:13:  groq:       { baseUrl: 'https://api.groq.com/openai' },
src/app/api/brain/stream/route.ts:19:  nvidia:     { baseUrl: 'https://integrate.api.nvidia.com' },
src/app/api/brain/stream/route.ts:25:  openai:     'gpt-4o-mini',
src/app/api/brain/stream/route.ts:28:  openrouter: 'openai/gpt-4o-mini',
src/app/api/brain/stream/route.ts:32:  nvidia:     'nvidia/llama-3.1-nemotron-70b-instruct',
src/app/api/brain/stream/route.ts:33:  gemini:     'gemini-2.0-flash',
src/app/api/brain/stream/route.ts:56:   *   balanced     — default: quality/cost balance (openai, groq, anthropic, gemini)
src/app/api/brain/stream/route.ts:57:   *   quality_first — prefers highest-quality providers (openai, anthropic, gemini)
src/app/api/brain/stream/route.ts:117:  const resolvedModel = body.model || DEFAULT_STREAM_MODELS[resolvedProvider] || 'gpt-4o-mini'
src/app/api/brain/stream/route.ts:195:        if (resolvedProvider === 'gemini') {
src/app/api/brain/stream/route.ts:196:          const apiKey = await getVaultApiKey('gemini')
src/app/api/brain/stream/route.ts:198:            send({ type: 'error', message: 'Provider gemini is not configured — add an API key via Admin → AI Providers.' })
src/app/api/brain/stream/route.ts:229:          send({ type: 'done', traceId, model: resolvedModel, provider: 'gemini' })
src/app/api/brain/stream/route.ts:381: *   free_first   — groq → deepseek → together → huggingface → openai → anthropic → gemini
src/app/api/brain/stream/route.ts:382: *   balanced     — openai → groq → anthropic → gemini → mistral → deepseek → … (default)
src/app/api/brain/stream/route.ts:383: *   quality_first — openai → anthropic → gemini → grok → mistral → groq → …
src/app/api/brain/stream/route.ts:399:      'openrouter', 'qwen', 'nvidia',
src/app/api/brain/stream/route.ts:403:      'openai', 'groq', 'anthropic', 'gemini', 'mistral',
src/app/api/brain/stream/route.ts:404:      'deepseek', 'together', 'qwen', 'grok', 'openrouter', 'nvidia', 'cohere',
src/app/api/brain/stream/route.ts:408:      'openai', 'anthropic', 'gemini', 'grok', 'mistral',
src/app/api/brain/stream/route.ts:409:      'groq', 'deepseek', 'together', 'openrouter', 'cohere', 'nvidia',
src/app/api/brain/suggestive-image/route.ts:136:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/suggestive-image/route.ts:137:    if (openaiKey) {
src/app/api/brain/suggestive-image/route.ts:139:        const response = await fetch('https://api.openai.com/v1/images/generations', {
src/app/api/brain/suggestive-image/route.ts:142:            Authorization: `Bearer ${openaiKey}`,
src/app/api/brain/suggestive-image/route.ts:163:              provider: 'openai',
src/app/api/brain/suggestive-image/route.ts:262:    const geminiKey = await getVaultApiKey('gemini');
src/app/api/brain/suggestive-image/route.ts:263:    if (geminiKey) {
src/app/api/brain/suggestive-image/route.ts:266:          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(geminiKey)}`;
src/app/api/brain/suggestive-image/route.ts:288:              provider: 'gemini',
src/app/api/brain/suggestive-image/route.ts:387:        providers_checked: ['openai', 'together', 'huggingface', 'gemini', 'qwen'],
src/app/api/brain/moderation/route.ts:42:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/moderation/route.ts:43:    if (openaiKey) {
src/app/api/brain/moderation/route.ts:50:        const response = await fetch('https://api.openai.com/v1/moderations', {
src/app/api/brain/moderation/route.ts:53:            Authorization: `Bearer ${openaiKey}`,
src/app/api/brain/moderation/route.ts:74:            provider: 'openai',
src/app/api/brain/moderation/route.ts:103:        providers_checked: ['openai'],
src/app/api/brain/research/route.ts:76:  const apiKey = await getVaultApiKey('openai');
src/app/api/brain/research/route.ts:80:  const model = 'gpt-4o';
src/app/api/brain/research/route.ts:83:    const response = await fetch('https://api.openai.com/v1/chat/completions', {
src/app/api/brain/research/route.ts:117:  const apiKey = await getVaultApiKey('gemini');
src/app/api/brain/research/route.ts:121:  const model = 'gemini-1.5-pro';
src/app/api/brain/research/route.ts:205:    let provider = 'openai';
src/app/api/brain/research/route.ts:211:      provider = 'gemini';
src/app/api/brain/research/route.ts:224:          providers_checked: ['openai', 'gemini'],
src/app/api/brain/rerank/route.ts:25:  'nvidia/nv-rerankqa-mistral-4b-v3',
src/app/api/brain/rerank/route.ts:33:  provider: z.enum(['huggingface', 'nvidia', 'auto']).optional().default('auto'),
src/app/api/brain/rerank/route.ts:99:    `https://integrate.api.nvidia.com/v1/ranking`,
src/app/api/brain/rerank/route.ts:179:  if (!scores && (provider === 'auto' || provider === 'nvidia')) {
src/app/api/brain/rerank/route.ts:180:    const nvKey = await getVaultApiKey('nvidia');
src/app/api/brain/rerank/route.ts:184:        usedProvider = 'nvidia';
src/app/api/brain/video/route.ts:11: *   - Audio direction per scene
src/app/api/brain/video/route.ts:39:  audioDirection?: string
src/app/api/brain/video/route.ts:73:      audioDirection: i === 0 ? 'Fade in background music' : i === sceneCount - 1 ? 'Music crescendo and fade out' : undefined,
src/app/api/brain/video/route.ts:142:    // Prefer OpenAI (gpt-4o-mini for speed/cost), fall back to Gemini, then template.
src/app/api/brain/video/route.ts:157:- "audioDirection" (string or null — music/sound for this scene)
src/app/api/brain/video/route.ts:199:    const openaiKey = !aiScenes ? await getVaultApiKey('openai') : null;
src/app/api/brain/video/route.ts:200:    if (!aiScenes && openaiKey) {
src/app/api/brain/video/route.ts:202:        const aiResult = await callProvider('openai', 'gpt-4o-mini', llmPrompt);
src/app/api/brain/video/route.ts:207:            aiProvider = 'openai';
src/app/api/brain/video/route.ts:208:            aiModel = 'gpt-4o-mini';
src/app/api/brain/video/route.ts:219:      const geminiKey = await getVaultApiKey('gemini');
src/app/api/brain/video/route.ts:220:      if (geminiKey) {
src/app/api/brain/video/route.ts:222:          const aiResult = await callProvider('gemini', 'gemini-2.0-flash', llmPrompt);
src/app/api/brain/video/route.ts:227:              aiProvider = 'gemini';
src/app/api/brain/video/route.ts:228:              aiModel = 'gemini-2.0-flash';
src/app/api/brain/tts/route.ts:23:  audioBase64?: string
src/app/api/brain/tts/route.ts:38:    audioBase64: input.audioBase64,
src/app/api/brain/tts/route.ts:51:    const responseFormat = body.responseFormat === 'audio' ? 'audio' : 'json'
src/app/api/brain/tts/route.ts:87:        model: typeof body.model === 'string' ? body.model : 'playai-tts',
src/app/api/brain/tts/route.ts:89:        error: 'Groq TTS is not an approved working audio execution route.',
src/app/api/brain/tts/route.ts:109:      let audio: Buffer | null = null
src/app/api/brain/tts/route.ts:110:      let mimeType = 'audio/mpeg'
src/app/api/brain/tts/route.ts:115:        const generated = await callGenXMedia({ model: genxModel, prompt: text, type: 'audio' }).catch((cause) => ({
src/app/api/brain/tts/route.ts:125:          const audioResponse = await fetch(generated.url, { signal: AbortSignal.timeout(30_000) }).catch(() => null)
src/app/api/brain/tts/route.ts:126:          if (audioResponse?.ok) {
src/app/api/brain/tts/route.ts:127:            audio = Buffer.from(await audioResponse.arrayBuffer())
src/app/api/brain/tts/route.ts:128:            mimeType = audioResponse.headers.get('content-type') ?? mimeType
src/app/api/brain/tts/route.ts:130:            error = 'GenX returned an audio URL that could not be downloaded.'
src/app/api/brain/tts/route.ts:136:            type: 'audio',
src/app/api/brain/tts/route.ts:151:          error = generated.error ?? 'GenX returned no audio.'
src/app/api/brain/tts/route.ts:167:            audio = Buffer.from(await response.arrayBuffer())
src/app/api/brain/tts/route.ts:175:      if (!audio?.length) {
src/app/api/brain/tts/route.ts:183:          type: 'audio',
src/app/api/brain/tts/route.ts:189:          content: audio,
src/app/api/brain/tts/route.ts:193:        if (responseFormat === 'audio') {
src/app/api/brain/tts/route.ts:194:          return new NextResponse(new Uint8Array(audio), {
src/app/api/brain/tts/route.ts:198:              'Content-Length': String(audio.length),
src/app/api/brain/tts/route.ts:217:          audioBase64: `data:${mimeType};base64,${audio.toString('base64')}`,
src/app/api/brain/tts/route.ts:239:      error: `No tested ${capability} provider returned real audio.`,
src/app/api/brain/embeddings/route.ts:10: *   3. Gemini — gemini-embedding-exp-03-07 (one text at a time; batch handled in loop)
src/app/api/brain/embeddings/route.ts:42:    const openaiKey = await getVaultApiKey('openai');
src/app/api/brain/embeddings/route.ts:43:    if (openaiKey) {
src/app/api/brain/embeddings/route.ts:50:        const response = await fetch('https://api.openai.com/v1/embeddings', {
src/app/api/brain/embeddings/route.ts:53:            Authorization: `Bearer ${openaiKey}`,
src/app/api/brain/embeddings/route.ts:70:            provider: 'openai',
src/app/api/brain/embeddings/route.ts:142:    const geminiKey = await getVaultApiKey('gemini');
src/app/api/brain/embeddings/route.ts:143:    if (geminiKey) {
src/app/api/brain/embeddings/route.ts:144:      const GEMINI_EMBED_MODEL = 'gemini-embedding-exp-03-07';
src/app/api/brain/embeddings/route.ts:152:              `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(geminiKey)}`,
src/app/api/brain/embeddings/route.ts:187:            provider: 'gemini',
src/app/api/brain/embeddings/route.ts:205:          'Supported: OpenAI (text-embedding-3-small), Qwen/DashScope (text-embedding-v3), Gemini (gemini-embedding-exp-03-07).',
src/app/api/brain/embeddings/route.ts:206:        providers_checked: ['openai', 'qwen', 'gemini'],
