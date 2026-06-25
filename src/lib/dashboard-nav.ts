import {
  Activity,
  Blocks,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  Database,
  Image,
  Layout,
  Library,
  Lock,
  Megaphone,
  Monitor,
  Send,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'overview'
  | 'studio'
  | 'marketing'
  | 'campaigns'
  | 'assets'
  | 'approvals'
  | 'brand-memory'
  | 'rag'
  | 'agents'
  | 'scheduler'
  | 'publishing'
  | 'analytics'
  | 'providers'
  | 'vps-health'
  | 'adult-mode'
  | 'avatars'
  | 'settings'
  | 'app-builder'
  | 'repo-workbench'
  | 'outputs'
  | 'advanced-admin'

export type DashboardNavItem = {
  id: DashboardSectionId
  href: string
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  group?: string
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  // ── Platform ──────────────────────────────────────────────────────────────
  { id: 'overview',      href: '/admin/dashboard',             label: 'Overview',      description: 'Platform status, quick metrics, and recent activity.', icon: Layout,     group: 'Platform' },
  { id: 'studio',        href: '/admin/dashboard/studio',       label: 'Studio',        description: 'Generate and inspect real media through connected providers.', icon: Sparkles,  group: 'Platform' },
  { id: 'analytics',     href: '/admin/dashboard/analytics',    label: 'Analytics',     description: 'Campaign performance, usage, and publishing metrics.', icon: TrendingUp, group: 'Platform' },

  // ── Marketing ─────────────────────────────────────────────────────────────
  { id: 'marketing',     href: '/admin/dashboard/marketing',    label: 'Marketing',     description: 'Launch the autonomous marketing workflow.', icon: Megaphone,  group: 'Marketing' },
  { id: 'campaigns',     href: '/admin/dashboard/campaigns',    label: 'Campaigns',     description: 'View and manage all marketing campaigns.', icon: Activity,   group: 'Marketing' },
  { id: 'assets',        href: '/admin/dashboard/assets',       label: 'Assets',        description: 'Generated media and content assets.', icon: Image,      group: 'Marketing' },
  { id: 'approvals',     href: '/admin/dashboard/approvals',    label: 'Approvals',     description: 'Review and approve content before publishing.', icon: CheckSquare, group: 'Marketing' },
  { id: 'scheduler',     href: '/admin/dashboard/scheduler',    label: 'Scheduler',     description: 'Schedule posts and publishing runs.', icon: Calendar,   group: 'Marketing' },
  { id: 'publishing',    href: '/admin/dashboard/publishing',   label: 'Publishing',    description: 'Publishing status and results.', icon: Send,       group: 'Marketing' },

  // ── Intelligence ──────────────────────────────────────────────────────────
  { id: 'brand-memory',  href: '/admin/dashboard/brand-memory', label: 'Brand Memory',  description: 'Persistent brand identity and guidelines.', icon: BookOpen,  group: 'Intelligence' },
  { id: 'rag',           href: '/admin/dashboard/rag',           label: 'RAG',           description: 'Retrieval-augmented generation knowledge base.', icon: Database,  group: 'Intelligence' },
  { id: 'agents',        href: '/admin/dashboard/agents',        label: 'Agents',        description: 'Active agents and their task history.', icon: Users,     group: 'Intelligence' },
  { id: 'avatars',       href: '/admin/dashboard/avatars',       label: 'Avatars',       description: 'AI avatar configuration and generation.', icon: Monitor,   group: 'Intelligence' },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { id: 'providers',     href: '/admin/dashboard/providers',    label: 'Providers',     description: 'Configure the 5 active AI providers.', icon: Zap,        group: 'Admin' },
  { id: 'vps-health',    href: '/admin/dashboard/vps-health',   label: 'VPS Health',    description: 'Production readiness and component health checks.', icon: Shield,    group: 'Admin' },
  { id: 'adult-mode',    href: '/admin/dashboard/adult-mode',   label: 'Adult Mode',    description: 'Gated adult content — disabled by default.', icon: Lock,      group: 'Admin' },
  { id: 'settings',      href: '/admin/dashboard/settings',     label: 'Settings',      description: 'Keys, connections, storage, queues, and service setup.', icon: Settings2, group: 'Admin' },
  { id: 'advanced-admin', href: '/admin/dashboard/system',      label: 'Advanced Admin', description: 'System, operations, VPS, queues, logs, and diagnostics.', icon: Brain,    group: 'Admin' },

  // ── Build ─────────────────────────────────────────────────────────────────
  { id: 'app-builder',   href: '/admin/dashboard/app-builder',  label: 'App Builder',   description: 'Clarify ideas and prepare approved future build plans.', icon: Blocks,   group: 'Build' },
  { id: 'repo-workbench', href: '/admin/dashboard/workbench',   label: 'Repo Workbench', description: 'Import, audit, patch, test, commit, push, and create PRs.', icon: Wrench,  group: 'Build' },
  { id: 'outputs',       href: '/admin/dashboard/outputs',      label: 'Outputs',       description: 'Media, reports, app builds, diffs, PRs, and artifacts.', icon: Library,  group: 'Build' },
] as const
