import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAgentDefinitions, getAgentStatus } from '@/lib/agent-runtime'
import { auditAllAgents } from '@/lib/agent-audit'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  listRecords,
  appendRecord,
  writeJsonFile,
  checkWritable,
  LOCAL_STORE_FILES,
} from '@/lib/local-json-store'

interface LocalAgent {
  id: string
  type: string
  name: string
  description: string
  status: string
  source: string
  capabilities: string[]
  defaultProvider: string
  createdAt: string
  updatedAt: string
}

const STARTER_AGENTS: Omit<LocalAgent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { type: 'amarktai-assistant-operator', name: 'AmarktAI Assistant Operator', description: 'Core platform operator agent — orchestrates all admin actions.', status: 'ready', source: 'starter_local', capabilities: ['chat', 'orchestration', 'routing'], defaultProvider: 'genx' },
  { type: 'repo-builder', name: 'Repo Builder', description: 'Builds and scaffolds repositories using AI-driven code generation.', status: 'ready', source: 'starter_local', capabilities: ['coding', 'git', 'scaffolding'], defaultProvider: 'genx' },
  { type: 'repo-auditor', name: 'Repo Auditor', description: 'Audits repositories for security, quality, and compliance.', status: 'ready', source: 'starter_local', capabilities: ['audit', 'security', 'code-review'], defaultProvider: 'genx' },
  { type: 'frontend-designer', name: 'Frontend Designer', description: 'Designs and implements UI/UX using AI-driven components.', status: 'ready', source: 'starter_local', capabilities: ['ui', 'design', 'coding'], defaultProvider: 'genx' },
  { type: 'backend-wiring-agent', name: 'Backend Wiring Agent', description: 'Wires backend APIs, routes, and data layers.', status: 'ready', source: 'starter_local', capabilities: ['coding', 'api', 'database'], defaultProvider: 'genx' },
  { type: 'researcher-agent', name: 'Researcher Agent', description: 'Researches URLs, topics, and opportunities using Firecrawl or manual scraping.', status: 'ready', source: 'starter_local', capabilities: ['research', 'scraping', 'summarization'], defaultProvider: 'genx' },
  { type: 'app-discovery-agent', name: 'App Discovery Agent', description: 'Discovers and profiles new app opportunities and market niches.', status: 'ready', source: 'starter_local', capabilities: ['research', 'analysis', 'strategy'], defaultProvider: 'genx' },
  { type: 'marketing-agent', name: 'Marketing Agent', description: 'Creates marketing content, campaigns, and analytics reports.', status: 'ready', source: 'starter_local', capabilities: ['content', 'marketing', 'analytics'], defaultProvider: 'genx' },
  { type: 'scraper-agent', name: 'Scraper Agent', description: 'Scrapes web pages and extracts structured data.', status: 'ready', source: 'starter_local', capabilities: ['scraping', 'extraction', 'parsing'], defaultProvider: 'genx' },
  { type: 'media-agent', name: 'Media Agent', description: 'Generates and manages images, audio, and video artifacts.', status: 'ready', source: 'starter_local', capabilities: ['image', 'audio', 'video'], defaultProvider: 'genx' },
  { type: 'voice-agent', name: 'Voice Agent', description: 'Handles voice synthesis, recognition, and persona management.', status: 'ready', source: 'starter_local', capabilities: ['tts', 'stt', 'voice-persona'], defaultProvider: 'genx' },
  { type: 'memory-emotion-agent', name: 'Memory / Emotion Agent', description: 'Manages long-term memory, emotional profiles, and companion context.', status: 'ready', source: 'starter_local', capabilities: ['memory', 'emotion', 'profile'], defaultProvider: 'genx' },
  { type: 'adult-app-agent', name: 'Adult-App Agent', description: 'Specialist agent for adult-capable app interactions (content policy configurable).', status: 'ready', source: 'starter_local', capabilities: ['adult', 'companion', 'content'], defaultProvider: 'genx' },
  { type: 'diagnostics-agent', name: 'Diagnostics Agent', description: 'Runs system diagnostics, health checks, and readiness certification.', status: 'ready', source: 'starter_local', capabilities: ['diagnostics', 'health', 'monitoring'], defaultProvider: 'genx' },
  { type: 'deployment-agent', name: 'Deployment Agent', description: 'Manages VPS deployments, rollbacks, and infrastructure provisioning.', status: 'ready', source: 'starter_local', capabilities: ['deployment', 'vps', 'infrastructure'], defaultProvider: 'genx' },
  { type: 'crypto-agent', name: 'Crypto Agent', description: 'Monitors crypto markets, analyzes signals, and executes trading strategies.', status: 'ready', source: 'starter_local', capabilities: ['crypto', 'trading', 'analysis'], defaultProvider: 'genx' },
]

function seedStarterAgents(): LocalAgent[] {
  const now = new Date().toISOString()
  const existing = listRecords<LocalAgent>(LOCAL_STORE_FILES.agents)
  if (existing.length > 0) return existing

  const seeded: LocalAgent[] = []
  for (const agent of STARTER_AGENTS) {
    const record = appendRecord<Omit<LocalAgent, 'id'>>(LOCAL_STORE_FILES.agents, {
      ...agent,
      createdAt: now,
      updatedAt: now,
    })
    seeded.push(record as LocalAgent)
  }
  return seeded
}

