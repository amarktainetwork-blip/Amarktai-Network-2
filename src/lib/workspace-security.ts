import path from 'path'

const DEFAULT_WORKSPACE_ROOT = '/var/amarktai/workspaces'

export type AllowedWorkbenchCommand =
  | 'npm ci'
  | 'npm install'
  | 'npm run lint'
  | 'npm test'
  | 'npm run build'
  | 'npx prisma generate'
  | 'npx prisma db push'
  | 'npm audit --audit-level=moderate'
  | 'git status'
  | 'git diff --stat'

export const ALLOWED_WORKBENCH_COMMANDS: Record<AllowedWorkbenchCommand, { command: string; args: string[]; timeoutMs: number }> = {
  'npm ci': { command: 'npm', args: ['ci'], timeoutMs: 300_000 },
  'npm install': { command: 'npm', args: ['install'], timeoutMs: 300_000 },
  'npm run lint': { command: 'npm', args: ['run', 'lint'], timeoutMs: 240_000 },
  'npm test': { command: 'npm', args: ['test'], timeoutMs: 300_000 },
  'npm run build': { command: 'npm', args: ['run', 'build'], timeoutMs: 600_000 },
  'npx prisma generate': { command: 'npx', args: ['prisma', 'generate'], timeoutMs: 180_000 },
  'npx prisma db push': { command: 'npx', args: ['prisma', 'db', 'push'], timeoutMs: 240_000 },
  'npm audit --audit-level=moderate': { command: 'npm', args: ['audit', '--audit-level=moderate'], timeoutMs: 240_000 },
  'git status': { command: 'git', args: ['status', '--short'], timeoutMs: 60_000 },
  'git diff --stat': { command: 'git', args: ['diff', '--stat'], timeoutMs: 60_000 },
}

export function getRepoWorkspaceRoot(): string {
  return path.resolve(process.env.REPO_WORKSPACE_ROOT || DEFAULT_WORKSPACE_ROOT)
}

export function resolveWorkspacePath(...segments: string[]): string {
  const root = getRepoWorkspaceRoot()
  const target = path.resolve(root, ...segments)
  assertInsideWorkspace(target)
  return target
}

export function assertInsideWorkspace(targetPath: string): void {
  const root = getRepoWorkspaceRoot()
  const target = path.resolve(targetPath)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Workspace path traversal blocked')
  }
}

export function sanitizeRepoSlug(value: string): string {
  const slug = value.trim().replace(/\\/g, '/')
  if (slug.includes('..') || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(slug)) {
    throw new Error('Invalid repository name. Expected owner/repo.')
  }
  return slug
}

export function sanitizeBranchName(value: string): string {
  const branch = value.trim()
  if (!branch || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/') || branch.includes('\\')) {
    throw new Error('Invalid branch name')
  }
  if (!/^[a-zA-Z0-9/_@{}#.-]+$/.test(branch)) {
    throw new Error('Invalid branch name')
  }
  return branch
}

export function validateCommand(command: string): { command: string; args: string[]; label: string; timeoutMs: number } {
  const normalized = command.trim().replace(/\s+/g, ' ')
  const spec = ALLOWED_WORKBENCH_COMMANDS[normalized as AllowedWorkbenchCommand]
  if (spec) return { ...spec, label: normalized }

  if (process.env.REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS === 'true') {
    if (/[;&|`$<>]/.test(normalized)) throw new Error('Custom command contains unsafe shell metacharacters')
    const [cmd, ...args] = normalized.split(' ').filter(Boolean)
    if (!cmd) throw new Error('Command is required')
    return { command: cmd, args, label: normalized, timeoutMs: 300_000 }
  }

  throw new Error(`Command is not allowed: ${normalized}`)
}

export function redactSecretsFromLogs(text: string): string {
  return text
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, '[redacted-github-token]')
    .replace(/gnxk_[A-Za-z0-9_]+/g, '[redacted-genx-key]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-api-key]')
    .replace(/(api[_-]?key|token|secret|password|authorization)=([^\s]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}
