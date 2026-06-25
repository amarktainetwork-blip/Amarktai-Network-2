/**
 * Deploy Blocker Fixes Tests
 *
 * Proves:
 *  1. No route conflict between providers/[id] and providers/[key] in manifests after build
 *  2. Provider test API path [id]/test still exists and is the canonical route
 *  3. Dashboard providers page still uses allowed providers only (GenX, HF, Together, Groq, MiMo)
 *  4. package.json has worker script
 *  5. Worker script points to scripts/worker.mjs
 *  6. Removed providers are not shown as active providers
 *  7. Patch script exists and only copies standalone assets
 */

import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ROOT = join(__dirname, '../../..')

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8')
}

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf-8')) as Record<string, unknown>
}

// ── 1. Route conflict: [key] must not appear in built manifests ───────────────

describe('Route conflict: [key] removed from built manifests', () => {
  it('app-path-routes-manifest.json does not contain [key] route after build', () => {
    const manifestPath = join(ROOT, '.next/app-path-routes-manifest.json')
    if (!existsSync(manifestPath)) {
      console.warn('Build manifest not found — run npm run build first')
      return
    }
    const manifest = readJson('.next/app-path-routes-manifest.json')
    const keys = Object.keys(manifest)
    const keyRoutes = keys.filter(k => k.includes('[key]'))
    expect(keyRoutes).toHaveLength(0)
  })

  it('server/app-paths-manifest.json does not contain [key] route after build', () => {
    const manifestPath = join(ROOT, '.next/server/app-paths-manifest.json')
    if (!existsSync(manifestPath)) {
      console.warn('Server manifest not found — run npm run build first')
      return
    }
    const manifest = readJson('.next/server/app-paths-manifest.json')
    const keys = Object.keys(manifest)
    const keyRoutes = keys.filter(k => k.includes('[key]'))
    expect(keyRoutes).toHaveLength(0)
  })

  it('[id]/test route still exists in app-path-routes-manifest after patch', () => {
    const manifestPath = join(ROOT, '.next/app-path-routes-manifest.json')
    if (!existsSync(manifestPath)) return
    const manifest = readJson('.next/app-path-routes-manifest.json')
    const keys = Object.keys(manifest)
    expect(keys.some(k => k.includes('[id]') && k.includes('test'))).toBe(true)
  })

  it('[key]/test route source is deleted', () => {
    expect(existsSync(join(ROOT, 'src/app/api/admin/providers/[key]/test/route.ts'))).toBe(false)
    expect(existsSync(join(ROOT, 'src/app/api/admin/providers/[key]'))).toBe(false)
  })

  it('patch-manifests.mjs script exists', () => {
    expect(existsSync(join(ROOT, 'scripts/patch-manifests.mjs'))).toBe(true)
  })

  it('patch-manifests.mjs does not patch route manifests', () => {
    const src = readSrc('scripts/patch-manifests.mjs')
    expect(src).not.toContain('[key]')
    expect(src).not.toContain('app-path-routes-manifest')
    expect(src).not.toContain('app-paths-manifest')
    expect(src).toContain('Route manifests are not')
  })

  it('patch-manifests.mjs copies standalone static and public assets', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'amarktai-standalone-assets-'))
    try {
      mkdirSync(join(tempRoot, '.next/static/css'), { recursive: true })
      mkdirSync(join(tempRoot, '.next/static/chunks'), { recursive: true })
      mkdirSync(join(tempRoot, '.next/server'), { recursive: true })
      mkdirSync(join(tempRoot, '.next/standalone'), { recursive: true })
      mkdirSync(join(tempRoot, 'public/images'), { recursive: true })

      writeFileSync(join(tempRoot, '.next/static/css/app.css'), 'body{}')
      writeFileSync(join(tempRoot, '.next/static/chunks/app.js'), 'console.log("ok")')
      writeFileSync(join(tempRoot, 'public/images/logo.txt'), 'logo')
      execFileSync(process.execPath, [join(ROOT, 'scripts/patch-manifests.mjs')], {
        cwd: tempRoot,
        stdio: 'pipe',
      })

      expect(existsSync(join(tempRoot, '.next/standalone/.next/static/css/app.css'))).toBe(true)
      expect(existsSync(join(tempRoot, '.next/standalone/.next/static/chunks/app.js'))).toBe(true)
      expect(existsSync(join(tempRoot, '.next/standalone/public/images/logo.txt'))).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

// ── 2. Provider test API [id]/test exists ─────────────────────────────────────

describe('Provider test API: [id]/test is the canonical route', () => {
  it('[id]/test/route.ts exports a POST handler', () => {
    const src = readSrc('src/app/api/admin/providers/[id]/test/route.ts')
    expect(src).toContain('export async function POST')
  })

  it('[id]/test handler uses id as param name', () => {
    const src = readSrc('src/app/api/admin/providers/[id]/test/route.ts')
    expect(src).toContain('{ params }')
    expect(src).toContain('id: string')
  })

  it('[id]/test handler only tests active providers', () => {
    const src = readSrc('src/app/api/admin/providers/[id]/test/route.ts')
    expect(src).toContain("'genx'")
    expect(src).toContain("'huggingface'")
    expect(src).toContain("'together'")
    expect(src).toContain("'groq'")
    expect(src).toContain("'mimo'")
    expect(src).toContain('ACTIVE_PROVIDER_KEYS')
  })
})

// ── 3. Dashboard providers page: allowed providers only ───────────────────────

describe('Dashboard providers page: only 5 active providers', () => {
  const ACTIVE = ['genx', 'huggingface', 'together', 'groq', 'mimo']
  const REMOVED = ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'minimax', 'mistral']

  it('providers page ALLOWED_PROVIDER_KEYS contains exactly the 5 active providers', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    for (const key of ACTIVE) {
      expect(src).toContain(`'${key}'`)
    }
  })

  it('providers page filters to ALLOWED_PROVIDER_KEYS', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    expect(src).toContain('ALLOWED_PROVIDER_KEYS')
    expect(src).toContain('.filter(')
  })

  it('providers page does not list removed providers as selectable keys', () => {
    const src = readSrc('src/app/admin/dashboard/providers/page.tsx')
    for (const key of REMOVED) {
      expect(src).not.toMatch(new RegExp(`ALLOWED_PROVIDER_KEYS\\s*=\\s*\\[.*'${key}'`, 's'))
    }
  })
})

