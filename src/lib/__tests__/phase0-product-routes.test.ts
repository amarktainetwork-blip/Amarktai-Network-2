import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function source(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

describe('Phase 0 product route coverage', () => {
  it('keeps the required dashboard and public routes', () => {
    for (const file of [
      'src/app/admin/dashboard/app-builder/page.tsx',
      'src/app/admin/dashboard/workbench/page.tsx',
      'src/app/admin/dashboard/studio/page.tsx',
      'src/app/admin/dashboard/outputs/page.tsx',
      'src/app/admin/dashboard/avatar-voice/page.tsx',
      'src/app/admin/dashboard/jobs-approvals/page.tsx',
      'src/app/admin/dashboard/memory-learning/page.tsx',
      'src/app/admin/dashboard/operations/page.tsx',
      'src/app/page.tsx',
    ]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true)
    }
  })

  it('keeps adult text, image, video, and voice app-policy gated', () => {
    const routes = [
      'src/app/api/brain/adult-text/route.ts',
      'src/app/api/brain/adult-image/route.ts',
      'src/app/api/brain/adult-video/route.ts',
      'src/app/api/brain/tts/route.ts',
    ]
    for (const route of routes) {
      const routeSource = source(route)
      expect(routeSource).toContain('loadAppSafetyConfigFromDB')
      expect(routeSource).toContain('getAppSafetyConfig')
      expect(routeSource).toContain('scanContent')
    }
    expect(source('src/app/api/brain/tts/route.ts')).toContain('adult_voice')
  })

  it('persists completed adult text, image, and voice output as artifacts', () => {
    for (const route of [
      'src/app/api/brain/adult-text/route.ts',
      'src/app/api/brain/adult-image/route.ts',
      'src/app/api/brain/tts/route.ts',
    ]) {
      expect(source(route)).toContain('createArtifact')
    }
    expect(source('src/app/api/brain/adult-video/route.ts')).toContain(
      "capability: 'adult_video'",
    )
  })

  it('requests artifact persistence for generated image and research output', () => {
    for (const route of [
      'src/app/api/brain/image/route.ts',
      'src/app/api/brain/image-edit/route.ts',
      'src/app/api/brain/suggestive-image/route.ts',
      'src/app/api/brain/research/route.ts',
    ]) {
      expect(source(route)).toContain('saveArtifact: true')
    }
  })
})
