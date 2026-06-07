import { Blocks, Library, Settings2, Shield, Sparkles, Wrench } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'app-builder'
  | 'repo-workbench'
  | 'media-studio'
  | 'outputs'
  | 'settings'
  | 'advanced-admin'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'app-builder', href: '/admin/dashboard/app-builder', label: 'App Builder', description: 'Clarify ideas and prepare approved future build plans.', icon: Blocks },
  { id: 'repo-workbench', href: '/admin/dashboard/workbench', label: 'Repo Workbench', description: 'Import, audit, patch, test, commit, push, and create PRs.', icon: Wrench },
  { id: 'media-studio', href: '/admin/dashboard/studio', label: 'Media Studio / Playground', description: 'Generate and inspect real media through connected providers.', icon: Sparkles },
  { id: 'outputs', href: '/admin/dashboard/outputs', label: 'Outputs', description: 'Media, reports, app builds, diffs, PRs, and artifacts.', icon: Library },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Keys, connections, storage, queues, and service setup.', icon: Settings2 },
  { id: 'advanced-admin', href: '/admin/dashboard/system', label: 'Advanced Admin', description: 'System, operations, VPS, queues, logs, and diagnostics.', icon: Shield },
] as const
