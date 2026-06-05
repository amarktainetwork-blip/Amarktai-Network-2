export type NetworkAppStatus = 'Ready' | 'In build' | 'Planned'

export type NetworkAppDefinition = {
  slug: string
  displayName: string
  purpose: string
  status: NetworkAppStatus
  openHref: string
  capabilities: readonly string[]
}

export const NETWORK_APPS: readonly NetworkAppDefinition[] = [
  {
    slug: 'marketing',
    displayName: 'Marketing App',
    purpose: 'Plan campaigns, create content, coordinate approvals, and learn from results.',
    status: 'In build',
    openHref: '/admin/dashboard/command?app=marketing',
    capabilities: ['campaign planning', 'research', 'content', 'media'],
  },
  {
    slug: 'crypto-trading',
    displayName: 'Crypto / Trading App',
    purpose: 'Research markets, compare scenarios, and produce human-reviewed risk analysis.',
    status: 'Planned',
    openHref: '/admin/dashboard/command?app=crypto-trading',
    capabilities: ['market research', 'risk analysis', 'decision support'],
  },
  {
    slug: 'app-builder',
    displayName: 'App Builder',
    purpose: 'Move an idea through planning, generation, preview, QA, repository, and deployment handoff.',
    status: 'In build',
    openHref: '/admin/dashboard/command?intent=build_new_app',
    capabilities: ['planning', 'code generation', 'preview', 'QA', 'PR handoff'],
  },
  {
    slug: 'content-studio',
    displayName: 'Content Studio',
    purpose: 'Create songs, images, movies, avatars, voices, and reusable media outputs.',
    status: 'In build',
    openHref: '/admin/dashboard/command?surface=studio',
    capabilities: ['song', 'image', 'movie', 'avatar', 'voice'],
  },
  {
    slug: 'research-engine',
    displayName: 'Research Engine',
    purpose: 'Crawl, extract, compare, index, and synthesize source-backed research.',
    status: 'In build',
    openHref: '/admin/dashboard/command?intent=research_topic',
    capabilities: ['browser research', 'extraction', 'indexing', 'reports'],
  },
  {
    slug: 'automation-hub',
    displayName: 'Automation Hub',
    purpose: 'Coordinate repeatable workflows, schedules, approvals, queues, and recovery steps.',
    status: 'In build',
    openHref: '/admin/dashboard/command?intent=automate_workflow',
    capabilities: ['workflows', 'queues', 'approvals', 'schedules'],
  },
  {
    slug: 'sales',
    displayName: 'Sales',
    purpose: 'Coordinate leads, follow-ups, proposals, and sales learning.',
    status: 'Planned',
    openHref: '/admin/dashboard/command?app=sales',
    capabilities: ['lead workflows', 'proposals', 'follow-ups'],
  },
  {
    slug: 'support',
    displayName: 'Support',
    purpose: 'Triage requests, prepare responses, and learn from resolved cases.',
    status: 'Planned',
    openHref: '/admin/dashboard/command?app=support',
    capabilities: ['triage', 'response drafting', 'resolution memory'],
  },
  {
    slug: 'finance',
    displayName: 'Finance',
    purpose: 'Support reporting, reconciliations, documents, and reviewed finance workflows.',
    status: 'Planned',
    openHref: '/admin/dashboard/command?app=finance',
    capabilities: ['reporting', 'documents', 'reconciliation support'],
  },
  {
    slug: 'retail-ecommerce',
    displayName: 'Retail / Ecommerce',
    purpose: 'Coordinate catalog, merchandising, support, content, and performance signals.',
    status: 'Planned',
    openHref: '/admin/dashboard/command?app=retail-ecommerce',
    capabilities: ['catalog', 'content', 'support', 'performance'],
  },
  {
    slug: 'operations',
    displayName: 'Operations',
    purpose: 'Monitor apps, jobs, deployments, failures, and approved repairs.',
    status: 'In build',
    openHref: '/admin/dashboard/command?app=operations',
    capabilities: ['monitoring', 'jobs', 'deployments', 'repair plans'],
  },
] as const