// ── 4 & 5. package.json: worker script ───────────────────────────────────────

describe('package.json: worker script', () => {
  it('package.json has a worker script', () => {
    const pkg = readJson('package.json')
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts).toHaveProperty('worker')
  })

  it('worker script points to scripts/worker.mjs', () => {
    const pkg = readJson('package.json')
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.worker).toContain('scripts/worker.mjs')
  })

  it('worker script references an installed executable or node runtime', () => {
    const pkg = readJson('package.json') as {
      scripts?: Record<string, string>
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const workerScript = pkg.scripts?.worker ?? ''
    const executable = workerScript.split(/\s+/)[0]
    const installed = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }

    expect(executable).toBeTruthy()
    expect(executable === 'node' || Object.prototype.hasOwnProperty.call(installed, executable)).toBe(true)
  })

  it('scripts/worker.mjs exists', () => {
    expect(existsSync(join(ROOT, 'scripts/worker.mjs'))).toBe(true)
  })

  it('npm run worker resolves the executable and logs startup', () => {
    const env = { ...process.env }
    delete env.REDIS_URL
    const result = spawnSync('npm run worker --silent', {
      cwd: ROOT,
      env,
      encoding: 'utf-8',
      shell: true,
      timeout: 20_000,
    })

    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`
    expect(result.status).not.toBe(127)
    expect(output).toContain('[worker] AmarktAI Network Worker starting...')
    expect(output).toContain('REDIS_URL is required')
  }, 30_000)

  it('package.json has postbuild script that runs the manifest patch', () => {
    const pkg = readJson('package.json')
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts).toHaveProperty('postbuild')
    expect(scripts.postbuild).toContain('patch-manifests.mjs')
  })
})

// ── 6. Removed providers not active ──────────────────────────────────────────

describe('Removed providers: not shown as active', () => {
  const REMOVED = ['openai', 'gemini', 'anthropic', 'deepseek', 'qwen', 'minimax',
    'moonshot', 'openrouter', 'mistral', 'cohere', 'nvidia', 'replicate']

  it('[id]/test route does not allow removed providers', () => {
    const src = readSrc('src/app/api/admin/providers/[id]/test/route.ts')
    for (const key of REMOVED) {
      expect(src).not.toContain(`'${key}'`)
    }
  })

  it('vps-monitoring ACTIVE_PROVIDERS does not include removed providers', () => {
    const src = readSrc('src/lib/vps-monitoring.ts')
    expect(src).toContain("'genx'")
    expect(src).toContain("'huggingface'")
    expect(src).toContain("'together'")
    expect(src).toContain("'groq'")
    expect(src).toContain("'mimo'")
    for (const key of REMOVED) {
      expect(src).not.toMatch(new RegExp(`ACTIVE_PROVIDERS.*'${key}'`, 's'))
    }
  })

  it('provider-capability-map only lists active providers', () => {
    const src = readSrc('src/lib/provider-capability-map.ts')
    for (const key of REMOVED) {
      expect(src).not.toMatch(new RegExp(`provider:\\s*'${key}'`))
    }
  })
})
