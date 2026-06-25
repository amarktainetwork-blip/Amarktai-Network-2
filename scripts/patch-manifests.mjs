#!/usr/bin/env node
/**
 * Post-build support for Next.js standalone VPS deployments.
 *
 * This script only makes the standalone runtime self-contained by copying
 * `.next/static` and `public` into `.next/standalone`. Route manifests are not
 * patched; route conflicts must be fixed in source.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

const cwd = process.cwd()
const distDir = join(cwd, '.next')

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

ensureStandaloneAssets()

console.log('[patch-manifests] Done. Standalone assets verified.')
