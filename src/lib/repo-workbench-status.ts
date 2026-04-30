import { execFile } from 'child_process'
import fs from 'fs/promises'
import { promisify } from 'util'
import { getGenXStatusAsync } from '@/lib/genx-client'
import { getGitHubToken, getRepoStorageRoot } from '@/lib/repo-workbench'
import { isProviderConfigured } from '@/lib/provider-config'

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

export async function getRepoWorkbenchStatus() {
  const [gitInstalled, ghInstalled, githubToken, writable, genx, openai, groq, gemini] = await Promise.all([
    commandInstalled('git'),
    commandInstalled('gh'),
    getGitHubToken(),
    workspaceWritable(),
    getGenXStatusAsync(),
    isProviderConfigured('openai'),
    isProviderConfigured('groq'),
    isProviderConfigured('gemini'),
  ])

  const aiAvailable = genx.available || openai || groq || gemini
  const blockers: string[] = []
  if (!gitInstalled) blockers.push('git is not installed on the server')
  if (!writable) blockers.push('repo workspace storage is not writable')
  if (!aiAvailable) blockers.push('no GenX or direct coding provider is available for planning/patching')
  if (!githubToken) blockers.push('GitHub token is not configured; push and PR actions are disabled')

  return {
    gitInstalled,
    ghInstalled,
    githubTokenConfigured: !!githubToken,
    workspaceWritable: writable,
    genxAvailable: genx.available,
    canImport: gitInstalled && writable,
    canPatch: gitInstalled && writable && aiAvailable,
    canCommit: gitInstalled && writable,
    canPush: gitInstalled && writable && !!githubToken,
    canCreatePr: gitInstalled && writable && !!githubToken,
    blockers,
  }
}
