import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const standaloneRoot = path.join(root, '.next', 'standalone')
const standaloneServer = path.join(standaloneRoot, 'server.js')

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) return false
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true })
  return true
}

if (!fs.existsSync(standaloneServer)) {
  console.log('[postbuild] Next standalone output not found; skipping standalone asset copy.')
  process.exit(0)
}

const copiedStatic = copyDirectory(
  path.join(root, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static'),
)
const copiedPublic = copyDirectory(
  path.join(root, 'public'),
  path.join(standaloneRoot, 'public'),
)

if (!copiedStatic) {
  console.warn('[postbuild] .next/static was not found; standalone static assets were not copied.')
}
if (!copiedPublic) {
  console.warn('[postbuild] public directory was not found; standalone public assets were not copied.')
}
if (copiedStatic || copiedPublic) {
  console.log(`[postbuild] Copied standalone assets: static=${copiedStatic ? 'yes' : 'no'} public=${copiedPublic ? 'yes' : 'no'}.`)
}
