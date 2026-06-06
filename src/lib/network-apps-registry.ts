export type NetworkAppStatus = 'Ready' | 'In build' | 'Planned'

export type NetworkAppDefinition = {
  slug: string
  displayName: string
  purpose: string
  status: NetworkAppStatus
  openHref: string
  capabilities: readonly string[]
}

export const NETWORK_APPS: readonly NetworkAppDefinition[] = []

export const NETWORK_APPS_EMPTY_MESSAGE =
  'No connected apps yet. Add apps after they are completed.'
