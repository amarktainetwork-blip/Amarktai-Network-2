import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { getStorageDriver } from '@/lib/storage-driver'

export interface VideoClipForStitching {
  storagePath: string
  label?: string
}

export interface StitchVideoResult {
  success: boolean
  content: Buffer | null
  error: string | null
  ffmpegPath: string | null
}

function run(command: string, args: string[], options: { cwd?: string } = {}): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: options.cwd, windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => resolve({ code: -1, stderr: error.message }))
    child.on('close', (code) => resolve({ code, stderr }))
  })
}

export async function getFfmpegStatus(): Promise<{ available: boolean; ffmpegPath: string | null; error: string | null }> {
  const result = await run('ffmpeg', ['-version'])
  if (result.code === 0) return { available: true, ffmpegPath: 'ffmpeg', error: null }
  return {
    available: false,
    ffmpegPath: null,
    error: result.stderr || 'ffmpeg is not installed or not available on PATH.',
  }
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/\\/g, '/').replace(/'/g, "'\\''")
}

export async function stitchVideoClips(input: {
  clips: VideoClipForStitching[]
  traceId: string
}): Promise<StitchVideoResult> {
  if (input.clips.length === 0) {
    return { success: false, content: null, error: 'No scene clips were available for stitching.', ffmpegPath: null }
  }

  const ffmpeg = await getFfmpegStatus()
  if (!ffmpeg.available) {
    return { success: false, content: null, error: ffmpeg.error ?? 'ffmpeg is not installed or not available on PATH.', ffmpegPath: null }
  }

  const driver = getStorageDriver()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `amarktai-long-video-${input.traceId}-`))
  try {
    const localClipPaths: string[] = []
    for (const [index, clip] of input.clips.entries()) {
      const data = await driver.get(clip.storagePath)
      if (!data?.length) {
        return {
          success: false,
          content: null,
          error: `Scene ${index + 1} could not be read from platform storage for stitching.`,
          ffmpegPath: ffmpeg.ffmpegPath,
        }
      }
      const localPath = path.join(tempDir, `scene-${String(index + 1).padStart(3, '0')}.mp4`)
      await fs.writeFile(localPath, data)
      localClipPaths.push(localPath)
    }

    const concatFile = path.join(tempDir, 'clips.txt')
    await fs.writeFile(
      concatFile,
      localClipPaths.map((clipPath) => `file '${escapeConcatPath(clipPath)}'`).join('\n'),
      'utf8',
    )
    const outputPath = path.join(tempDir, 'long-form-output.mp4')
    const copyResult = await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outputPath], { cwd: tempDir })
    if (copyResult.code !== 0) {
      const encodeResult = await run('ffmpeg', [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatFile,
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        outputPath,
      ], { cwd: tempDir })
      if (encodeResult.code !== 0) {
        return {
          success: false,
          content: null,
          error: `ffmpeg stitching failed: ${encodeResult.stderr || copyResult.stderr || 'unknown ffmpeg error'}`,
          ffmpegPath: ffmpeg.ffmpegPath,
        }
      }
    }

    const content = await fs.readFile(outputPath)
    if (!content.length) {
      return { success: false, content: null, error: 'ffmpeg produced an empty long-form video file.', ffmpegPath: ffmpeg.ffmpegPath }
    }
    return { success: true, content, error: null, ffmpegPath: ffmpeg.ffmpegPath }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
