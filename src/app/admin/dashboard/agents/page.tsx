'use client'

import { useEffect, useState } from 'react'
import {
  Bot,
  Cpu,
  Eye,
  Flame,
  GitBranch,
  Heart,
  Layers,
  Megaphone,
  Mic,
  Search,
  Server,
  Shield,
  Users,
  Video,
  Wrench,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = 'Active' | 'Ready to wire' | 'Backend pending' | 'Needs key' | 'Planned'
type AgentCategory = 'Core' | 'Code' | 'Research' | 'Creative' | 'Operations' | 'App-specific'

interface AgentDef {
  id: string
  name: string
  description: string
  capabilities: string[]
  status: AgentStatus
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  route?: string
  category: AgentCategory
}

// ── Category groups ───────────────────────────────────────────────────────────

const CATEGORY_ORDER: AgentCategory[] = ['Core', 'Code', 'Research', 'Creative', 'Operations', 'App-specific']

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  {
    id: 'aiva-operator',
    name: 'AmarktAI Assistant Operator',
    description: 'Primary orchestrator. Routes tasks to the correct specialist agent, manages context, and enforces approval gates.',
    capabilities: ['orchestration', 'routing', 'approval gating', 'memory context'],
    status: 'Ready to wire',
    icon: Bot,
    route: '/admin/dashboard/amarktai-assistant',
    category: 'Core',
  },
  {
    id: 'repo-builder',
    name: 'Repo Builder Agent',
    description: 'Generates patches, diffs, and full feature implementations against a connected GitHub repository.',
    capabilities: ['code generation', 'patch creation', 'diff review', 'PR creation'],
    status: 'Ready to wire',
    icon: GitBranch,
    route: '/admin/dashboard/repo-workbench',
    category: 'Code',
  },
  {
    id: 'repo-auditor',
    name: 'Repo Auditor Agent',
    description: 'Audits codebases for security issues, outdated dependencies, missing tests, and code quality problems.',
    capabilities: ['code audit', 'security scan', 'dependency check', 'test coverage'],
    status: 'Ready to wire',
    icon: Eye,
    route: '/admin/dashboard/repo-workbench',
    category: 'Code',
  },
  {
    id: 'frontend-designer',
    name: 'Frontend Designer Agent',
    description: 'Generates UI components, pages, and design systems from descriptions or wireframes.',
    capabilities: ['UI generation', 'component design', 'Tailwind CSS', 'responsive layout'],
    status: 'Ready to wire',
    icon: Layers,
    route: '/admin/dashboard/repo-workbench',
    category: 'Code',
  },
  {
    id: 'backend-wiring',
    name: 'Backend Wiring Agent',
    description: 'Connects frontend shells to real API routes, databases, and provider endpoints.',
    capabilities: ['API wiring', 'route creation', 'database integration', 'provider connection'],
    status: 'Ready to wire',
    icon: Server,
    route: '/admin/dashboard/repo-workbench',
    category: 'Code',
  },
  {
    id: 'researcher',
    name: 'Researcher Agent',
    description: 'Researches new AI tools, providers, frameworks, and market opportunities. Creates structured reports and product plans.',
    capabilities: ['web research', 'tool discovery', 'market analysis', 'product planning'],
    status: 'Ready to wire',
    icon: Search,
    route: '/admin/dashboard/research',
    category: 'Research',
  },
  {
    id: 'app-discovery',
    name: 'Competitor / App Discovery Agent',
    description: 'Discovers competitor apps and opportunities. Analyses web properties, creates improved alternative plans, and routes to Repo Workbench.',
    capabilities: ['app discovery', 'competitor analysis', 'opportunity alerting', 'product package creation'],
    status: 'Ready to wire',
    icon: Eye,
    route: '/admin/dashboard/research',
    category: 'Research',
  },
  {
    id: 'crypto',
    name: 'Crypto Agent',
    description: 'Monitors crypto markets, executes trading strategies, manages portfolio actions, and feeds signals to the Crypto Trading App.',
    capabilities: ['market monitoring', 'trading signals', 'portfolio management', 'strategy execution'],
    status: 'Backend pending',
    icon: Cpu,
    category: 'App-specific',
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    description: 'Creates copy, landing pages, social content, email sequences, and growth campaigns for apps.',
    capabilities: ['copy generation', 'landing pages', 'social content', 'email campaigns'],
    status: 'Backend pending',
    icon: Megaphone,
    category: 'Operations',
  },
  {
    id: 'scraper',
    name: 'Scraper Agent',
    description: 'Crawls websites, extracts structured data, stores scraped pages, and feeds the research pipeline.',
    capabilities: ['web scraping', 'structured extraction', 'Firecrawl', 'artifact storage'],
    status: 'Needs key',
    icon: Flame,
    route: '/admin/dashboard/research',
    category: 'Research',
  },
  {
    id: 'media',
    name: 'Media Agent',
    description: 'Generates images, video, music, talking avatars, and assembled media through the approved provider stack.',
    capabilities: ['image generation', 'video generation', 'music generation', 'avatar creation'],
    status: 'Ready to wire',
    icon: Video,
    route: '/admin/dashboard/creative-studio',
    category: 'Creative',
  },
  {
    id: 'voice',
    name: 'Voice Agent',
    description: 'Handles text-to-speech, speech-to-text, voice persona management, and real-time voice sessions.',
    capabilities: ['TTS', 'STT', 'voice persona', 'voice session management'],
    status: 'Ready to wire',
    icon: Mic,
    category: 'Creative',
  },
  {
    id: 'memory-emotion',
    name: 'Memory / Emotion Agent',
    description: 'Manages user memory, emotional profiles, app-specific preferences, and conversation history summaries.',
    capabilities: ['memory storage', 'emotion tracking', 'preference learning', 'conversation summaries'],
    status: 'Backend pending',
    icon: Heart,
    route: '/admin/dashboard/memory',
    category: 'Core',
  },
  {
    id: 'adult-app',
    name: 'Adult-App Agent',
    description: 'Routes adult content through the approved specialist provider stack with approval gates, age gate enforcement, and audit logging.',
    capabilities: ['adult content routing', 'approval gating', 'age gate', 'audit logging'],
    status: 'Backend pending',
    icon: Shield,
    category: 'Operations',
  },
  {
    id: 'diagnostics',
    name: 'Diagnostics Agent',
    description: 'Monitors provider health, endpoint readiness, job queues, and blockers. Reports to the Diagnostics surface.',
    capabilities: ['health monitoring', 'readiness checks', 'blocker detection', 'status reporting'],
    status: 'Ready to wire',
    icon: Cpu,
    route: '/admin/dashboard/diagnostics',
    category: 'Operations',
  },
  {
    id: 'deployment',
    name: 'Deployment Agent',
    description: 'Manages Webdock VPS deployments, environment configs, CI triggers, and post-deploy verification.',
    capabilities: ['VPS deployment', 'env config', 'CI integration', 'deploy verification'],
    status: 'Backend pending',
    icon: Wrench,
    category: 'Operations',
  },
]

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Ready to wire': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'Backend pending': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Needs key': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Planned: 'bg-slate-700/40 text-slate-500 border-slate-600/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentDef }) {
  const Icon = agent.icon
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-white/10">
            <Icon className="h-4 w-4 text-cyan-300" />
          </div>
          <p className="text-sm font-bold text-white">{agent.name}</p>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <p className="text-xs text-slate-400 leading-5">{agent.description}</p>
      <div className="flex flex-wrap gap-1">
        {agent.capabilities.map((cap) => (
          <span key={cap} className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-slate-500">
            {cap}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentRegistryPage() {
  const [registryLoaded, setRegistryLoaded] = useState(false)
  const [registryCount, setRegistryCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/agents')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        const agents = Array.isArray(data) ? data : (Array.isArray(data.agents) ? data.agents : null)
        if (agents !== null) {
          setRegistryCount(agents.length)
          setRegistryLoaded(true)
        }
      })
      .catch(() => { /* keep null */ })
  }, [])

  const statusCounts = AGENTS.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  const byCategory = CATEGORY_ORDER.reduce<Record<AgentCategory, AgentDef[]>>((acc, cat) => {
    acc[cat] = AGENTS.filter((a) => a.category === cat)
    return acc
  }, {} as Record<AgentCategory, AgentDef[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-950/30">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Agents</h1>
          <p className="text-xs text-slate-400">Compact category groups — all AmarktAI specialist agents with actual backend wiring status</p>
        </div>
        {registryLoaded && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Registry Working
          </span>
        )}
      </div>

      {/* Registry status notice */}
      {registryLoaded && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold text-emerald-300">Agent registry is active.</p>
          <p className="mt-1 text-xs text-slate-400">
            {registryCount} starter agents seeded from local VPS storage.
            Execution depends on provider keys and approved tool permissions.
          </p>
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className="text-2xl font-black text-white">{count}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{status}</p>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-xs font-semibold text-cyan-300">Agent status policy</p>
        <p className="mt-1 text-xs text-slate-400">
          No agent is marked <strong className="text-white">Active</strong> or <strong className="text-white">Working</strong> unless the backend endpoint and proof exist. <strong className="text-cyan-400">Ready to wire</strong> = frontend shell complete, API route defined but not fully verified. <strong className="text-violet-400">Backend pending</strong> = backend not yet wired. <strong className="text-amber-400">Needs key</strong> = provider key required first.
        </p>
      </div>

      {/* Compact category groups */}
      {CATEGORY_ORDER.map((cat) => {
        const agents = byCategory[cat]
        if (!agents || agents.length === 0) return null
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{cat}</p>
              <div className="flex-1 border-t border-white/[0.06]" />
              <span className="text-[10px] text-slate-700">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )
      })}

      <p className="text-[11px] text-slate-600">
        Agent registry is active. Execution depends on provider keys and approved tool permissions.
      </p>
    </div>
  )
}
