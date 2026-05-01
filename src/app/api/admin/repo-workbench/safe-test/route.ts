import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { getGitHubToken } from '@/lib/repo-workbench'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import { redactSecretsFromLogs, resolveWorkspacePath } from '@/lib/workspace-security'

const execFileAsync = promisify(execFile)
const SAFE_BRANCH = 'test/repo-workbench-healthcheck'

async function runGit(cwd: string, args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      timeout: 120_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 5,
    })
    return { ok: true, command: `git ${args.join(' ')}`, output: redactSecretsFromLogs(`${stdout}${stderr}`.trim()) }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      ok: false,
      command: `git ${args.join(' ')}`,
      output: redactSecretsFromLogs(`${err.stdout ?? ''}${err.stderr ?? ''}${err.message ?? ''}`.trim()),
    }
  }
}

function step(name: string, ok: boolean, output: string, command?: string) {
  return { name, ok, command, output, at: new Date().toISOString() }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { confirmPush?: boolean; cleanup?: boolean }
  const status = await getRepoWorkbenchStatus()
  const token = await getGitHubToken()
  const steps: ReturnType<typeof step>[] = []

  if (!token) {
    return NextResponse.json({
      success: false,
      setupRequired: true,
      error: 'GitHub PAT is required before running the Safe Repo Workbench Test.',
      blockers: ['Configure GitHub token in Settings or Repo Workbench.'],
    }, { status: 400 })
  }

  if (!status.gitInstalled || !status.workspaceWritable) {
    return NextResponse.json({
      success: false,
      setupRequired: true,
      error: 'Repo Workbench prerequisites are not ready.',
      blockers: status.blockers,
    }, { status: 503 })
  }

  const workspace = resolveWorkspacePath('repos', 'repo-workbench__safe-test')
  const docsDir = path.join(workspace, 'docs')
  const testFile = path.join(docsDir, 'repo-workbench-healthcheck.md')

  try {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.mkdir(docsDir, { recursive: true })
    steps.push(step('Create safe local workspace', true, workspace))

    for (const args of [
      ['init'],
      ['checkout', '-B', SAFE_BRANCH],
      ['config', 'user.name', process.env.GIT_AUTHOR_NAME || 'Amarktai Agent'],
      ['config', 'user.email', process.env.GIT_AUTHOR_EMAIL || 'amarktainetwork@gmail.com'],
    ]) {
      const result = await runGit(workspace, args)
      steps.push(step(result.command, result.ok, result.output, result.command))
      if (!result.ok) throw new Error(result.output || `${result.command} failed`)
    }

    await fs.writeFile(testFile, `# Repo Workbench Healthcheck\n\nGenerated at ${new Date().toISOString()} on branch \`${SAFE_BRANCH}\`.\n`, 'utf8')
    steps.push(step('Write harmless healthcheck file', true, 'docs/repo-workbench-healthcheck.md'))

    for (const args of [
      ['status', '--short'],
      ['diff', '--', 'docs/repo-workbench-healthcheck.md'],
      ['add', 'docs/repo-workbench-healthcheck.md'],
      ['commit', '-m', 'Add Repo Workbench healthcheck file'],
      ['status', '--short'],
    ]) {
      const result = await runGit(workspace, args)
      steps.push(step(result.command, result.ok, result.output, result.command))
      if (!result.ok && args[0] !== 'diff') throw new Error(result.output || `${result.command} failed`)
    }

    const diff = await runGit(workspace, ['show', '--stat', '--oneline', 'HEAD'])
    steps.push(step(diff.command, diff.ok, diff.output, diff.command))

    const pushMode = body.confirmPush === true && process.env.REPO_WORKBENCH_SAFE_TEST_REPO
    if (pushMode) {
      steps.push(step('Remote push', false, 'Not executed by this local safety route. Configure a dedicated safe-test repository route before enabling remote pushes.'))
    } else {
      steps.push(step('PR simulation', true, 'Push/PR simulated only. Set REPO_WORKBENCH_SAFE_TEST_REPO and add a dedicated safe-test remote flow before real remote writes.'))
    }

    const log = steps.map((item) => `[${item.ok ? 'ok' : 'fail'}] ${item.name}\n${item.output}`).join('\n\n')
    let artifactId: string | null = null
    try {
      const artifact = await createArtifact({
        appSlug: 'repo-workbench',
        type: 'report',
        subType: 'safe_test',
        title: 'Repo Workbench Safe Test',
        description: 'Local guided healthcheck flow for Repo Workbench git operations.',
        provider: 'repo-workbench',
        model: 'safe-local-git',
        content: Buffer.from(log, 'utf8'),
        mimeType: 'text/plain',
        metadata: { branch: SAFE_BRANCH, simulatedPr: !pushMode },
      })
      artifactId = artifact.id
    } catch {
      artifactId = null
    }

    if (body.cleanup) {
      await fs.rm(workspace, { recursive: true, force: true })
      steps.push(step('Cleanup safe workspace', true, 'Safe test workspace removed.'))
    }

    return NextResponse.json({
      success: true,
      mode: pushMode ? 'remote-disabled-by-route' : 'local-simulated-pr',
      branch: SAFE_BRANCH,
      workspace,
      artifactId,
      steps,
      summary: 'Safe Repo Workbench Test completed without touching main or any imported production repo.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Safe Repo Workbench Test failed'
    return NextResponse.json({
      success: false,
      error: message,
      steps,
    }, { status: 500 })
  }
}
