import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getQueue } from '@/lib/job-queue'
import { resolveStoragePath } from '@/lib/storage-root'

const RESET_JSON_FILES = [
  'jobs/jobs.json',
  'jobs/media-jobs.json',
  'jobs/executions.json',
  'jobs/command-jobs.json',
  'creative/video-projects.json',
  'artifacts/artifacts.json',
] as const

export async function hardResetJobsAndArtifacts() {
  const before = await counts()
  const database = await prisma.$transaction(async (transaction) => {
    const traces = await transaction.capabilityTrace.deleteMany()
    const attempts = await transaction.controlPlaneAttempt.deleteMany()
    const jobs = await transaction.controlPlaneJob.deleteMany()
    const videoJobs = await transaction.videoGenerationJob.deleteMany()
    const artifacts = await transaction.artifact.deleteMany()
    return {
      capabilityTraces: traces.count,
      controlPlaneAttempts: attempts.count,
      controlPlaneJobs: jobs.count,
      videoGenerationJobs: videoJobs.count,
      artifacts: artifacts.count,
    }
  })

  const localFiles: Record<string, number> = {}
  for (const relativePath of RESET_JSON_FILES) {
    const target = resolveStoragePath(relativePath)
    const previous = await readArrayLength(target)
    localFiles[relativePath] = previous
  }

  const artifactDirectory = resolveStoragePath('artifacts')
  await fs.rm(artifactDirectory, { recursive: true, force: true })
  await fs.mkdir(artifactDirectory, { recursive: true })

  for (const relativePath of RESET_JSON_FILES) {
    const target = resolveStoragePath(relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, '[]\n', 'utf8')
  }

  const queue = getQueue()
  let redisQueue: { cleared: boolean; detail: string }
  if (!queue) {
    redisQueue = { cleared: false, detail: 'REDIS_URL is not configured for this process.' }
  } else {
    try {
      await queue.pause()
      await queue.obliterate({ force: true })
      await queue.resume()
      redisQueue = { cleared: true, detail: 'BullMQ queue keys were removed.' }
    } catch (error) {
      redisQueue = {
        cleared: false,
        detail: error instanceof Error ? error.message : 'BullMQ reset failed.',
      }
    }
  }

  return {
    before,
    deleted: { database, localFiles, artifactDirectory, redisQueue },
    after: await counts(),
  }
}

async function counts() {
  const [
    controlPlaneJobs,
    controlPlaneAttempts,
    capabilityTraces,
    videoGenerationJobs,
    artifacts,
  ] = await Promise.all([
    prisma.controlPlaneJob.count(),
    prisma.controlPlaneAttempt.count(),
    prisma.capabilityTrace.count(),
    prisma.videoGenerationJob.count(),
    prisma.artifact.count(),
  ])
  const localFiles = Object.fromEntries(await Promise.all(
    RESET_JSON_FILES.map(async (relativePath) => [
      relativePath,
      await readArrayLength(resolveStoragePath(relativePath)),
    ]),
  ))
  return {
    database: {
      controlPlaneJobs,
      controlPlaneAttempts,
      capabilityTraces,
      videoGenerationJobs,
      artifacts,
    },
    localFiles,
  }
}

async function readArrayLength(filePath: string) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}
