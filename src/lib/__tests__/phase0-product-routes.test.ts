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
      'src/app/admin/dashboard/command/page.tsx',
      'src/app/admin/dashboard/studio/page.tsx',
      'src/app/admin/dashboard/capabilities/page.tsx',
      'src/app/admin/dashboard/connected-apps/page.tsx',
      'src/app/admin/dashboard/artifacts/page.tsx',
      'src/app/admin/dashboard/jobs/page.tsx',
      'src/app/admin/dashboard/settings/page.tsx',
      'src/app/page.tsx',
    ]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true)
    }
    expect(fs.existsSync(path.join(ROOT, 'src/app/admin/dashboard/app-builder/page.tsx'))).toBe(false)
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
      expect(routeSource).toMatch(/delegateJsonCapability|executeCapability/)
    }
    const orchestrator = source('src/lib/orchestrator.ts')
    expect(orchestrator).toContain('loadAppSafetyConfigFromDB')
    expect(orchestrator).toContain('getAppSafetyConfig')
    expect(orchestrator).toContain('scanContent')
    expect(source('src/app/api/brain/tts/route.ts')).toContain('adult_voice')
  })

  it('persists completed adult text, image, and voice output as artifacts', () => {
    for (const route of [
      'src/app/api/brain/adult-text/route.ts',
      'src/app/api/brain/adult-image/route.ts',
      'src/app/api/brain/tts/route.ts',
    ]) {
      expect(source(route)).toMatch(/delegateJsonCapability|executeCapability/)
    }
    expect(source('src/lib/orchestrator.ts')).toContain('createArtifact')
    expect(source('src/app/api/brain/adult-video/route.ts')).toContain(
      "capability: 'adult_video'",
    )
  })

  it('requests artifact persistence for generated image and research output', () => {
    for (const route of [
      'src/app/api/brain/image/route.ts',
      'src/app/api/brain/suggestive-image/route.ts',
    ]) {
      expect(source(route)).toContain('saveArtifact: true')
    }
    expect(source('src/app/api/brain/research/route.ts')).toContain('researchRuntime.execute')
    expect(source('src/lib/research-runtime.ts')).toContain('saveArtifact: true')
    const imageEdit = source('src/app/api/brain/image-edit/route.ts')
    expect(imageEdit).toContain('delegateJsonCapability')
    expect(imageEdit).toContain("capability: 'image_edit'")
    expect(source('src/lib/orchestrator.ts')).toContain('NO_ROUTE_FOUND')
  })
})
