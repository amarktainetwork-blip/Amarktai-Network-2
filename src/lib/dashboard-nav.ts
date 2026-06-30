import {
  Activity,
  AppWindow,
  Blocks,
  Database,
  LayoutDashboard,
  Lock,
  Monitor,
  Package,
  Server,
  Settings2,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'capabilities'
  | 'providers'
  | 'proof'
  | 'assets'
  | 'memory'
  | 'automation'
  | 'adult'
  | 'app-runtime'
  | 'libraries'
  | 'settings'
  | 'system'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'command-center', href: '/admin/dashboard',                label: 'Command Center',           icon: LayoutDashboard, description: 'System readiness, provider health, capability status, blockers, and quick links.' },
  { id: 'studio',         href: '/admin/dashboard/studio',         label: 'Studio',                   icon: Sparkles,        description: 'Master capability workbench for runtime-selected execution.' },
  { id: 'capabilities',   href: '/admin/dashboard/capabilities',   label: 'Capabilities',             icon: Blocks,          description: 'Canonical capability runtime truth, proof status, routes, and blockers.' },
  { id: 'providers',      href: '/admin/dashboard/providers',       label: 'Providers & Models',       icon: Server,          description: 'Provider configuration, connection status, endpoint health, and model readiness.' },
  { id: 'proof',          href: '/admin/dashboard/proof',           label: 'Proof & Tests',            icon: Shield,          description: 'Provider proof, model proof, capability proof, and artifact proof records.' },
  { id: 'assets',         href: '/admin/dashboard/assets',          label: 'Assets & Jobs',            icon: Database,        description: 'Generated assets, artifacts, queued jobs, failures, downloads, and references.' },
  { id: 'memory',         href: '/admin/dashboard/memory',          label: 'Memory & Knowledge',       icon: Activity,        description: 'User memory, app memory, brand memory, RAG sources, and scrape results.' },
  { id: 'automation',     href: '/admin/dashboard/automation',      label: 'Automation',               icon: Zap,             description: 'Scheduler, approvals, job flows, worker health, and publishing readiness.' },
  { id: 'adult',          href: '/admin/dashboard/adult',           label: 'Adult Private',            icon: Lock,            description: 'Deferred from active V1 runtime; not part of active provider proof or readiness.' },
  { id: 'app-runtime',    href: '/admin/dashboard/app-runtime',     label: 'App Runtime',              icon: AppWindow,       description: 'App platform contract: capabilities requested, runtime selects provider and model.' },
  { id: 'libraries',      href: '/admin/dashboard/libraries',       label: 'Libraries & Integrations', icon: Package,         description: 'Platform library registry: installed, wired, proven, planned.' },
  { id: 'settings',       href: '/admin/dashboard/settings',        label: 'Settings',                 icon: Settings2,       description: 'The only place to add, save, test, and verify provider keys and integrations.' },
  { id: 'system',         href: '/admin/dashboard/system',          label: 'System',                   icon: Monitor,         description: 'VPS, database, worker, queue, storage, Redis, and Qdrant diagnostics.' },
] as const
