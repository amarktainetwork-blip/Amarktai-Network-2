export type AivaActionRisk = 'safe_read' | 'low_write' | 'external_write' | 'spend' | 'repo_write' | 'deploy' | 'destructive' | 'adult_mode'

export interface AivaActionPermission {
  id: string
  label: string
  category: 'system' | 'ai' | 'repo' | 'apps' | 'marketing' | 'deploy' | 'adult' | 'artifacts'
  risk: AivaActionRisk
  defaultAllowed: boolean
  requiresConfirmation: boolean
  requiresAdmin: boolean
  description: string
}

export const AIVA_ACTION_PERMISSIONS: readonly AivaActionPermission[] = [
  action('read_system_status', 'Read system status', 'system', 'safe_read', true, false, true, 'Read health, runtime truth, provider status and dashboard status.'),
  action('read_provider_scores', 'Read provider scores', 'ai', 'safe_read', true, false, true, 'Read provider intelligence, stream scores and capability test history.'),
  action('read_artifacts', 'Read generated artifacts', 'artifacts', 'safe_read', true, false, true, 'List and inspect generated media/task artifacts.'),
  action('recommend_app_ai_package', 'Recommend app AI package', 'apps', 'safe_read', true, false, true, 'Generate a proposed AI package for an app.'),
  action('save_app_ai_package', 'Save app AI package', 'apps', 'low_write', false, true, true, 'Persist or update an app AI package.'),
  action('run_provider_test', 'Run provider/capability test', 'ai', 'low_write', false, true, true, 'Run provider tests that may consume API credits.'),
  action('run_specialist_generation', 'Run specialist media generation', 'ai', 'spend', false, true, true, 'Generate image/audio/video/media through specialist providers.'),
  action('repo_import', 'Import/sync repo', 'repo', 'low_write', false, true, true, 'Import or sync a GitHub repo into Repo Workbench.'),
  action('repo_generate_patch', 'Generate repo patch', 'repo', 'repo_write', false, true, true, 'Run coding agent to create patch proposals.'),
  action('repo_apply_patch', 'Apply repo patch', 'repo', 'repo_write', false, true, true, 'Apply a generated patch to the workspace.'),
  action('repo_create_pr', 'Create GitHub PR', 'repo', 'external_write', false, true, true, 'Push branch and create a GitHub pull request.'),
  action('deploy_app', 'Deploy app', 'deploy', 'deploy', false, true, true, 'Run deployment or restart services.'),
  action('send_marketing_campaign', 'Send marketing campaign', 'marketing', 'external_write', false, true, true, 'Send outbound marketing emails or campaigns.'),
  action('change_adult_mode', 'Change adult mode', 'adult', 'adult_mode', false, true, true, 'Enable, disable or modify adult-mode settings.'),
  action('delete_data', 'Delete data', 'system', 'destructive', false, true, true, 'Delete files, artifacts, packages, users or other stored data.'),
]

function action(
  id: string,
  label: string,
  category: AivaActionPermission['category'],
  risk: AivaActionRisk,
  defaultAllowed: boolean,
  requiresConfirmation: boolean,
  requiresAdmin: boolean,
  description: string,
): AivaActionPermission {
  return { id, label, category, risk, defaultAllowed, requiresConfirmation, requiresAdmin, description }
}

export function getAivaActionPermission(id: string) {
  return AIVA_ACTION_PERMISSIONS.find((permission) => permission.id === id)
}

export function canAivaRunAction(id: string, confirmed: boolean) {
  const permission = getAivaActionPermission(id)
  if (!permission) return { allowed: false, reason: `Unknown Aiva action: ${id}` }
  if (permission.requiresConfirmation && !confirmed) return { allowed: false, reason: `Action "${permission.label}" requires confirmation.` }
  if (!permission.defaultAllowed && !confirmed) return { allowed: false, reason: `Action "${permission.label}" is not enabled for automatic execution.` }
  return { allowed: true, reason: 'Allowed' }
}
