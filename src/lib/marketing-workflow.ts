/**
 * @module marketing-workflow
 * @description Autonomous Marketing Workflow for the AmarktAI Network.
 *
 * End-to-end flow:
 *   1. Scrape website (in-house scraper — no Firecrawl)
 *   2. Extract brand identity from scraped content
 *   3. Save brand identity to Brand Memory
 *   4. Ingest website content into RAG (HF embeddings + Qdrant)
 *   5. Retrieve RAG context for campaign planning
 *   6. Use Marketing Agent to create a campaign plan
 *   7. Generate content asset requests through central capability routing
 *   8. Return campaign output with assets, metadata, cost/budget, and learning signals
 *
 * Platform rule:
 *   - App cannot choose provider or model — runtime decides all routing
 *   - All asset generation goes through canonical runtime execution only
 *   - No direct provider API calls
 *   - No Firecrawl — in-house scraper only
 *
 * Server-side only.
 */

import { crawlWebsite } from '@/lib/scraper'
import { brandMemoryEngine } from '@/lib/brand-memory'
import { ingestWebsite, queryRAG } from '@/lib/rag-capability'
import { runAgent, type AgentConfig } from '@/lib/agent-system'
import { recordExecutionSignal, type ExecutionSignal } from '@/lib/learning-engine'
import { executeCapability, type CapabilityRequest } from '@/lib/runtime-execution'
import {
  createCampaign,
  updateCampaignStatus,
  createCampaignItem,
  createGeneratedAsset,
  type StoredCampaign,
  type StoredCampaignItem,
} from '@/lib/campaign-storage'

// ── Input ──────────────────────────────────────────────────────────────────────

export type ContentType =
  | 'social_post'
  | 'image'
  | 'short_video'
  | 'reel'
  | 'caption'
  | 'script'
  | 'music'
  | 'voiceover'
  | 'avatar_presenter'

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube_shorts'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'pinterest'
  | 'generic'

export interface MarketingWorkflowInput {
  websiteUrl: string
  workspaceId?: string
  appSlug: string
  brandId?: string
  campaignGoal: string
  targetAudience?: string
  platforms: SocialPlatform[]
  budgetTier: 'cheap' | 'balanced' | 'premium'
  qualityTier: 'basic' | 'standard' | 'high' | 'premium'
  contentTypes: ContentType[]
  durationDays?: number
  approvalMode?: 'auto' | 'manual_review'
  hfApiKey?: string
}

// ── Output ─────────────────────────────────────────────────────────────────────

export interface ExtractedBrandIdentity {
  brandName: string
  businessCategory: string
  productsServices: string[]
  targetAudience: string
  toneOfVoice: string
  visualStyle: string
  colors: string[]
  valueProposition: string
  offers: string[]
  faqs: string[]
  contentThemes: string[]
  complianceNotes: string[]
  sourceUrls: string[]
}

export interface CampaignItem {
  itemId: string
  platform: SocialPlatform
  contentType: ContentType
  caption: string
  hashtags: string[]
  prompt: string
  script?: string
  musicDirection?: string
  voiceInstructions?: string
  avatarInstructions?: string
  assetJobId?: string
  assetUrl?: string
  assetStatus: 'pending' | 'generated' | 'failed' | 'skipped'
  error?: string
}

export interface MarketingWorkflowResult {
  success: boolean
  workflowId: string
  appSlug: string
  websiteUrl: string

  // Phase results
  scrapeSuccess: boolean
  brandExtracted: boolean
  ragIngested: boolean
  campaignPlanned: boolean

  // Brand
  brandIdentity?: ExtractedBrandIdentity
  brandId?: string

  // Persisted campaign IDs
  persistedCampaignId?: string
  persistedItemIds: string[]
  persistedAssetIds: string[]

  // Campaign
  campaignName?: string
  campaignGoal: string
  platforms: SocialPlatform[]
  contentCalendar: CampaignItem[]

  // Assets
  assetsRequested: number
  assetsGenerated: number
  assetsFailed: number

  // Budget/cost
  budgetTier: 'cheap' | 'balanced' | 'premium'
  estimatedCostUsd?: number

  // Status
  partialSuccess: boolean
  warnings: string[]
  errors: string[]
  approvalMode: 'auto' | 'manual_review'

  // Timing
  durationMs: number
  startedAt: string
  completedAt: string
}

// ── Brand identity extraction from scraped content ────────────────────────────