/** GET /api/admin/agents — returns agent runtime status, definitions, and audit data.
 *  Optional: ?appSlug=xxx to include per-app assignment status. */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const definitions = getAgentDefinitions()
  const status = getAgentStatus()
  const audit = auditAllAgents()

  // Build agent list with audit readiness
  const auditMap = new Map(audit.agents.map(a => [a.agentType, a]))

  // Optionally load per-app assignment data
  const appSlug = request.nextUrl.searchParams.get('appSlug')
  let enabledForApp: string[] = []
  if (appSlug) {
    try {
      const profile = await prisma.appAiProfile.findUnique({
        where: { appSlug },
        select: { enabledAgents: true },
      })
      if (profile?.enabledAgents) {
        try { enabledForApp = JSON.parse(profile.enabledAgents as string) } catch { /* ignore */ }
      }
    } catch { /* DB unavailable */ }
  }

  const runtimeAgents = Array.from(definitions.entries()).map(([type, def]) => {
    const entry = auditMap.get(type)
    return {
      id: type,
      name: def.name,
      type,
      description: def.description,
      capabilities: def.capabilities,
      canHandoff: def.canHandoff,
      memoryEnabled: def.memoryEnabled,
      defaultProvider: def.defaultProvider ?? 'openai',
      defaultModel: def.defaultModel ?? '',
      readiness: entry?.readiness ?? 'NOT_CONNECTED',
      auditReasons: entry?.reasons ?? ['Audit not available'],
      providerHealth: entry?.providerHealth ?? 'unknown',
      providerCallable: entry?.providerCallable ?? false,
      providerRegistered: entry?.providerRegistered ?? false,
      modelExists: entry?.modelExists ?? false,
      enabledForApp: appSlug ? enabledForApp.includes(type) : undefined,
      source: 'runtime',
    }
  })

  // Also include local starter agents so dashboard has real records
  const localCheck = checkWritable(LOCAL_STORE_FILES.agents)
  let localAgents: LocalAgent[] = []
  if (localCheck.writable) {
    localAgents = seedStarterAgents()
  }

  // Merge: runtime definitions take priority, local starters fill in
  const runtimeTypes = new Set<string>(runtimeAgents.map((a) => a.type))
  const localOnly = localAgents.filter((a) => !runtimeTypes.has(a.type))

  return NextResponse.json({
    agents: [...runtimeAgents, ...localOnly],
    status,
    audit: audit.summary,
    enabledForApp,
    localAgents: localAgents.length,
    driver: localCheck.writable ? 'runtime+local' : 'runtime',
  })
}

const assignSchema = z.object({
  appSlug: z.string().min(1),
  /** Agent types to enable for this app — replaces the full list. Pass [] to clear. */
  agentTypes: z.array(z.string()),
})

/** POST /api/admin/agents — assign agents to an app, or create a local agent record.
 *  Body: { appSlug, agentTypes: string[] } or { name, type, ... } */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: Record<string, unknown>
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 422 })
  }

  // If it's an assignment request
  if ('agentTypes' in rawBody) {
    let body: z.infer<typeof assignSchema>
    try {
      body = assignSchema.parse(rawBody)
    } catch (err) {
      return NextResponse.json({ error: err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request' }, { status: 422 })
    }

    // Try DB first
    try {
      const updated = await prisma.appAiProfile.upsert({
        where: { appSlug: body.appSlug },
        create: {
          appSlug: body.appSlug,
          appName: body.appSlug,
          enabledAgents: JSON.stringify(body.agentTypes),
        },
        update: {
          enabledAgents: JSON.stringify(body.agentTypes),
        },
        select: { appSlug: true, enabledAgents: true },
      })
      return NextResponse.json({
        appSlug: updated.appSlug,
        enabledAgents: JSON.parse(updated.enabledAgents as string),
        updatedAt: new Date().toISOString(),
        driver: 'db',
      })
    } catch { /* Fall through to local */ }

    // Local fallback — store assignment in local agent records
    const now = new Date().toISOString()
    const existing = listRecords<LocalAgent>(LOCAL_STORE_FILES.agents)
    for (const a of existing) {
      if (body.agentTypes.includes(a.type)) {
        const idx = existing.findIndex((e) => e.id === a.id)
        existing[idx] = { ...a, updatedAt: now }
      }
    }
    writeJsonFile(LOCAL_STORE_FILES.agents, existing)
    return NextResponse.json({
      appSlug: body.appSlug,
      enabledAgents: body.agentTypes,
      updatedAt: now,
      driver: 'local_vps',
    })
  }

  // Create/update a local agent record
  const { name, type, description, capabilities, defaultProvider } = rawBody as {
    name?: string
    type?: string
    description?: string
    capabilities?: string[]
    defaultProvider?: string
  }

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const now = new Date().toISOString()
  const agentType = type ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const existing = listRecords<LocalAgent>(LOCAL_STORE_FILES.agents)
  const idx = existing.findIndex((a) => a.type === agentType)

  if (idx >= 0) {
    const updated = { ...existing[idx], name, description: description ?? existing[idx].description, updatedAt: now }
    existing[idx] = updated
    writeJsonFile(LOCAL_STORE_FILES.agents, existing)
    return NextResponse.json({ agent: updated, driver: 'local_vps' }, { status: 200 })
  }

  const newAgent = appendRecord<Omit<LocalAgent, 'id'>>(LOCAL_STORE_FILES.agents, {
    type: agentType,
    name,
    description: description ?? '',
    status: 'ready',
    source: 'user_created',
    capabilities: capabilities ?? [],
    defaultProvider: defaultProvider ?? 'genx',
    createdAt: now,
    updatedAt: now,
  })
  return NextResponse.json({ agent: newAgent, driver: 'local_vps' }, { status: 201 })
}

