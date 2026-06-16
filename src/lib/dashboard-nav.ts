import {
  AppWindow,
  BriefcaseBusiness,
  Cpu,
  Library,
  ListChecks,
  Settings2,
  Sparkles,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'capabilities'
  | 'connected-apps'
  | 'artifacts'
  | 'jobs'
  | 'settings'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'command-center', href: '/admin/dashboard/command', label: 'Command Center', description: 'Capability-first command and execution workspace.', icon: BriefcaseBusiness },
  { id: 'studio', href: '/admin/dashboard/studio', label: 'Studio', description: 'Create text, image, video, music, avatar, and voice work.', icon: Sparkles },
  { id: 'capabilities', href: '/admin/dashboard/capabilities', label: 'Capabilities', description: 'Browse capability families and current wiring status.', icon: Cpu },
  { id: 'connected-apps', href: '/admin/dashboard/connected-apps', label: 'Apps', description: 'Register apps and manage scoped access.', icon: AppWindow },
  { id: 'jobs', href: '/admin/dashboard/jobs', label: 'Jobs', description: 'Track queued, running, completed, and failed work.', icon: ListChecks },
  { id: 'artifacts', href: '/admin/dashboard/artifacts', label: 'Artifacts', description: 'Preview, download, and reuse generated outputs.', icon: Library },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Keys, connections, storage, queues, and policy.', icon: Settings2 },
] as const
