import {
  Activity,
  Blocks,
  Database,
  FolderOpen,
  LayoutDashboard,
  Settings2,
  Shield,
  Sparkles,
  Mic2,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'overview'
  | 'studio'
  | 'apps'
  | 'capabilities'
  | 'assets-jobs'
  | 'memory-knowledge'
  | 'voice-agent'
  | 'settings'
  | 'system'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  group?: string
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'overview',          href: '/admin/dashboard',              label: 'Overview',           description: 'VPS, apps, provider, capability, job, storage, worker, Redis, and Qdrant summary.', icon: LayoutDashboard, group: 'Platform' },
  { id: 'studio',            href: '/admin/dashboard/studio',        label: 'Studio',             description: 'Permanent chat and task workspace for runtime-selected capability execution.', icon: Sparkles,        group: 'Platform' },
  { id: 'apps',              href: '/admin/dashboard/apps',          label: 'Apps',               description: 'Connected and planned thin apps, usage, memory, storage, and capability context.', icon: FolderOpen,      group: 'Platform' },
  { id: 'capabilities',      href: '/admin/dashboard/capabilities',  label: 'Capabilities',       description: 'Canonical capability runtime truth from the shared source of truth.', icon: Blocks,          group: 'Runtime' },
  { id: 'assets-jobs',       href: '/admin/dashboard/assets',        label: 'Assets & Jobs',      description: 'Generated assets, artifacts, queued jobs, failures, downloads, and references.', icon: Database,        group: 'Runtime' },
  { id: 'memory-knowledge',  href: '/admin/dashboard/memory',        label: 'Memory & Knowledge', description: 'User memory, app memory, brand memory, RAG sources, scrape results, and ingestion state.', icon: Activity,      group: 'Runtime' },
  { id: 'voice-agent',       href: '/admin/dashboard/voice-agent',   label: 'Voice Agent',        description: 'Owner voice agent UI and honest backend contract for streaming voice operation.', icon: Mic2,           group: 'Platform' },
  { id: 'settings',          href: '/admin/dashboard/settings',      label: 'Settings',           description: 'The only dashboard place to add, save, test, and verify provider keys and integrations.', icon: Settings2,      group: 'System' },
  { id: 'system',            href: '/admin/dashboard/system',        label: 'System',             description: 'Technical VPS diagnostics, logs, worker, database, Redis, Qdrant, and health checks.', icon: Shield,          group: 'System' },
] as const
