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
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'control-centre'
  | 'studio'
  | 'capabilities'
  | 'apps'
  | 'providers'
  | 'storage-artifacts'
  | 'memory-rag'
  | 'agents'
  | 'jobs-worker'
  | 'approvals'
  | 'publishing'
  | 'analytics'
  | 'safety'
  | 'vps-health'
  | 'settings'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  group?: string
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'control-centre',    href: '/admin/dashboard',              label: 'Control Centre',      description: 'Operational status, recent activity, and key runtime signals.', icon: LayoutDashboard, group: 'Operate' },
  { id: 'studio',            href: '/admin/dashboard/studio',        label: 'Studio',              description: 'Run chat, research, media, voice, and artifact workflows.', icon: Sparkles,        group: 'Operate' },
  { id: 'capabilities',      href: '/admin/dashboard/operations',    label: 'Capabilities',        description: 'Capability readiness, route coverage, and runtime gates.', icon: Blocks,          group: 'Operate' },
  { id: 'apps',              href: '/admin/dashboard/network-apps',  label: 'Apps',                description: 'Connected app registry and app-level runtime state.', icon: FolderOpen,      group: 'Operate' },
  { id: 'providers',         href: '/admin/dashboard/providers',     label: 'Providers & Keys',    description: 'Configure the five active AI providers and verify live tests.', icon: Zap,           group: 'Runtime' },
  { id: 'storage-artifacts', href: '/admin/dashboard/outputs',       label: 'Storage & Artifacts', description: 'Persisted outputs, storage paths, and artifact recovery.', icon: Database,       group: 'Runtime' },
  { id: 'memory-rag',        href: '/admin/dashboard/rag',           label: 'Memory & RAG',        description: 'Brand memory, retrieval sources, and knowledge queries.', icon: Radio,          group: 'Runtime' },
  { id: 'agents',            href: '/admin/dashboard/agents',        label: 'Agents',              description: 'Agent runs, handoffs, and task history.', icon: Users,            group: 'Runtime' },
  { id: 'jobs-worker',       href: '/admin/dashboard/system',        label: 'Jobs & Worker',       description: 'Queues, workers, logs, and background job diagnostics.', icon: Activity,        group: 'Runtime' },
  { id: 'approvals',         href: '/admin/dashboard/approvals',     label: 'Approvals',           description: 'Review gates before assets can be published or exported.', icon: CheckSquare,    group: 'Governance' },
  { id: 'publishing',        href: '/admin/dashboard/publishing',    label: 'Publishing',          description: 'Publishing jobs, export state, and delivery results.', icon: Send,             group: 'Governance' },
  { id: 'analytics',         href: '/admin/dashboard/analytics',     label: 'Analytics',           description: 'Usage, outcomes, and app performance metrics.', icon: Gauge,             group: 'Governance' },
  { id: 'safety',            href: '/admin/dashboard/adult-mode',    label: 'Safety',              description: 'Permission gates, adult mode controls, and policy state.', icon: Lock,             group: 'Governance' },
  { id: 'vps-health',        href: '/admin/dashboard/vps-health',    label: 'VPS Health',          description: 'Runtime probes for host, database, Redis, Qdrant, and storage.', icon: Shield,        group: 'System' },
  { id: 'settings',          href: '/admin/dashboard/settings',      label: 'Settings',            description: 'Platform configuration, integrations, and recovery checks.', icon: Settings2,      group: 'System' },
] as const