/**
 * Extract structured brand identity from scraped page content.
 * Uses the research capability through the central router.
 * App cannot choose provider — runtime decides.
 */
async function extractBrandIdentity(
  appSlug: string,
  scrapedText: string,
  sourceUrls: string[],
  budgetTier: 'cheap' | 'balanced' | 'premium',
  qualityTier: string,
): Promise<ExtractedBrandIdentity | null> {
  const prompt = `Analyze the following website content and extract a structured brand identity profile.

Website content:
${scrapedText.slice(0, 6000)}

Extract and return a JSON object with these exact fields:
{
  "brandName": "string",
  "businessCategory": "string",
  "productsServices": ["array of products/services"],
  "targetAudience": "string description",
  "toneOfVoice": "string (e.g. professional, friendly, bold)",
  "visualStyle": "string (e.g. minimalist, vibrant, corporate)",
  "colors": ["hex or color names if mentioned"],
  "valueProposition": "string",
  "offers": ["promotions, deals, or key offers mentioned"],
  "faqs": ["common questions or topics from the site"],
  "contentThemes": ["key themes for social media content"],
  "complianceNotes": ["regulatory or legal claims to be careful about"]
}

Return ONLY the JSON object, no other text.`

  const req: CapabilityRequest = {
    input: prompt,
    capability: 'research',
    appId: appSlug,
    metadata: { budget: budgetTier, quality: qualityTier, task: 'brand_extraction' },
  }

  const result = await executeCapability(req)
  if (!result.success || !result.output) return null

  try {
    // Extract JSON from output
    const jsonMatch = result.output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractedBrandIdentity>
    return {
      brandName: parsed.brandName ?? '',
      businessCategory: parsed.businessCategory ?? '',
      productsServices: parsed.productsServices ?? [],
      targetAudience: parsed.targetAudience ?? '',
      toneOfVoice: parsed.toneOfVoice ?? 'professional',
      visualStyle: parsed.visualStyle ?? 'modern',
      colors: parsed.colors ?? [],
      valueProposition: parsed.valueProposition ?? '',
      offers: parsed.offers ?? [],
      faqs: parsed.faqs ?? [],
      contentThemes: parsed.contentThemes ?? [],
      complianceNotes: parsed.complianceNotes ?? [],
      sourceUrls,
    }
  } catch {
    return null
  }
}

// ── Campaign planning ─────────────────────────────────────────────────────────

interface RawCampaignPlan {
  campaignName: string
  items: Array<{
    platform: string
    contentType: string
    caption: string
    hashtags: string[]
    prompt: string
    script?: string
    musicDirection?: string
    voiceInstructions?: string
    avatarInstructions?: string
  }>
}

/**
 * Parse campaign plan from agent output.
 */
function parseCampaignPlan(agentOutput: string, platforms: SocialPlatform[], contentTypes: ContentType[]): RawCampaignPlan {
  // Try JSON parse first
  const jsonMatch = agentOutput.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<RawCampaignPlan>
      if (parsed.campaignName && Array.isArray(parsed.items)) {
        return { campaignName: parsed.campaignName, items: parsed.items }
      }
    } catch {
      // fall through to text parsing
    }
  }

  // Fallback: create a basic plan from the text output
  const campaignName = agentOutput.match(/campaign\s*name[:\s]+([^\n]+)/i)?.[1]?.trim() ?? 'Autonomous Campaign'
  const items: RawCampaignPlan['items'] = []

  for (const platform of platforms.slice(0, 3)) {
    for (const contentType of contentTypes.slice(0, 2)) {
      items.push({
        platform,
        contentType,
        caption: agentOutput.slice(0, 200).replace(/\n/g, ' '),
        hashtags: ['#marketing', `#${platform}`, '#campaign'],
        prompt: `${contentType} for ${platform}: ${agentOutput.slice(0, 100)}`,
      })
    }
  }

  return { campaignName, items }
}

// ── Asset generation via canonical runtime execution ──────────────────────────

const CONTENT_TYPE_CAPABILITY: Partial<Record<ContentType, string>> = {
  image: 'image_generation',
  short_video: 'video_generation',
  reel: 'video_generation',
  social_post: 'chat',
  caption: 'chat',
  script: 'chat',
  music: 'music_generation',
  voiceover: 'tts',
  avatar_presenter: 'avatar_generation',
}

