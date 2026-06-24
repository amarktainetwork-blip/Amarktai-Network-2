import { execFile } from 'child_process'
import fs from 'fs/promises'
import { promisify } from 'util'
import { getGenXStatusAsync } from '@/lib/genx-client'
import { getGitHubToken, getRepoStorageRoot } from '@/lib/repo-workbench'
import { isProviderConfigured } from '@/lib/provider-config'
import { getRepoWorkspaceRoot } from '@/lib/workspace-security'

const execFileAsync = promisify(execFile)

async function commandInstalled(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ['--version'], { timeout: 5_000, windowsHide: true })
    return true
  } catch {
    return false
  }
}

async function workspaceWritable(): Promise<boolean> {
  try {
    const root = getRepoStorageRoot()
    await fs.mkdir(root, { recursive: true })
    const probe = `${root}/.write-probe-${process.pid}-${Date.now()}`
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return true
  } catch {
    return false
  }
}

async function githubAuthenticated(token: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getRepoWorkbenchStatus() {
  const [gitInstalled, ghInstalled, githubToken, writable, genx, groq, together] = await Promise.all([
    commandInstalled('git'),
    commandInstalled('gh'),
    getGitHubToken(),
    workspaceWritable(),
    getGenXStatusAsync(),
    isProviderConfigured('groq'),
    isProviderConfigured('together'),
  ])

  const githubOk = await githubAuthenticated(githubToken)
  const aiAvailable = genx.available || groq || together
  const blockers: string[] = []
  const warnings: string[] = []
  if (!gitInstalled) blockers.push('git is not installed on the server')
  if (!writable) blockers.push('repo workspace storage is not writable')
  if (!aiAvailable) blockers.push('no GenX or direct coding provider is available for planning/patching')
  if (!githubToken) blockers.push('GitHub token is not configured; push and PR actions are disabled')
  if (githubToken && !githubOk) blockers.push('GitHub token is configured but failed validation')
  if (!ghInstalled && githubToken) warnings.push('GitHub CLI is missing; Repo Workbench will use GitHub API fallback where possible')

  return {
    workspaceRoot: getRepoWorkspaceRoot(),
    workspaceExists: writable,
    gitInstalled,
    ghInstalled,
    githubTokenConfigured: !!githubToken,
    githubAuthenticated: githubOk,
    workspaceWritable: writable,
    genxConfigured: genx.configured,
    genxAvailable: genx.available,
    directProviderAvailable: groq || together,
    canListRepos: !!githubToken && githubOk,
    canImport: gitInstalled && writable,
    canReadFiles: gitInstalled && writable,
    canEditFiles: gitInstalled && writable,
    canPlan: gitInstalled && writable && aiAvailable,
    canPatch: gitInstalled && writable && aiAvailable,
    canRunChecks: gitInstalled && writable,
    canCommit: gitInstalled && writable,
    canPush: gitInstalled && writable && !!githubToken && githubOk,
    canCreatePr: gitInstalled && writable && !!githubToken && githubOk,
    canMergePr: process.env.REPO_WORKBENCH_ALLOW_MERGE === 'true' && gitInstalled && writable && !!githubToken && githubOk,
    canDeploy: process.env.REPO_WORKBENCH_ALLOW_DEPLOY === 'true' && gitInstalled && writable,
    blockers,
    warnings,
  }
}
