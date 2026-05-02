import { promises as fs } from 'fs'
import path from 'path'
import type { AppAiPackage } from '@/lib/app-ai-package'

const STORE_ROOT = process.env.APP_AI_PACKAGE_STORE_ROOT || '/var/www/amarktai/repo/storage/app-ai-packages'

function safeSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'default'
}

function fileFor(appSlug: string) {
  return path.join(STORE_ROOT, `${safeSegment(appSlug)}.json`)
}

export interface StoredAppAiPackage extends AppAiPackage {
  savedAt: string
  updatedAt: string
  version: number
}

export async function saveAppAiPackage(pkg: AppAiPackage): Promise<StoredAppAiPackage> {
  await fs.mkdir(STORE_ROOT, { recursive: true })
  const target = fileFor(pkg.appSlug)
  let existing: StoredAppAiPackage | null = null
  try {
    existing = JSON.parse(await fs.readFile(target, 'utf8')) as StoredAppAiPackage
  } catch {
    existing = null
  }
  const now = new Date().toISOString()
  const stored: StoredAppAiPackage = {
    ...pkg,
    appSlug: safeSegment(pkg.appSlug),
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    version: (existing?.version ?? 0) + 1,
  }
  await fs.writeFile(target, JSON.stringify(stored, null, 2))
  return stored
}

export async function getAppAiPackage(appSlug: string): Promise<StoredAppAiPackage | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(appSlug), 'utf8')) as StoredAppAiPackage
  } catch {
    return null
  }
}

export async function listAppAiPackages(): Promise<StoredAppAiPackage[]> {
  await fs.mkdir(STORE_ROOT, { recursive: true })
  const files = await fs.readdir(STORE_ROOT).catch(() => [])
  const packages: StoredAppAiPackage[] = []
  for (const file of files.filter((name) => name.endsWith('.json'))) {
    try {
      packages.push(JSON.parse(await fs.readFile(path.join(STORE_ROOT, file), 'utf8')) as StoredAppAiPackage)
    } catch {
      // ignore invalid package files
    }
  }
  return packages.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function deleteAppAiPackage(appSlug: string) {
  try {
    await fs.unlink(fileFor(appSlug))
    return true
  } catch {
    return false
  }
}
