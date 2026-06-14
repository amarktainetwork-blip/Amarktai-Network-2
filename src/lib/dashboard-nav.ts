import {
  AppWindow,
  BriefcaseBusiness,
  Library,
  ListChecks,
  Music2,
  Palette,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'projects'
  | 'avatars'
  | 'music'
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
  { id: 'studio', href: '/admin/dashboard/studio', label: 'Create Studio', description: 'Create text, image, video, music, avatar, and voice work.', icon: Sparkles },
  { id: 'projects', href: '/admin/dashboard/projects', label: 'Projects & Brand Kits', description: 'Organize work and reusable brand context.', icon: Palette },
  { id: 'avatars', href: '/admin/dashboard/avatars', label: 'Avatar Library', description: 'Manage avatar references and generated avatar media.', icon: UserRound },
  { id: 'music', href: '/admin/dashboard/music-studio', label: 'Music Studio', description: 'Create songs, lyrics, and instrumentals.', icon: Music2 },
  { id: 'jobs', href: '/admin/dashboard/jobs', label: 'Jobs', description: 'Track queued, running, completed, and failed work.', icon: ListChecks },
  { id: 'artifacts', href: '/admin/dashboard/artifacts', label: 'Artifacts', description: 'Preview, download, and reuse generated outputs.', icon: Library },
  { id: 'connected-apps', href: '/admin/dashboard/connected-apps', label: 'Connected Apps', description: 'Register apps and manage scoped access.', icon: AppWindow },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Keys, connections, storage, queues, and policy.', icon: Settings2 },
] as const