/**
 * Generate a single campaign asset through canonical runtime execution.
 * App cannot choose provider — routing is fully managed by the runtime.
 */
async function generateCampaignAsset(
  item: RawCampaignPlan['items'][number],
  appSlug: string,
  budgetTier: string,
  qualityTier: string,
  brandContext: string,
): Promise<{ assetUrl: string | null; assetJobId: string | null; provider: string | null; model: string | null; error: string | null }> {
  const capability = CONTENT_TYPE_CAPABILITY[item.contentType as ContentType] ?? 'chat'
  const enrichedPrompt = `${brandContext ? `Brand context: ${brandContext}\n\n` : ''}${item.prompt}`

  const req: CapabilityRequest = {
    input: enrichedPrompt,
    capability,
    appId: appSlug,
    saveArtifact: true,
    metadata: {
      budget: budgetTier,
      quality: qualityTier,
      platform: item.platform,
      contentType: item.contentType,
      caption: item.caption,
      hashtags: item.hashtags,
    },
  }

  const result = await executeCapability(req)

  return {
    assetUrl: result.output,
    assetJobId: result.jobId ?? null,
    provider: result.provider,
    model: result.model,
    error: result.error ?? (result.success ? null : 'Asset generation failed'),
  }
}

// ── Learning signal helper ────────────────────────────────────────────────────

async function logSignal(
  appSlug: string,
  capability: string,
  provider: string,
  model: string,
  success: boolean,
  latencyMs: number,
  extra?: Partial<ExecutionSignal>,
): Promise<void> {
  await recordExecutionSignal({
    appSlug,
    capability,
    providerKey: provider,
    model,
    success,
    latencyMs,
    fallbackUsed: false,
    ...extra,
  }).catch(() => { /* learning failure is non-fatal */ })
}

// ── Main workflow ──────────────────────────────────────────────────────────────

/**
 * Run the autonomous marketing workflow end-to-end.
 *
 * Returns a complete MarketingWorkflowResult including campaign plan,
 * asset generation status, brand identity, learning signals, and
 * honest partial-failure reporting.
 */
