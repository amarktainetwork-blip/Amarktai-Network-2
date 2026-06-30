import {
  Activity,
  AppWindow,
  Blocks,
  Database,
  LayoutDashboard,
  Settings,
  Server,
  Sparkles,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'capabilities'
  | 'jobs-artifacts'
  | 'app-connections'
  | 'providers-models'
  | 'agents-learning'
  | 'settings'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'command-center', href: '/admin/dashboard', label: 'Command Center', description: 'Platform readiness, blockers, providers, and quick actions.', icon: LayoutDashboard },
  { id: 'studio', href: '/admin/dashboard/studio', label: 'Studio', description: 'Capability workbench with controls, previews, and test execution.', icon: Sparkles },
  { id: 'capabilities', href: '/admin/dashboard/capabilities', label: 'Capabilities', description: 'Capability catalog with status, providers, and proof state.', icon: Blocks },
  { id: 'jobs-artifacts', href: '/admin/dashboard/jobs', label: 'Jobs & Artifacts', description: 'Job lifecycle, artifact library, webhooks, and delivery state.', icon: Database },
  { id: 'app-connections', href: '/admin/dashboard/apps', label: 'App Connections', description: 'External app API keys, webhooks, permissions, and budgets.', icon: AppWindow },
  { id: 'providers-models', href: '/admin/dashboard/providers', label: 'Providers & Models', description: 'Active providers, model families, and configuration status.', icon: Server },
  { id: 'agents-learning', href: '/admin/dashboard/agents', label: 'Agents & Learning', description: 'Controlled agent foundations, schedules, and learning logs.', icon: Activity },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Provider keys, model defaults, storage, workers, and security.', icon: Settings },
] as const
