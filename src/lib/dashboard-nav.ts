import {
  Activity,
  AppWindow,
  Blocks,
  Database,
  LayoutDashboard,
  Monitor,
  Server,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { DASHBOARD_CONTROL_ROOM_SECTIONS } from '@/lib/dashboard-control-room'

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'app-connections'
  | 'capabilities'
  | 'providers-models'
  | 'jobs-artifacts'
  | 'webhooks-handoff'
  | 'agents-learning'
  | 'system-settings'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const ICONS: Record<DashboardSectionId, ComponentType<SVGProps<SVGSVGElement>>> = {
  'command-center': LayoutDashboard,
  studio: Sparkles,
  'app-connections': AppWindow,
  capabilities: Blocks,
  'providers-models': Server,
  'jobs-artifacts': Database,
  'webhooks-handoff': Zap,
  'agents-learning': Activity,
  'system-settings': Monitor,
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = DASHBOARD_CONTROL_ROOM_SECTIONS.map((section) => ({
  id: section.id as DashboardSectionId,
  href: section.href,
  label: section.label,
  description: section.purpose,
  icon: ICONS[section.id as DashboardSectionId],
}))
