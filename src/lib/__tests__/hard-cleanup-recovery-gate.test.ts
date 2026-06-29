import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

const ROOT = path.resolve(__dirname, '../../')
const REPO = path.resolve(ROOT, '../')
const read = (relPath: string) => fs.readFileSync(path.join(REPO, relPath), 'utf8')

const REMOVED_PROVIDER_KEYS = [
  'qwen',
  'dashscope',
  'wanx',
  'minimax',
  'openai',
  'gemini',
  'anthropic',
  'openrouter',
  'deepseek',
  'moonshot',
  'replicate',
  'cohere',
  'nvidia',
  'mistral',
] as const

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') return []
      if (entry.name === '__tests__') return []
      if (fullPath.includes(`${path.sep}__tests__${path.sep}`)) return []
      return walk(fullPath)
    }
    return fullPath
  })
}

describe('hard cleanup and recovery gate', () => {
  it('removes old audit/report/truth/proof documents and final audit folders', () => {
    expect(fs.existsSync(path.join(REPO, 'docs/audits'))).toBe(false)
    expect(fs.existsSync(path.join(REPO, 'docs/forensic'))).toBe(false)

    const rootMarkdown = fs.readdirSync(REPO)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .filter((name) => name !== 'README.md')
    expect(rootMarkdown).toEqual([])
  })

  it('removes obsolete final proof scripts and conflicting provider routes', () => {
    for (const script of [
      'scripts/final_go_live_audit.sh',
      'scripts/final_live_certification.sh',
      'scripts/final_product_proof.sh',
      'scripts/final_proof.sh',
    ]) {
      expect(fs.existsSync(path.join(REPO, script))).toBe(false)
    }

    expect(fs.existsSync(path.join(REPO, 'src/app/api/admin/providers/[key]'))).toBe(false)
    expect(fs.existsSync(path.join(REPO, 'src/app/api/admin/providers/[id]/test/route.ts'))).toBe(true)
  })

  it('keeps postbuild support asset-only with no manifest route patching', () => {
    const source = read('scripts/patch-manifests.mjs')
    expect(source).toContain('Standalone assets verified')
    expect(source).not.toContain('[key]')
    expect(source).not.toContain('app-path-routes-manifest')
    expect(source).not.toContain('app-paths-manifest')
  })

  it('does not use removed providers as active provider keys in runtime source', () => {
    const removed = REMOVED_PROVIDER_KEYS.join('|')
    const activeProviderPattern = new RegExp(
      `getVaultApiKey\\(['"](${removed})['"]\\)|` +
      `callProvider\\(['"](${removed})['"]|` +
      `provider\\s*:\\s*['"](${removed})['"]|` +
      `providerKey\\s*:\\s*['"](${removed})['"]|` +
      `case\\s+['"](${removed})['"]`,
    )
    const sourceFiles = walk(path.join(REPO, 'src'))
      .concat(walk(path.join(REPO, 'scripts')))
      .concat([path.join(REPO, 'prisma/seed.ts')])
      .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file))
      .filter((file) => !file.includes(`${path.sep}model-registry.ts`))
      .filter((file) => !file.includes(`${path.sep}adult-model-catalog.ts`))
      .filter((file) => !file.includes(`${path.sep}hf-fallback.ts`))

    for (const file of sourceFiles) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source, `${path.relative(REPO, file)} should not match ${activeProviderPattern}`).not.toMatch(activeProviderPattern)
    }
  }, 30_000)

  it('keeps exactly the active AI provider set in provider admin source', () => {
    const providerRoute = read('src/app/api/admin/providers/[id]/test/route.ts')
    for (const key of ACTIVE_PROVIDER_KEYS) expect(providerRoute).toContain(`'${key}'`)
    for (const key of REMOVED_PROVIDER_KEYS) expect(providerRoute).not.toContain(`'${key}'`)
  })

  it('has a Prisma baseline migration and schema coverage for artifact persistence', () => {
    const migrations = fs.readdirSync(path.join(REPO, 'prisma/migrations'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(REPO, 'prisma/migrations', entry.name, 'migration.sql'))
    expect(migrations.some((migration) => fs.existsSync(migration))).toBe(true)

    const schema = read('prisma/schema.prisma')
    for (const model of ['AiProvider', 'IntegrationConfig', 'Artifact']) {
      expect(schema).toMatch(new RegExp(`model\\s+${model}\\s+\\{`))
    }
    expect(schema).toContain('@@map("artifacts")')
  })

  it('keeps Prisma migration SQL files free of UTF-8 BOM markers', () => {
    const migrations = fs.readdirSync(path.join(REPO, 'prisma/migrations'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(REPO, 'prisma/migrations', entry.name, 'migration.sql'))
      .filter((migration) => fs.existsSync(migration))

    expect(migrations.length).toBeGreaterThan(0)
    for (const migration of migrations) {
      const bytes = fs.readFileSync(migration)
      const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
      const text = bytes.toString('utf8')
      expect(hasUtf8Bom, `${path.relative(REPO, migration)} starts with EF BB BF`).toBe(false)
      expect(text.charCodeAt(0), `${path.relative(REPO, migration)} starts with U+FEFF`).not.toBe(0xFEFF)
    }
  })

  it('exposes an admin-only recovery count route without returning secret values', () => {
    const route = read('src/app/api/admin/settings/recovery-counts/route.ts')
    expect(route).toContain('getSession')
    expect(route).toContain('Unauthorized')
    expect(route).toContain('encryptedLength')
    expect(route).toContain('maskedPreview')
    expect(route).not.toContain('decrypt')
    expect(route).not.toContain('apiKey: row.apiKey')
  })

  it('keeps the public home and dashboard platform-first', () => {
    const home = read('src/app/page.tsx')
    const fabric = read('src/components/public/IntelligenceFabric.tsx')
    expect(home).toContain('runtime-workflow')
    expect(home).not.toContain('marketing-workflow')
    expect(home).not.toContain('System health')
    expect(home).not.toContain("status: 'healthy'")
    expect(fabric).not.toContain('Core OS')
    expect(fabric).not.toContain('Runtime Truth')

    const navLabels = DASHBOARD_NAV_ITEMS.map((item) => item.label)
    expect(navLabels).toContain('Command Center')
    expect(navLabels).toContain('Studio')
    expect(navLabels).toContain('Capabilities')
    expect(navLabels).toContain('Settings')
    expect(navLabels).toContain('System')
    expect(navLabels).not.toContain('Marketing')
    expect(navLabels).not.toContain('Approvals')
    expect(navLabels).not.toContain('Scheduler/Publishing')
  })
})
