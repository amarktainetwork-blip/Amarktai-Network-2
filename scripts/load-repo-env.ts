import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

console.log('BOOT')
console.log('ENV_LOAD_START')

const loadedFiles: string[] = []
const searchedEnvPaths: string[] = []
const foundEnvPaths: string[] = []
const mode = process.env.NODE_ENV?.trim() || 'production'
const candidates = [
  `.env.${mode}.local`,
  mode !== 'test' ? '.env.local' : null,
  `.env.${mode}`,
  '.env',
].filter((entry): entry is string => Boolean(entry))

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = findRepoRoot(process.cwd()) ?? findRepoRoot(scriptDir) ?? process.cwd()
const envRoots = uniquePaths([
  repoRoot,
  path.join(repoRoot, 'prisma'),
  process.cwd(),
  path.join(process.cwd(), 'prisma'),
  ...ancestorPaths(process.cwd(), 3),
])

for (const root of envRoots) {
  for (const filename of candidates) {
    const filePath = path.join(root, filename)
    searchedEnvPaths.push(filePath)
    if (!fs.existsSync(filePath)) continue
    foundEnvPaths.push(filePath)
    const parsed = expandEnvValues(parseEnvFile(fs.readFileSync(filePath, 'utf8')))
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value
      }
    }
    loadedFiles.push(path.relative(repoRoot, filePath) || filename)
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __AMARKTAI_ENV_DIAGNOSTICS__: {
    cwd: string
    repoRoot: string
    searchedEnvPaths: string[]
    foundEnvPaths: string[]
    loadedEnvPaths: string[]
  } | undefined
}

globalThis.__AMARKTAI_ENV_DIAGNOSTICS__ = {
  cwd: process.cwd(),
  repoRoot,
  searchedEnvPaths,
  foundEnvPaths,
  loadedEnvPaths: loadedFiles,
}

function findRepoRoot(start: string): string | null {
  for (const candidate of [start, ...ancestorPaths(start, 8)]) {
    const manifest = path.join(candidate, 'package.json')
    if (!fs.existsSync(manifest)) continue
    try {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name?: string }
      if (pkg.name === 'amarktai-network') return candidate
      if (fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma'))) return candidate
    } catch {
      if (fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma'))) return candidate
    }
  }
  return null
}

function ancestorPaths(start: string, maxDepth: number): string[] {
  const roots: string[] = []
  let current = path.resolve(start)
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const parent = path.dirname(current)
    if (parent === current) break
    roots.push(parent)
    current = parent
  }
  return roots
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  return paths
    .map((entry) => path.resolve(entry))
    .filter((entry) => {
      const key = process.platform === 'win32' ? entry.toLowerCase() : entry
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function expandEnvValues(values: Record<string, string>): Record<string, string> {
  const expanded: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    expanded[key] = value.replace(/\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, bare: string | undefined, braced: string | undefined) => {
      const name = bare ?? braced ?? ''
      return expanded[name] ?? values[name] ?? process.env[name] ?? ''
    })
  }
  return expanded
}

declare global {
  // eslint-disable-next-line no-var
  var __AMARKTAI_LOADED_ENV_FILES__: string[] | undefined
}

globalThis.__AMARKTAI_LOADED_ENV_FILES__ = loadedFiles
console.log(`ENV_LOAD_DONE ${JSON.stringify({
  cwd: process.cwd(),
  repoRoot,
  foundEnvPaths,
  loadedEnvPaths: loadedFiles,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
})}`)

function parseEnvFile(source: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/)
    if (!match) continue
    values[match[1]] = parseEnvValue(match[2])
  }
  return values
}

function parseEnvValue(raw: string): string {
  const trimmed = stripComment(raw.trim())
  if (!trimmed) return ''
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const inner = trimmed.slice(1, -1)
    return quote === '"'
      ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : inner
  }
  return trimmed
}

function stripComment(value: string): string {
  let quote: '"' | "'" | null = null
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if ((char === '"' || char === "'") && value[index - 1] !== '\\') {
      quote = quote === char ? null : quote ?? char
      continue
    }
    if (char === '#' && !quote && /\s/.test(value[index - 1] ?? ' ')) {
      return value.slice(0, index).trimEnd()
    }
  }
  return value
}
