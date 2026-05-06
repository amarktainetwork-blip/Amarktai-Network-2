import {
  Activity,
  AppWindow,
  Bot,
  Coins,
  Cpu,
  FlaskConical,
  GitBranch,
  ListChecks,
  Palette,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'overview'
  | 'workbench'
  | 'apps'
  | 'agents'
  | 'ai-models'
  | 'assistant'
  | 'playground'
  | 'creative-studio'
  | 'costs'
  | 'actions'
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
  {
    id: 'overview',
    href: '/admin/dashboard',
    label: 'Overview',
    description: 'Current work, active repositories, and operational summary.',
    icon: Activity,
  },
  {
    id: 'workbench',
    href: '/admin/dashboard/workbench',
    label: 'Workbench',
    description: 'Repo selection, AI planning, patches, checks, PRs, merge, and deploy.',
    icon: GitBranch,
  },
  {
    id: 'apps',
    href: '/admin/dashboard/apps',
    label: 'Apps',
    description: 'App inventory and routing targets.',
    icon: AppWindow,
  },
  {
    id: 'agents',
    href: '/admin/dashboard/agents',
    label: 'Agents',
    description: 'Approved agent roles connected to the workbench flow.',
    icon: Users,
  },
  {
    id: 'ai-models',
    href: '/admin/dashboard/ai-models',
    label: 'AI Models',
    description: 'Approved providers, model choices, and task routes.',
    icon: Cpu,
  },
  {
    id: 'assistant',
    href: '/admin/dashboard/assistant',
    label: 'Assistant',
    description: 'AmarktAI Assistant with dashboard and workbench context.',
    icon: Bot,
  },
  {
    id: 'playground',
    href: '/admin/dashboard/playground',
    label: 'Playground',
    description: 'Explore and test AI capabilities: chat, code, image, video, voice, and more.',
    icon: FlaskConical,
  },
  {
    id: 'creative-studio',
    href: '/admin/dashboard/creative-studio',
    label: 'Creative Studio',
    description: 'Generate images, video, music, voice, and avatar media.',
    icon: Palette,
  },
  {
    id: 'costs',
    href: '/admin/dashboard/costs',
    label: 'Costs',
    description: 'Cheap, balanced, and premium routing controls.',
    icon: Coins,
  },
  {
    id: 'actions',
    href: '/admin/dashboard/actions',
    label: 'Actions',
    description: 'Human approvals for write, Git, merge, and deploy actions.',
    icon: ShieldCheck,
  },
  {
    id: 'settings',
    href: '/admin/dashboard/settings',
    label: 'Settings',
    description: 'Keys for approved AI providers, GitHub, tools, and system services.',
    icon: Settings2,
  },
  {
    id: 'system',
    href: '/admin/dashboard/system',
    label: 'System',
    description: 'Runtime status, VPS monitoring, storage, and checks.',
    icon: ListChecks,
  },
] as const
