import {
  AppWindow,
  Blocks,
  Bot,
  Brain,
  Boxes,
  BriefcaseBusiness,
  Library,
  ListChecks,
  Mic2,
  Network,
  Settings2,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardSectionId =
  | 'command-center'
  | 'app-builder'
  | 'connected-apps'
  | 'provider-mesh'
  | 'model-universe'
  | 'agents'
  | 'repo-workbench'
  | 'media-studio'
  | 'outputs'
  | 'avatar-voice'
  | 'jobs-approvals'
  | 'memory-learning'
  | 'control-center'
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
  { id: 'app-builder', href: '/admin/dashboard/app-builder', label: 'App Builder', description: 'Create app capability packages and build plans.', icon: Blocks },
  { id: 'connected-apps', href: '/admin/dashboard/network-apps', label: 'Connected Apps', description: 'Manage connected products and integrations.', icon: AppWindow },
  { id: 'provider-mesh', href: '/admin/dashboard/provider-mesh', label: 'Provider Mesh', description: 'Approved provider and tool connectivity truth.', icon: Network },
  { id: 'model-universe', href: '/admin/dashboard/model-universe', label: 'Model Universe', description: 'Canonical models grouped by capability.', icon: Boxes },
  { id: 'agents', href: '/admin/dashboard/agents', label: 'Agents', description: 'Operator and app agent configuration.', icon: Bot },
  { id: 'repo-workbench', href: '/admin/dashboard/workbench', label: 'Repo Workbench', description: 'Audit, patch, test, commit, push, and create PRs.', icon: Wrench },
  { id: 'media-studio', href: '/admin/dashboard/studio', label: 'Media Studio', description: 'Generate media through approved capability routes.', icon: Sparkles },
  { id: 'outputs', href: '/admin/dashboard/outputs', label: 'Outputs', description: 'Artifacts, reports, media, diffs, and app builds.', icon: Library },
  { id: 'avatar-voice', href: '/admin/dashboard/avatar-voice', label: 'Avatar / Voice', description: 'Voice personas, previews, and avatar media.', icon: Mic2 },
  { id: 'jobs-approvals', href: '/admin/dashboard/jobs-approvals', label: 'Jobs / Approvals', description: 'Execution queues, approvals, and job state.', icon: ListChecks },
  { id: 'memory-learning', href: '/admin/dashboard/memory-learning', label: 'Memory / Learning', description: 'Memory, retrieval, and learning state.', icon: Brain },
  { id: 'control-center', href: '/admin/dashboard/operations', label: 'Control Center / Operations', description: 'Runtime readiness, services, logs, and diagnostics.', icon: Shield },
  { id: 'settings', href: '/admin/dashboard/settings', label: 'Settings', description: 'Keys, connections, storage, queues, and policy.', icon: Settings2 },
] as const
