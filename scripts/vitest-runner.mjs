import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--runInBand')
const vitestArgs = ['run', ...forwardedArgs]
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const vitestEntrypoint = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs')

const result = spawnSync(process.execPath, [vitestEntrypoint, ...vitestArgs], {
  stdio: 'inherit',
  shell: false,
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
