import {
  BrainCircuit,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Sparkles,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'overview'
  | 'studio'
  | 'workbench'
  | 'apps-agents'
  | 'memory-learning'
  | 'settings'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    id: 'overview',
    href: '/admin/dashboard',
    label: 'Overview',
    description: 'System health, provider status, VPS, storage, jobs, costs, and platform readiness.',
    icon: LayoutDashboard,
  },
  {
    id: 'studio',
    href: '/admin/dashboard/studio',
    label: 'Studio',
    description: 'Operator workspace for chat, coding handoff, research, media, voice, policy, and artifacts.',
    icon: Sparkles,
  },
  {
    id: 'workbench',
    href: '/admin/dashboard/workbench',
    label: 'Workbench',
    description: 'Autonomous repo workflow: start work, approve changes, create PR.',
    icon: GitBranch,
  },
  {
    id: 'apps-agents',
    href: '/admin/dashboard/apps-agents',
    label: 'Apps & Agents',
    description: 'Connected apps, app model packages, assigned agents, domains, repos, services, and policies.',
    icon: BrainCircuit,
  },
  {
    id: 'memory-learning',
    href: '/admin/dashboard/memory-learning',
    label: 'Memory & Learning',
    description: 'Persistent context, app memory, learning logs, artifact links, and workflow history.',
    icon: GraduationCap,
  },
  {
    id: 'settings',
    href: '/admin/dashboard/settings',
    label: 'Settings',
    description: 'Provider keys, defaults, routing, GitHub, Webdock, research tools, storage, adult policy, and deployment.',
    icon: Settings2,
  },
] as const
