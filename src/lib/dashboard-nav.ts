import {
  BrainCircuit,
  GitBranch,
  GraduationCap,
  MonitorCog,
  Settings2,
  Sparkles,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'studio'
  | 'workbench'
  | 'apps-agents'
  | 'memory-learning'
  | 'operations'
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
    id: 'studio',
    href: '/admin/dashboard',
    label: 'Studio',
    description: 'Main Superbrain AI workspace for chat, coding, research, media, voice, adult policy, and artifacts.',
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
    description: 'Shared Superbrain memory, emotional context, app memory, learning logs, and knowledge links.',
    icon: GraduationCap,
  },
  {
    id: 'operations',
    href: '/admin/dashboard/operations',
    label: 'Operations',
    description: 'VPS, storage, jobs, artifacts, approvals, queues, logs, costs, provider usage, and alerts.',
    icon: MonitorCog,
  },
  {
    id: 'settings',
    href: '/admin/dashboard/settings',
    label: 'Settings',
    description: 'Provider keys, defaults, routing, GitHub, Webdock, research tools, storage, adult policy, and deployment.',
    icon: Settings2,
  },
] as const
