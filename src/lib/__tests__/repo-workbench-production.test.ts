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

  it('repo workbench page wires required canonical action labels', () => {
    const page = fs.readFileSync(path.resolve('src/app/admin/dashboard/repo-workbench/page.tsx'), 'utf8')
    for (const label of [
      'GitHub connection status',
      'Repo selector from connected GitHub account',
      'Import / clone',
      'Tell Aiva what to change',
      'Plan',
      'Generate diff',
      'Apply patch',
      'Run lint',
      'Commit',
      'Push',
      'Create PR',
      'Logs panel',
    ]) {
      expect(page, `missing label: ${label}`).toContain(label)
    }
  })

  it('repo workbench page does not contain banned legacy strings', () => {
    const page = fs.readFileSync(path.resolve('src/app/admin/dashboard/repo-workbench/page.tsx'), 'utf8')
    for (const banned of ['AGENT_PRESETS', 'GenX Best', 'genx_best', 'Safe Repo Workbench Test', 'GitHub PAT', 'ENABLE_DEPLOY_ACTIONS', 'File Explorer']) {
      expect(page, `banned legacy string found: ${banned}`).not.toContain(banned)
    }
  })

  it('/admin/dashboard/repo-workbench/simple does not exist', () => {
    expect(fs.existsSync(path.resolve('src/app/admin/dashboard/repo-workbench/simple/page.tsx'))).toBe(false)
  })

  it('adds safe test and live readiness routes', () => {
    expect(fs.existsSync(path.resolve('src/app/api/admin/repo-workbench/safe-test/route.ts'))).toBe(true)
    expect(fs.existsSync(path.resolve('src/app/api/admin/system/live-readiness/route.ts'))).toBe(true)
    const safeTestRoute = fs.readFileSync(path.resolve('src/app/api/admin/repo-workbench/safe-test/route.ts'), 'utf8')
    expect(safeTestRoute).toContain('test/repo-workbench-healthcheck')
    expect(safeTestRoute).toContain('GitHub PAT is required')
    expect(safeTestRoute).toContain('createArtifact')
  })

  it('media studio uses runtime-backed model choices and artifact persistence', () => {
    const mediaPage = fs.readFileSync(path.resolve('src/app/admin/dashboard/media-studio/page.tsx'), 'utf8')
    const modelsRoute = fs.readFileSync(path.resolve('src/app/api/admin/media-studio/models/route.ts'), 'utf8')
    expect(mediaPage).toContain('/api/admin/media-studio/models')
    expect(mediaPage).toContain('/api/admin/artifacts')
    expect(modelsRoute).toContain('GENX_IMAGE_MODELS')
    expect(modelsRoute).toContain('GENX_VIDEO_MODELS')
    expect(modelsRoute).toContain('GENX_TTS_MODELS')
    expect(modelsRoute).toContain('GENX_AUDIO_MODELS')
  })
})
