import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import { verifyStorage } from '@/lib/storage-driver'

export interface ToolRegistryEntry {
  id: string
  label: string
  category: 'github' | 'repo' | 'media' | 'research' | 'vps' | 'artifact' | 'mcp'
  enabled: boolean
  wired: boolean
  permission: 'read' | 'write' | 'destructive'
  approvalRequired: boolean
  requiredConfig: string[]
  endpoint: string | null
  lastError: string | null
}

function entry(input: ToolRegistryEntry): ToolRegistryEntry {
  return input
}

export async function getToolRegistry(): Promise<{
  success: true
  generatedAt: string
  tools: ToolRegistryEntry[]
  mcpServers: { implemented: false; status: 'post_launch'; blocker: string }
}> {
  const [truth, repo, storage] = await Promise.all([
    getDashboardRuntimeTruth(),
    getRepoWorkbenchStatus().catch(() => null),
    verifyStorage().catch(() => null),
  ])
  const configured = new Set(truth.providers.filter((provider) => provider.configured).map((provider) => provider.key))
  const capability = (name: string) => truth.capabilities.find((item) => item.name === name)
  const imageReady = capability('Image Generation')?.status === 'available'
  const videoReady = capability('Video Generation')?.status === 'available'
  const ttsReady = capability('Voice TTS')?.status === 'available'
  const githubReady = Boolean(repo?.githubTokenConfigured && repo.githubAuthenticated)
  const workspaceReady = Boolean(repo?.workspaceWritable && repo.gitInstalled)

  const tools = [
    entry({ id: 'github.repo.list', label: 'GitHub repo list', category: 'github', enabled: githubReady, wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['github'], endpoint: '/api/admin/repo-workbench/github/repos', lastError: githubReady ? null : 'GitHub token missing or failed validation.' }),
    entry({ id: 'github.branch.list', label: 'GitHub branch list', category: 'github', enabled: githubReady, wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['github'], endpoint: '/api/admin/repo-workbench/github/branches', lastError: githubReady ? null : 'GitHub token missing or failed validation.' }),
    entry({ id: 'repo.import', label: 'Repo import', category: 'repo', enabled: workspaceReady, wired: true, permission: 'write', approvalRequired: false, requiredConfig: ['git', 'workspace'], endpoint: '/api/admin/repo-workbench/import', lastError: workspaceReady ? null : repo?.blockers?.join('; ') ?? 'Repo workspace unavailable.' }),
    entry({ id: 'repo.tree', label: 'Repo tree', category: 'repo', enabled: workspaceReady, wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['workspace'], endpoint: '/api/admin/repo-workbench/[workspaceId]/tree', lastError: workspaceReady ? null : 'Repo workspace unavailable.' }),
    entry({ id: 'repo.diff', label: 'Repo diff', category: 'repo', enabled: workspaceReady, wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['workspace'], endpoint: '/api/admin/repo-workbench/[workspaceId]/diff', lastError: workspaceReady ? null : 'Repo workspace unavailable.' }),
    entry({ id: 'repo.patch', label: 'Repo patch', category: 'repo', enabled: Boolean(repo?.canPatch), wired: true, permission: 'write', approvalRequired: true, requiredConfig: ['ai_provider', 'workspace'], endpoint: '/api/admin/repo-workbench/[workspaceId]/patch', lastError: repo?.canPatch ? null : repo?.blockers?.join('; ') ?? 'Coding model/provider unavailable.' }),
    entry({ id: 'repo.check', label: 'Repo check runner', category: 'repo', enabled: Boolean(repo?.canRunChecks), wired: true, permission: 'write', approvalRequired: false, requiredConfig: ['workspace'], endpoint: '/api/admin/repo-workbench/[workspaceId]/run-check', lastError: repo?.canRunChecks ? null : 'Repo checks unavailable.' }),
    entry({ id: 'repo.commit', label: 'Repo commit', category: 'repo', enabled: Boolean(repo?.canCommit), wired: true, permission: 'write', approvalRequired: true, requiredConfig: ['git', 'workspace'], endpoint: '/api/admin/repo-workbench/[workspaceId]/commit', lastError: repo?.canCommit ? null : 'Commit prerequisites unavailable.' }),
    entry({ id: 'repo.pr', label: 'Repo PR', category: 'repo', enabled: Boolean(repo?.canCreatePr), wired: true, permission: 'write', approvalRequired: true, requiredConfig: ['github'], endpoint: '/api/admin/repo-workbench/[workspaceId]/pr', lastError: repo?.canCreatePr ? null : 'GitHub token missing, invalid, or lacks repository scope.' }),
    entry({ id: 'media.image.generate', label: 'Image generate', category: 'media', enabled: imageReady, wired: true, permission: 'write', approvalRequired: false, requiredConfig: ['image_provider'], endpoint: '/api/brain/image', lastError: imageReady ? null : capability('Image Generation')?.blocker ?? 'No working image provider.' }),
    entry({ id: 'media.video.generate', label: 'Video generate', category: 'media', enabled: videoReady, wired: true, permission: 'write', approvalRequired: true, requiredConfig: ['video_provider'], endpoint: '/api/brain/video-generate', lastError: videoReady ? null : capability('Video Generation')?.blocker ?? 'No working video provider.' }),
    entry({ id: 'media.tts', label: 'TTS', category: 'media', enabled: ttsReady, wired: true, permission: 'write', approvalRequired: false, requiredConfig: ['voice_provider'], endpoint: '/api/brain/tts', lastError: ttsReady ? null : capability('Voice TTS')?.blocker ?? 'No working TTS provider.' }),
    entry({ id: 'crawler.local', label: 'Local crawler', category: 'research', enabled: configured.has('local-crawler'), wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['local-crawler'], endpoint: '/api/admin/research/url', lastError: configured.has('local-crawler') ? null : 'Local crawler runtime has not passed its test.' }),
    entry({ id: 'vps.health', label: 'Local VPS health', category: 'vps', enabled: true, wired: true, permission: 'read', approvalRequired: false, requiredConfig: [], endpoint: '/api/admin/system/vps', lastError: null }),
    entry({ id: 'artifact.list', label: 'Artifact list', category: 'artifact', enabled: Boolean(storage?.configured && storage.writable), wired: true, permission: 'read', approvalRequired: false, requiredConfig: ['artifact_storage'], endpoint: '/api/admin/artifacts', lastError: storage?.configured && storage.writable ? null : storage?.error ?? 'Artifact storage unavailable.' }),
  ]

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    tools,
    mcpServers: {
      implemented: false,
      status: 'post_launch',
      blocker: 'External MCP server/client connections are not implemented yet. Internal tool registry is wired and audited separately.',
    },
  }
}
