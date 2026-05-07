import path from 'path'

export const DEFAULT_VPS_STORAGE_ROOT = '/var/www/amarktai/storage'
export const DEV_STORAGE_ROOT = path.resolve(process.cwd(), 'storage')

export function getUnifiedStorageRoot(): string {
  const primary = process.env.AMARKTAI_STORAGE_ROOT?.trim()
  if (primary) return path.resolve(primary)

  const legacy = process.env.STORAGE_ROOT?.trim()
  if (legacy) return path.resolve(legacy)

  if (process.env.NODE_ENV !== 'production' && process.env.AMARKTAI_ALLOW_DEV_STORAGE_FALLBACK === 'true') {
    return DEV_STORAGE_ROOT
  }

  return DEFAULT_VPS_STORAGE_ROOT
}

export function resolveStoragePath(...segments: string[]): string {
  const root = path.resolve(getUnifiedStorageRoot())
  const target = path.resolve(root, ...segments)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Storage path traversal blocked')
  }
  return target
}
