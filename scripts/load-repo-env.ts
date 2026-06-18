import fs from 'node:fs'
import path from 'node:path'

const loadedFiles: string[] = []
const mode = process.env.NODE_ENV?.trim() || 'production'
const candidates = [
  `.env.${mode}.local`,
  mode !== 'test' ? '.env.local' : null,
  `.env.${mode}`,
  '.env',
].filter((entry): entry is string => Boolean(entry))

for (const filename of candidates) {
  const filePath = path.join(process.cwd(), filename)
  if (!fs.existsSync(filePath)) continue
  const parsed = parseEnvFile(fs.readFileSync(filePath, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value
  }
  loadedFiles.push(filename)
}

declare global {
  // eslint-disable-next-line no-var
  var __AMARKTAI_LOADED_ENV_FILES__: string[] | undefined
}

globalThis.__AMARKTAI_LOADED_ENV_FILES__ = loadedFiles

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
