import { execFile } from 'child_process'
import { promisify } from 'util'
import { getProviderKey } from '@/lib/provider-config'
import { getStorageRoot, verifyStorage } from '@/lib/storage-driver'

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
    workspaceRoot: getStorageRoot(),
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
  const storage = await verifyStorage()
  return {
    ready: storage.ready,
    writable: storage.writable,
    readable: storage.readable,
    deletable: storage.deletable,
    root: storage.root,
    checkedAt: storage.checkedAt,
    status: storage.ready ? 'Writable' : storage.error ?? storage.note,
  }
}
