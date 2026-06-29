import {
  LayoutDashboard,
  Sparkles,
  Blocks,
  Server,
  Shield,
  Database,
  Activity,
  Zap,
  Lock,
  AppWindow,
  Package,
  Settings2,
  Monitor,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DashboardSectionId =
  | 'command-center'
  | 'studio'
  | 'capabilities'
  | 'providers'
  | 'proof'
  | 'assets'
  | 'memory'
  | 'automation'
  | 'adult'
  | 'app-runtime'
  | 'libraries'
  | 'settings'
  | 'system';

export type DashboardNavItem = {
  id: DashboardSectionId;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    id: 'command-center',
    href: '/admin/dashboard',
    label: 'Command Center',
    description: 'Overview and control hub for the entire platform',
    icon: LayoutDashboard,
  },
  {
    id: 'studio',
    href: '/admin/dashboard/studio',
    label: 'Studio',
    description: 'Create and manage AI-powered content and workflows',
    icon: Sparkles,
  },
  {
    id: 'capabilities',
    href: '/admin/dashboard/capabilities',
    label: 'Capabilities',
    description: 'Configure and extend platform capabilities',
    icon: Blocks,
  },
  {
    id: 'providers',
    href: '/admin/dashboard/providers',
    label: 'Providers & Models',
    description: 'Manage AI providers, models, and API connections',
    icon: Server,
  },
  {
    id: 'proof',
    href: '/admin/dashboard/proof',
    label: 'Proof & Tests',
    description: 'Run tests and validate platform functionality',
    icon: Shield,
  },
  {
    id: 'assets',
    href: '/admin/dashboard/assets',
    label: 'Assets & Jobs',
    description: 'Manage media assets and background job queues',
    icon: Database,
  },
  {
    id: 'memory',
    href: '/admin/dashboard/memory',
    label: 'Memory & Knowledge',
    description: 'Manage knowledge bases, embeddings, and memory stores',
    icon: Activity,
  },
  {
    id: 'automation',
    href: '/admin/dashboard/automation',
    label: 'Automation',
    description: 'Build and manage automated workflows and triggers',
    icon: Zap,
  },
  {
    id: 'adult',
    href: '/admin/dashboard/adult',
    label: 'Adult Private',
    description: 'Restricted adult content management and controls',
    icon: Lock,
  },
  {
    id: 'app-runtime',
    href: '/admin/dashboard/app-runtime',
    label: 'App Runtime',
    description: 'Monitor and control application runtime environments',
    icon: AppWindow,
  },
  {
    id: 'libraries',
    href: '/admin/dashboard/libraries',
    label: 'Libraries & Integrations',
    description: 'Manage third-party libraries and service integrations',
    icon: Package,
  },
  {
    id: 'settings',
    href: '/admin/dashboard/settings',
    label: 'Settings',
    description: 'Configure platform preferences and account settings',
    icon: Settings2,
  },
  {
    id: 'system',
    href: '/admin/dashboard/system',
    label: 'System',
    description: 'System health, logs, and infrastructure management',
    icon: Monitor,
  },
] as const;
