import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { getProviderKey } from '@/lib/provider-config'
import { getRepoWorkspaceRoot, resolveWorkspacePath } from '@/lib/workspace-security'

const execFileAsync = promisify(execFile)

export async function getSystemRuntimeStatus() {
  const [git, node, storage, webdockKey] = await Promise.all([
    commandVersion('git'),
    commandVersion('node'),
    storageWritable(),
    getProviderKey('webdock').catch(() => null),
  ])

  return {
    vps: {
      provider: 'Webdock',
      configured: Boolean(webdockKey || process.env.WEBDOCK_API_KEY),
      status: webdockKey || process.env.WEBDOCK_API_KEY ? 'Configured' : 'Needs key/test',
    },
    services: [
      { name: 'git', status: git ? 'Available' : 'Unavailable', version: git },
      { name: 'node', status: node ? 'Available' : 'Unavailable', version: node },
    ],
    storage,
    workspaceRoot: getRepoWorkspaceRoot(),
  }
}

async function commandVersion(command: string) {
  try {
    const result = await execFileAsync(command, ['--version'], { timeout: 5_000, windowsHide: true })
    return String(result.stdout || result.stderr).trim()
  } catch {
    return ''
  }
}

async function storageWritable() {
  try {
    const target = resolveWorkspacePath('storage-probe')
    await fs.mkdir(target, { recursive: true })
    const file = path.join(target, `.probe-${process.pid}-${Date.now()}`)
    await fs.writeFile(file, 'ok', 'utf8')
    await fs.unlink(file)
    return { writable: true, status: 'Writable' }
  } catch (error) {
    return { writable: false, status: error instanceof Error ? error.message : 'Storage check failed' }
  }
}
