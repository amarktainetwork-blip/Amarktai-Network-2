#!/usr/bin/env node
/**
 * patch-manifests.mjs
 *
 * Post-build script that removes the [key] route entries from Next.js manifests
 * to resolve the "different slug names" runtime error caused by sibling dynamic
 * segments [id] and [key] under src/app/api/admin/providers/.
 *
 * The real route is providers/[id]/test — [key]/test exports export {} only
 * and must not be registered as a live route.
 *
 * Run after: npm run build (via "postbuild" lifecycle hook)
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const cwd = process.cwd()
const distDir = join(cwd, '.next')

// All manifest files that may contain the conflicting [key] route entry
const MANIFESTS = [
  join(distDir, 'app-path-routes-manifest.json'),
  join(distDir, 'server', 'app-paths-manifest.json'),
]

function isKeyRoute(key) {
  return key.includes('[key]')
}

function patchManifest(filePath) {
  if (!existsSync(filePath)) return false

  const raw = readFileSync(filePath, 'utf8')
  const manifest = JSON.parse(raw)

  const before = Object.keys(manifest).length
  const cleaned = Object.fromEntries(
    Object.entries(manifest).filter(([k]) => !isKeyRoute(k))
  )
  const after = Object.keys(cleaned).length

  if (before === after) return false // nothing to patch

  writeFileSync(filePath, JSON.stringify(cleaned, null, 2))
  console.log(`[patch-manifests] Removed ${before - after} [key] route(s) from ${filePath}`)
  return true
}

function copyDirectory(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`[patch-manifests] Required build asset path is missing: ${source}`)
  }

  rmSync(destination, { recursive: true, force: true })
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination, { recursive: true, force: true })
  console.log(`[patch-manifests] Copied ${source} -> ${destination}`)
}

function ensureStandaloneAssets() {
  const standaloneDir = join(distDir, 'standalone')
  if (!existsSync(standaloneDir)) {
    throw new Error(`[patch-manifests] Standalone output is missing: ${standaloneDir}`)
  }

  copyDirectory(join(distDir, 'static'), join(standaloneDir, '.next', 'static'))
  copyDirectory(join(cwd, 'public'), join(standaloneDir, 'public'))
}

let patched = 0

for (const manifestPath of MANIFESTS) {
  if (patchManifest(manifestPath)) patched++
}

// Also patch standalone copies if they exist
const fs = await import('node:fs')
function findAndPatch(dir) {
  if (!existsSync(dir)) return
  const entries = fs.default.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      findAndPatch(full)
    } else if (
      entry.isFile() &&
      (entry.name === 'app-paths-manifest.json' || entry.name === 'app-path-routes-manifest.json')
    ) {
      if (patchManifest(full)) patched++
    }
  }
}

findAndPatch(join(distDir, 'standalone'))

ensureStandaloneAssets()

console.log(`[patch-manifests] Done. Patched ${patched} manifest file(s).`)
