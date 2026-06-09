import {
  GitPullRequest,
  Home,
  Library,
  Rocket,
  Settings2,
  Sparkles,
  Workflow,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'home'
  | 'playground'
  | 'repo-workbench'
  | 'app-builder'
  | 'outputs'
  | 'connected-apps'
  | 'control-center'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    id: 'home',
    href: '/admin/dashboard',
    label: 'Home',
    description: 'Start here.',
    icon: Home,
  },
  {
    id: 'playground',
    href: '/admin/dashboard/studio',
    label: 'Playground',
    description: 'Generate with AI.',
    icon: Sparkles,
  },
  {
    id: 'repo-workbench',
    href: '/admin/dashboard/workbench',
    label: 'Repo Workbench',
    description: 'Fix and deploy code.',
    icon: GitPullRequest,
  },
  {
    id: 'app-builder',
    href: '/admin/dashboard/app-builder',
    label: 'App Builder',
    description: 'Build connected apps.',
    icon: Rocket,
  },
  {
    id: 'outputs',
    href: '/admin/dashboard/outputs',
    label: 'Outputs',
    description: 'View created work.',
    icon: Library,
  },
  {
    id: 'connected-apps',
    href: '/admin/dashboard/network-apps',
    label: 'Connected Apps',
    description: 'Manage app access.',
    icon: Workflow,
  },
  {
    id: 'control-center',
    href: '/admin/dashboard/settings',
    label: 'Control Center',
    description: 'Providers, system, logs.',
    icon: Settings2,
  },
] as const

export const CONTROL_CENTER_ROUTES = [
  '/admin/dashboard/settings',
  '/admin/dashboard/operations',
  '/admin/dashboard/system',
] as const
