import { prisma } from '@/lib/prisma'
import { HF_SPECIALIST_DEFAULT_MODELS, resolveHfSpecialistConfig } from '@/lib/hf-specialist-config'

const TASKS = [
  'text-generation',
  'text-to-image',
  'image-to-image',
  'text-to-video',
  'image-to-video',
  'text-to-speech',
  'automatic-speech-recognition',
  'image-classification',
  'object-detection',
  'image-segmentation',
  'document-question-answering',
] as const

interface HfHubModel {
  id?: string
  modelId?: string
  pipeline_tag?: string
  tags?: string[]
  downloads?: number
  likes?: number
  private?: boolean
}

export async function syncHuggingFaceCatalog(input?: {
  tasks?: string[]
  limitPerTask?: number
  includeAdultCandidates?: boolean
}) {
  const tasks = input?.tasks?.length ? input.tasks : [...TASKS]
  const limit = Math.min(Math.max(input?.limitPerTask ?? 12, 1), 50)
  const approvedModels = configuredApprovedModels()
  const results: Array<{ task: string; discovered: number; stored: number; error: string | null }> = []
  for (const task of tasks) {
    try {
      const response = await fetch(
        `https://huggingface.co/api/models?pipeline_tag=${encodeURIComponent(task)}&sort=downloads&direction=-1&limit=${limit}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) },
      )
      if (!response.ok) throw new Error(`Hugging Face Hub HTTP ${response.status}`)
      const models = await response.json() as HfHubModel[]
      let stored = 0
      for (const model of models) {
        const modelId = model.id ?? model.modelId
        if (!modelId || model.private) continue
        const adultCandidate = isAdultCandidate(model)
        if (adultCandidate && !input?.includeAdultCandidates) continue
        const explicitlyApproved = approvedModels.has(modelId)
        const endpoint = specialistEndpointForModel(modelId)
        await prisma.approvedModelRegistry.upsert({
          where: { provider_modelId_task: { provider: 'huggingface', modelId, task } },
          update: {
            contentMode: adultCandidate ? 'adult' : 'normal',
            endpointType: endpoint ? 'endpoint' : 'inference_provider',
            endpointUrl: endpoint ?? '',
            adapterStatus: endpoint || !requiresDedicatedEndpoint(task) ? 'implemented' : 'missing',
            outputType: outputTypeForTask(task),
            adultPermitted: adultCandidate && explicitlyApproved,
            adultText: adultCandidate && task === 'text-generation',
            adultImage: adultCandidate && ['text-to-image', 'image-to-image'].includes(task),
            adultVideo: adultCandidate && ['text-to-video', 'image-to-video'].includes(task),
            requiresReview: !explicitlyApproved,
            approved: explicitlyApproved,
            sourceMetadata: JSON.stringify({
              pipelineTag: model.pipeline_tag ?? task,
              tags: model.tags ?? [],
              downloads: model.downloads ?? 0,
              likes: model.likes ?? 0,
              source: 'huggingface_hub_api',
            }),
            lastSyncedAt: new Date(),
          },
          create: {
            provider: 'huggingface',
            modelId,
            task,
            contentMode: adultCandidate ? 'adult' : 'normal',
            licenseStatus: licenseStatus(model.tags ?? []),
            endpointType: endpoint ? 'endpoint' : 'inference_provider',
            endpointUrl: endpoint ?? '',
            adapterStatus: endpoint || !requiresDedicatedEndpoint(task) ? 'implemented' : 'missing',
            outputType: outputTypeForTask(task),
            qualityTags: JSON.stringify(['hub_popular']),
            costTags: JSON.stringify(['provider_metered']),
            adultPermitted: adultCandidate && explicitlyApproved,
            adultText: adultCandidate && task === 'text-generation',
            adultImage: adultCandidate && ['text-to-image', 'image-to-image'].includes(task),
            adultVideo: adultCandidate && ['text-to-video', 'image-to-video'].includes(task),
            requiresReview: !explicitlyApproved,
            approved: explicitlyApproved,
            sourceMetadata: JSON.stringify({
              pipelineTag: model.pipeline_tag ?? task,
              tags: model.tags ?? [],
              downloads: model.downloads ?? 0,
              likes: model.likes ?? 0,
              source: 'huggingface_hub_api',
            }),
            lastSyncedAt: new Date(),
          },
        })
        stored += 1
      }
      results.push({ task, discovered: models.length, stored, error: null })
    } catch (error) {
      results.push({
        task,
        discovered: 0,
        stored: 0,
        error: error instanceof Error ? error.message : 'Catalog sync failed.',
      })
    }
  }
  return {
    provider: 'huggingface',
    results,
    totalStored: results.reduce((total, result) => total + result.stored, 0),
    note: 'Discovered models remain unapproved until explicitly allowlisted and live-tested.',
  }
}

function configuredApprovedModels() {
  const configured = (process.env.HUGGINGFACE_APPROVED_MODELS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return new Set([...configured, ...Object.values(HF_SPECIALIST_DEFAULT_MODELS)])
}

function specialistEndpointForModel(modelId: string) {
  for (const capability of Object.keys(HF_SPECIALIST_DEFAULT_MODELS)) {
    if (HF_SPECIALIST_DEFAULT_MODELS[capability] !== modelId) continue
    const resolved = resolveHfSpecialistConfig(capability)
    if (resolved.endpointSource === 'environment') return resolved.endpoint
  }
  return null
}

function isAdultCandidate(model: HfHubModel) {
  return [model.id, model.modelId, ...(model.tags ?? [])]
    .filter(Boolean)
    .some((value) => /nsfw|adult|uncensored|erotic/i.test(String(value)))
}

function requiresDedicatedEndpoint(task: string) {
  return ['text-to-video', 'image-to-video'].includes(task)
}

function outputTypeForTask(task: string) {
  if (task.includes('image')) return 'image'
  if (task.includes('video')) return 'video'
  if (task === 'text-to-speech') return 'audio'
  if (task === 'automatic-speech-recognition') return 'transcript'
  return 'json'
}

function licenseStatus(tags: string[]) {
  const license = tags.find((tag) => tag.startsWith('license:'))
  return license ? license.slice('license:'.length) : 'unchecked'
}
