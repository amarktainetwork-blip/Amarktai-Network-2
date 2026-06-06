import { BrainCircuit, Command, Library, Settings2, Sparkles } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'workspace'
  | 'outputs'
  | 'memory'
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
  { id: 'workspace', href: '/admin/dashboard/workspace', label: 'Workspace', description: 'Route approved capabilities from one working area.', icon: Command },
  { id: 'outputs', href: '/admin/dashboard/outputs', label: 'Outputs', description: 'Media, reports, app builds, diffs, PRs, and artifacts.', icon: Library },
  { id: 'memory', href: '/admin/dashboard/memory', label: 'Memory', description: 'Shared context, outcomes, and learning by module.', icon: BrainCircuit },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Keys, connections, storage, queues, and service setup.', icon: Settings2 },
  { id: 'system', href: '/admin/dashboard/system', label: 'System', description: 'Admin-only VPS, services, queues, logs, and readiness.', icon: Sparkles },
] as const
