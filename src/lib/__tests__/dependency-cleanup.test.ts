import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function walk(dir: string, files: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

function repoFiles() {
  return walk(path.join(root, 'src'))
    .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
}

describe('runtime cleanup regressions', () => {
  it('deletes duplicate legacy runtime stack files', () => {
    for (const file of [
      'src/lib/capability-router.ts',
      'src/lib/capability-registry.ts',
      'src/lib/runtime-registry.ts',
      'src/lib/model-resolver.ts',
      'src/lib/provider-capability-map.ts',
      'src/app/api/brain/video/route.ts',
    ]) {
      expect(fs.existsSync(path.join(root, file))).toBe(false)
    }
  })

  it('production code does not import the deleted capability router', () => {
    const offenders = repoFiles()
      .filter((file) => !file.includes('/__tests__/'))
      .filter((file) => read(file).includes('capability-router'))
    expect(offenders).toEqual([])
  })

  it('does not use array-position GenX media defaults in production code', () => {
    const patterns = [
      'GENX_VIDEO_MODELS[0]',
      'GENX_IMAGE_MODELS[0]',
      'GENX_AUDIO_MODELS[0]',
      'GENX_TTS_MODELS[0]',
      'GENX_STT_MODELS[0]',
    ]
    const offenders = repoFiles()
      .filter((file) => !file.includes('/__tests__/'))
      .filter((file) => patterns.some((pattern) => read(file).includes(pattern)))
    expect(offenders).toEqual([])
  })

  it('does not reference the failed Together Free image model', () => {
    const failedFreeModel = 'FLUX.1-schnell' + '-Free'
    const offenders = repoFiles().filter((file) => read(file).includes(failedFreeModel))
    expect(offenders).toEqual([])
  })

  it('long-form video is scene-based and does not call a direct 90-second provider job', () => {
    const source = read('src/lib/long-form-video-store.ts')
    expect(source).not.toContain('direct' + '_provider')
    expect(source).not.toContain('Create a completed ${targetDurationSeconds}-second long-form video')
    expect(source).toContain('startSceneGeneration')
    expect(source).toContain('normalizeLongFormSceneDurations')
  })

  it('adult video truth does not route through normal video generation', () => {
    const source = read('src/lib/capability-runtime-truth.ts')
    const adultVideoBlock = source.match(/capabilityId: 'adult_video'[\s\S]*?dedicatedEndpointEnvs: \[[\s\S]*?\],/)?.[0] ?? ''
    expect(adultVideoBlock).toContain('executionRoute: null')
    expect(adultVideoBlock).not.toContain('/api/brain/video-generate')
  })

  it('Studio does not maintain a separate executable provider order table', () => {
    const source = read('src/app/api/admin/studio/execute/route.ts')
    expect(source).not.toContain('STUDIO_EXECUTABLE_PROVIDERS')
    expect(source).not.toContain('STUDIO_PREMIUM_CHAT_PROVIDERS')
  })

  it('media capability truth does not mark media working from provider key alone', () => {
    const source = read('src/lib/capability-runtime-truth.ts')
    expect(source).toContain("status = 'wired_unproven'")
    expect(source).toContain('Run a live ${spec.label} generation to prove end-to-end')
  })
})
