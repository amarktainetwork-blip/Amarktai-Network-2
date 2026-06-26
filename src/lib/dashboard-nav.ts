import {
  Activity,
  Blocks,
  CheckSquare,
  Database,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Lock,
  Radio,
  Send,
  Settings2,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'overview'
  | 'connected-apps'
  | 'studio'
  | 'capabilities'
  | 'campaigns'
  | 'assets'
  | 'agents'
  | 'memory'
  | 'knowledge-rag'
  | 'approvals'
  | 'scheduler-publishing'
  | 'adult-permissions'
  | 'settings'
  | 'system-monitoring'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  group?: string
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'overview',             href: '/admin/dashboard',              label: 'Overview',              description: 'Runtime health, warnings, activity, storage, and proof status.', icon: LayoutDashboard, group: 'Control' },
  { id: 'connected-apps',       href: '/admin/dashboard/network-apps',  label: 'Connected Apps',        description: 'App profiles, permissions, memory, RAG, and request surface.', icon: FolderOpen,      group: 'Control' },
  { id: 'studio',               href: '/admin/dashboard/studio',        label: 'Studio',                description: 'Run capability requests without choosing providers or models.', icon: Sparkles,        group: 'Control' },
  { id: 'capabilities',         href: '/admin/dashboard/operations',    label: 'Capabilities',          description: 'Capability readiness, proof, route coverage, and runtime gates.', icon: Blocks,          group: 'Control' },
  { id: 'campaigns',            href: '/admin/dashboard/campaigns',     label: 'Campaigns',             description: 'Website scrape, plan, generated items, approvals, and learning.', icon: Gauge,           group: 'Workflow' },
  { id: 'assets',               href: '/admin/dashboard/assets',        label: 'Assets',                description: 'Images, video, music, audio, avatars, documents, and links.', icon: Database,        group: 'Workflow' },
  { id: 'agents',               href: '/admin/dashboard/agents',        label: 'Agents',                description: 'Agent status, logs, learning summaries, and handoffs.', icon: Users,              group: 'Workflow' },
  { id: 'memory',               href: '/admin/dashboard/memory',        label: 'Memory',                description: 'User, workspace, app, brand, avatar, and gated memory scopes.', icon: Activity,          group: 'Knowledge' },
  { id: 'knowledge-rag',        href: '/admin/dashboard/rag',           label: 'Knowledge/RAG',         description: 'Ingestion, chunks, embeddings, vector store, and retrieval tests.', icon: Radio,          group: 'Knowledge' },
  { id: 'approvals',            href: '/admin/dashboard/approvals',     label: 'Approvals',             description: 'Review gates before assets can be published or exported.', icon: CheckSquare,      group: 'Governance' },
  { id: 'scheduler-publishing', href: '/admin/dashboard/publishing',    label: 'Scheduler/Publishing',  description: 'Scheduled jobs, export queue, retries, and delivery state.', icon: Send,             group: 'Governance' },
  { id: 'adult-permissions',    href: '/admin/dashboard/adult-mode',    label: 'Adult Permissions',     description: 'Permission gates, app safety state, and adult capability policy.', icon: Lock,            group: 'Governance' },
  { id: 'settings',             href: '/admin/dashboard/settings',      label: 'Settings',              description: 'Provider/API keys, platform configuration, and recovery checks.', icon: Settings2,        group: 'System' },
  { id: 'system-monitoring',    href: '/admin/dashboard/system',        label: 'System Monitoring',     description: 'Platform, worker, DB, Redis, storage, artifact proof, and VPS.', icon: Shield,          group: 'System' },
] as const
