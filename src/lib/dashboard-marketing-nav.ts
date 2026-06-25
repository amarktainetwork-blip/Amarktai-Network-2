import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CheckSquare,
  Database,
  FolderOpen,
  Globe,
  Image,
  LayoutDashboard,
  Lock,
  Megaphone,
  Rss,
  Send,
  Settings,
  Server,
  User,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type DashboardNavItem = {
  id: string
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const BASE = '/admin/dashboard/marketing'

export const MARKETING_NAV_ITEMS: readonly DashboardNavItem[] = [
  { id: 'overview',     href: `${BASE}`,            label: 'Overview',      icon: LayoutDashboard },
  { id: 'studio',       href: `${BASE}/studio`,     label: 'Studio',        icon: Zap },
  { id: 'marketing',    href: `${BASE}/new`,        label: 'Marketing',     icon: Megaphone },
  { id: 'campaigns',    href: `${BASE}/campaigns`,  label: 'Campaigns',     icon: Globe },
  { id: 'assets',       href: `${BASE}/assets`,     label: 'Assets',        icon: FolderOpen },
  { id: 'approvals',    href: `${BASE}/approvals`,  label: 'Approvals',     icon: CheckSquare },
  { id: 'brand-memory', href: `${BASE}/brand`,      label: 'Brand Memory',  icon: BookOpen },
  { id: 'rag',          href: `${BASE}/rag`,        label: 'RAG',           icon: Database },
  { id: 'agents',       href: `${BASE}/agents`,     label: 'Agents',        icon: Bot },
  { id: 'scheduler',    href: `${BASE}/scheduler`,  label: 'Scheduler',     icon: Calendar },
  { id: 'publishing',   href: `${BASE}/publishing`, label: 'Publishing',    icon: Send },
  { id: 'analytics',    href: `${BASE}/analytics`,  label: 'Analytics',     icon: BarChart3 },
  { id: 'providers',    href: `${BASE}/providers`,  label: 'Providers',     icon: Rss },
  { id: 'vps-health',   href: `${BASE}/vps`,        label: 'VPS Health',    icon: Server },
  { id: 'adult-mode',   href: `${BASE}/adult`,      label: 'Adult Mode',    icon: Lock },
  { id: 'avatars',      href: `${BASE}/avatars`,    label: 'Avatars',       icon: User },
  { id: 'settings',     href: `${BASE}/settings`,   label: 'Settings',      icon: Settings },
  { id: 'images',       href: `${BASE}/images`,     label: 'Images',        icon: Image },
] as const
