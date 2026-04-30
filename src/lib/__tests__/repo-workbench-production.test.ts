import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  assertInsideWorkspace,
  getRepoWorkspaceRoot,
  sanitizeBranchName,
  sanitizeRepoSlug,
  validateCommand,
} from '@/lib/workspace-security'

describe('repo workbench production hardening', () => {
  const previousRoot = process.env.REPO_WORKSPACE_ROOT
  const previousCustom = process.env.REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS

  afterEach(() => {
    process.env.REPO_WORKSPACE_ROOT = previousRoot
    process.env.REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS = previousCustom
  })

  it('blocks workspace path traversal', () => {
    process.env.REPO_WORKSPACE_ROOT = '/tmp/amarktai-workspaces'
    expect(getRepoWorkspaceRoot()).toBe(path.resolve('/tmp/amarktai-workspaces'))
    expect(() => assertInsideWorkspace('/tmp/amarktai-workspaces/repos/app')).not.toThrow()
    expect(() => assertInsideWorkspace('/tmp/outside')).toThrow(/traversal/)
  })

  it('sanitizes repo and branch names', () => {
    expect(sanitizeRepoSlug('owner/repo')).toBe('owner/repo')
    expect(sanitizeBranchName('feature/workbench')).toBe('feature/workbench')
    expect(() => sanitizeRepoSlug('../repo')).toThrow(/Invalid/)
    expect(() => sanitizeBranchName('../main')).toThrow(/Invalid/)
  })

  it('allows only approved commands unless custom commands are explicitly enabled', () => {
    expect(validateCommand('npm run build').args).toEqual(['run', 'build'])
    expect(() => validateCommand('rm -rf /')).toThrow(/not allowed/)
    process.env.REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS = 'true'
    expect(() => validateCommand('echo ok; rm -rf /')).toThrow(/unsafe/)
  })

  it('repo workbench page wires required action labels', () => {
    const page = fs.readFileSync(path.resolve('src/app/admin/dashboard/repo-workbench/page.tsx'), 'utf8')
    for (const label of ['Save token', 'Import/sync', 'Create branch', 'Generate patch', 'Apply patch', 'Push', 'Create PR', 'Merge', 'Deploy']) {
      expect(page).toContain(label)
    }
  })
})