export async function runMarketingWorkflow(
  input: MarketingWorkflowInput,
): Promise<MarketingWorkflowResult> {
  const workflowId = `mktflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const startedAt = new Date()
  const warnings: string[] = []
  const errors: string[] = []

  const result: MarketingWorkflowResult = {
    success: false,
    workflowId,
    appSlug: input.appSlug,
    websiteUrl: input.websiteUrl,
    scrapeSuccess: false,
    brandExtracted: false,
    ragIngested: false,
    campaignPlanned: false,
    persistedCampaignId: undefined,
    persistedItemIds: [],
    persistedAssetIds: [],
    campaignGoal: input.campaignGoal,
    platforms: input.platforms,
    contentCalendar: [],
    assetsRequested: 0,
    assetsGenerated: 0,
    assetsFailed: 0,
    budgetTier: input.budgetTier,
    partialSuccess: false,
    warnings,
    errors,
    approvalMode: input.approvalMode ?? 'auto',
    durationMs: 0,
    startedAt: startedAt.toISOString(),
    completedAt: '',
  }

  // ── Phase 1: Scrape website ─────────────────────────────────────────────────
  const scrapeStart = Date.now()
  const crawl = await crawlWebsite(input.websiteUrl, {
    maxPages: 8,
    maxDepth: 2,
    timeoutMs: 20_000,
  })
  const scrapeLatency = Date.now() - scrapeStart

  await logSignal(input.appSlug, 'scrape_website', 'scraper', 'in-house', crawl.success, scrapeLatency)

  if (!crawl.success || crawl.pages.length === 0) {
    errors.push(`Website scrape failed: ${crawl.error ?? 'No pages returned'}`)
    result.completedAt = new Date().toISOString()
    result.durationMs = Date.now() - startedAt.getTime()
    return result
  }

  result.scrapeSuccess = true
  const allText = crawl.pages.map(p => [p.title, p.description, p.headings.join(' '), p.bodyText].join('\n')).join('\n\n')
  const sourceUrls = crawl.pages.map(p => p.url)

  // ── Phase 2: Extract brand identity ────────────────────────────────────────
  const brandStart = Date.now()
  const brandIdentity = await extractBrandIdentity(
    input.appSlug, allText, sourceUrls, input.budgetTier, input.qualityTier,
  )
  const brandLatency = Date.now() - brandStart

  await logSignal(input.appSlug, 'brand_extraction', 'runtime', 'auto', !!brandIdentity, brandLatency, { agentType: 'marketing' })

  if (!brandIdentity) {
    warnings.push('Brand identity extraction failed — campaign will proceed with limited brand context')
  } else {
    result.brandExtracted = true
    result.brandIdentity = brandIdentity
  }

  // ── Phase 3: Save brand identity to Brand Memory ────────────────────────────
  let savedBrandId = input.brandId
  if (brandIdentity) {
    try {
      const brandRecord = await brandMemoryEngine.create(input.appSlug, {
        brandName: brandIdentity.brandName || new URL(input.websiteUrl).hostname,
        description: brandIdentity.valueProposition,
        audience: brandIdentity.targetAudience,
        voice: brandIdentity.toneOfVoice,
        tone: brandIdentity.toneOfVoice,
        visualStyle: brandIdentity.visualStyle,
        colors: {
          primary: brandIdentity.colors[0] ?? '',
          secondary: brandIdentity.colors[1] ?? '',
          accent: brandIdentity.colors[2] ?? '',
          background: '',
          text: '',
        },
        rules: {
          dos: brandIdentity.contentThemes.map(t => `Create content about: ${t}`),
          donts: brandIdentity.complianceNotes,
          contentGuidelines: [],
          toneGuidelines: [`Tone: ${brandIdentity.toneOfVoice}`],
        },
        products: brandIdentity.productsServices,
        services: [],
        campaignMemory: [],
        referenceMaterial: sourceUrls,
        assetsMetadata: [],
        generatedContentRefs: [],
      })
      savedBrandId = brandRecord.id
      result.brandId = savedBrandId
    } catch (err) {
      warnings.push(`Brand Memory save failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Phase 4: Ingest website content into RAG ───────────────────────────────
  const ragStart = Date.now()
  let ragSuccess = false
  if (input.hfApiKey) {
    try {
      const ragResults = await ingestWebsite(input.websiteUrl, {
        appSlug: input.appSlug,
        scope: 'app',
        scopeId: savedBrandId,
        hfApiKey: input.hfApiKey,
        maxPages: 6,
        maxDepth: 2,
      })
      ragSuccess = ragResults.some(r => r.success)
      if (!ragSuccess) {
        warnings.push(`RAG ingestion failed: ${ragResults[0]?.error ?? 'unknown error'}`)
      }
    } catch (err) {
      warnings.push(`RAG ingestion error: ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    warnings.push('RAG ingestion skipped — no HF API key provided')
  }
  const ragLatency = Date.now() - ragStart

  await logSignal(input.appSlug, 'rag_ingestion', 'huggingface', 'sentence-transformers/all-MiniLM-L6-v2', ragSuccess, ragLatency)
  result.ragIngested = ragSuccess

  // ── Phase 5: Retrieve RAG context for campaign planning ──────────────────
  let ragContext = ''
  if (ragSuccess && input.hfApiKey) {
    const ragQuery = await queryRAG(input.campaignGoal, {
      appSlug: input.appSlug,
      hfApiKey: input.hfApiKey,
      limit: 5,
    })
    if (ragQuery.success && ragQuery.context) ragContext = ragQuery.context
  }

  // ── Phase 6: Marketing Agent — Campaign Planning ─────────────────────────
  const agentStart = Date.now()
  const brandSummary = brandIdentity
    ? `Brand: ${brandIdentity.brandName}. Category: ${brandIdentity.businessCategory}. Tone: ${brandIdentity.toneOfVoice}. Audience: ${brandIdentity.targetAudience}. Products: ${brandIdentity.productsServices.slice(0, 3).join(', ')}. Value: ${brandIdentity.valueProposition}`
    : `Website: ${input.websiteUrl}`

  const campaignPrompt = `Create a detailed social media marketing campaign plan.

Brand context:
${brandSummary}

${ragContext ? `Additional knowledge:\n${ragContext}\n` : ''}
Campaign goal: ${input.campaignGoal}
Target audience: ${input.targetAudience ?? brandIdentity?.targetAudience ?? 'general audience'}
Platforms: ${input.platforms.join(', ')}
Content types needed: ${input.contentTypes.join(', ')}
Campaign duration: ${input.durationDays ?? 7} days

Return a JSON object with:
{
  "campaignName": "string",
  "items": [
    {
      "platform": "platform_name",
      "contentType": "content_type",
      "caption": "post caption text",
      "hashtags": ["#tag1", "#tag2"],
      "prompt": "detailed prompt for generating the asset",
      "script": "optional script for video/audio content",
      "musicDirection": "optional music direction",
      "voiceInstructions": "optional voice/TTS instructions",
      "avatarInstructions": "optional avatar presenter notes"
    }
  ]
}

Create ${Math.min(input.platforms.length * input.contentTypes.length, 6)} items covering the platforms and content types.`

  const agentConfig: AgentConfig = {
    agentType: 'marketing',
    agentId: `mkt_agent_${workflowId}`,
    appSlug: input.appSlug,
    brandId: savedBrandId,
    allowedCapabilities: ['chat', 'research'],
    budget: input.budgetTier,
    quality: input.qualityTier,
    hfApiKey: input.hfApiKey,
  }

  const agentTask = await runAgent(agentConfig, {
    type: 'marketing',
    input: { task: 'campaign_brief', prompt: campaignPrompt },
  })
  const agentLatency = Date.now() - agentStart

  await logSignal(input.appSlug, 'agent_planning', agentTask.steps[0]?.provider ?? 'runtime', agentTask.steps[0]?.model ?? 'auto', agentTask.status === 'completed', agentLatency, { agentType: 'marketing' })

  if (agentTask.status !== 'completed' || !agentTask.output) {
    warnings.push(`Campaign planning degraded: ${agentTask.error ?? 'agent returned no output'}`)
    result.campaignName = 'Autonomous Campaign'
  } else {
    result.campaignPlanned = true
  }

  const rawPlan = parseCampaignPlan(
    agentTask.output ?? `Campaign for ${input.campaignGoal}`,
    input.platforms,
    input.contentTypes,
  )
  result.campaignName = rawPlan.campaignName

  // ── Phase 6b: Persist campaign record ─────────────────────────────────────
  let persistedCampaign: StoredCampaign | null = null
  try {
    persistedCampaign = await createCampaign({
      appSlug: input.appSlug,
      workspaceId: input.workspaceId,
      brandId: savedBrandId,
      name: rawPlan.campaignName,
      goal: input.campaignGoal,
      targetAudience: input.targetAudience,
      platforms: input.platforms,
      contentTypes: input.contentTypes,
      budgetTier: input.budgetTier,
      qualityTier: input.qualityTier,
      approvalMode: input.approvalMode ?? 'auto',
      durationDays: input.durationDays,
      websiteUrl: input.websiteUrl,
      workflowId,
    })
    result.persistedCampaignId = persistedCampaign.id
    await recordExecutionSignal({ appSlug: input.appSlug, capability: 'campaign_create', providerKey: 'runtime', model: 'multi', success: true, latencyMs: 0, fallbackUsed: false, agentType: 'marketing' }).catch(() => {})
  } catch (err) {
    warnings.push(`Campaign persistence failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Phase 7: Asset generation through canonical runtime execution ────────
  const brandContextShort = brandSummary.slice(0, 300)
  const campaignItems: CampaignItem[] = []

  for (let i = 0; i < rawPlan.items.length; i++) {
    const item = rawPlan.items[i]!
    const itemId = `item_${i}_${Date.now().toString(36)}`
    result.assetsRequested++

    // Persist campaign item record
    let persistedItem: StoredCampaignItem | null = null
    if (persistedCampaign) {
      try {
        persistedItem = await createCampaignItem({
          campaignId: persistedCampaign.id,
          platform: item.platform,
          contentType: item.contentType,
          caption: item.caption,
          script: item.script ?? '',
          hashtags: item.hashtags,
          promptSummary: item.prompt.slice(0, 500),
          metadata: { musicDirection: item.musicDirection, voiceInstructions: item.voiceInstructions, avatarInstructions: item.avatarInstructions },
        })
        result.persistedItemIds.push(persistedItem.id)
      } catch (err) {
        warnings.push(`Campaign item persistence failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const assetStart = Date.now()
    const assetResult = await generateCampaignAsset(item, input.appSlug, input.budgetTier, input.qualityTier, brandContextShort)
    const assetLatency = Date.now() - assetStart

    await logSignal(
      input.appSlug,
      CONTENT_TYPE_CAPABILITY[item.contentType as ContentType] ?? 'chat',
      assetResult.provider ?? 'runtime',
      assetResult.model ?? 'auto',
      !assetResult.error,
      assetLatency,
    )

    // Persist generated asset record (success or failure)
    if (persistedCampaign) {
      const assetType = ['image', 'avatar_presenter'].includes(item.contentType) ? 'image'
        : ['short_video', 'reel'].includes(item.contentType) ? 'video'
        : item.contentType === 'music' ? 'audio'
        : item.contentType === 'voiceover' ? 'audio' : 'text'

      try {
        const persistedAsset = await createGeneratedAsset({
          appSlug: input.appSlug,
          workspaceId: input.workspaceId,
          brandId: savedBrandId,
          campaignId: persistedCampaign.id,
          campaignItemId: persistedItem?.id,
          assetType,
          capability: CONTENT_TYPE_CAPABILITY[item.contentType as ContentType] ?? 'chat',
          runtimeSelectedProvider: assetResult.provider ?? '',
          runtimeSelectedModel: assetResult.model ?? '',
          fallbackUsed: false,
          promptSummary: item.prompt.slice(0, 500),
          sourceInputs: { platform: item.platform, contentType: item.contentType, brandContext: brandContextShort.slice(0, 200) },
          resultUrl: assetResult.assetUrl ?? undefined,
          latencyMs: assetLatency,
          error: assetResult.error ?? undefined,
          metadata: { assetJobId: assetResult.assetJobId, caption: item.caption, hashtags: item.hashtags },
        })
        result.persistedAssetIds.push(persistedAsset.id)
        await recordExecutionSignal({ appSlug: input.appSlug, capability: 'asset_generate', providerKey: assetResult.provider ?? 'runtime', model: assetResult.model ?? 'auto', success: !assetResult.error, latencyMs: assetLatency, fallbackUsed: false, agentType: 'marketing' }).catch(() => {})
      } catch (err) {
        warnings.push(`Asset persistence failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (assetResult.error) {
      result.assetsFailed++
      campaignItems.push({
        itemId: persistedItem?.id ?? itemId,
        platform: item.platform as SocialPlatform,
        contentType: item.contentType as ContentType,
        caption: item.caption,
        hashtags: item.hashtags,
        prompt: item.prompt,
        script: item.script,
        musicDirection: item.musicDirection,
        voiceInstructions: item.voiceInstructions,
        avatarInstructions: item.avatarInstructions,
        assetStatus: 'failed',
        error: assetResult.error,
      })
    } else {
      result.assetsGenerated++
      campaignItems.push({
        itemId: persistedItem?.id ?? itemId,
        platform: item.platform as SocialPlatform,
        contentType: item.contentType as ContentType,
        caption: item.caption,
        hashtags: item.hashtags,
        prompt: item.prompt,
        script: item.script,
        musicDirection: item.musicDirection,
        voiceInstructions: item.voiceInstructions,
        avatarInstructions: item.avatarInstructions,
        assetJobId: assetResult.assetJobId ?? undefined,
        assetUrl: assetResult.assetUrl ?? undefined,
        assetStatus: assetResult.assetJobId ? 'pending' : 'generated',
      })
    }
  }

  result.contentCalendar = campaignItems

  // ── Finalize campaign status ──────────────────────────────────────────────
  const completedAt = new Date()
  result.completedAt = completedAt.toISOString()
  result.durationMs = completedAt.getTime() - startedAt.getTime()

  result.success = result.scrapeSuccess && result.campaignPlanned
  result.partialSuccess = (result.scrapeSuccess && !result.campaignPlanned) ||
    (result.assetsRequested > 0 && result.assetsFailed > 0 && result.assetsGenerated > 0)

  if (persistedCampaign) {
    const finalStatus = result.success
      ? (result.partialSuccess ? 'partial_failure' : 'active')
      : 'failed'
    await updateCampaignStatus(persistedCampaign.id, finalStatus).catch(() => {})
  }

  // Record final workflow signal
  await recordExecutionSignal({
    appSlug: input.appSlug,
    capability: 'marketing_workflow',
    providerKey: 'runtime',
    model: 'multi',
    success: result.success,
    latencyMs: result.durationMs,
    fallbackUsed: result.partialSuccess,
    agentType: 'marketing',
    taskId: workflowId,
  }).catch(() => { /* non-fatal */ })

  return result
}

// ── Type re-exports ────────────────────────────────────────────────────────────
export type { AgentConfig }
