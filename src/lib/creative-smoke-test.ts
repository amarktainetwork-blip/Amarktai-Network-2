import { randomUUID } from 'node:crypto'
import { createArtifact, getArtifact, listArtifacts } from '@/lib/artifact-store'
import { executeCapabilityOrchestration } from '@/lib/orchestrator'
import {
  createExecution,
  getExecution,
  recordExecutionResponse,
  startExecution,
} from '@/lib/execution'
import type { CapabilityRouterCapability } from '@/lib/capability-contracts'
import {
  saveCreativeSmokeReport,
  type CreativeSmokeReport,
  type CreativeSmokeStatus,
  type CreativeSmokeWorkflow,
} from '@/lib/creative-smoke-report'

const APP_SLUG = '__creative_smoke__'

export async function runLiveCreativeSmokeTest(): Promise<CreativeSmokeReport> {
  const workflows: CreativeSmokeWorkflow[] = []
  for (const definition of [
    { workflow: 'text' as const, capability: 'chat' as const, prompt: 'Reply with a short production smoke-test confirmation.' },
    { workflow: 'image' as const, capability: 'image_generation' as const, prompt: 'A simple cyan circle on a dark background, production smoke test.' },
    { workflow: 'image_edit' as const, capability: 'image_edit' as const, prompt: 'Increase contrast in the source image.' },
    { workflow: 'video' as const, capability: 'video_generation' as const, prompt: 'A two-second abstract cyan light sweep, production smoke test.' },
    { workflow: 'image_to_video' as const, capability: 'image_to_video' as const, prompt: 'Animate the source image with a subtle camera move.' },
    { workflow: 'tts' as const, capability: 'tts' as const, prompt: 'AmarktAI production speech smoke test.' },
    { workflow: 'stt' as const, capability: 'stt' as const, prompt: 'Transcribe the supplied audio.' },
    { workflow: 'music' as const, capability: 'music_generation' as const, prompt: 'A five-second calm instrumental production smoke test.' },
    { workflow: 'avatar' as const, capability: 'avatar_video' as const, prompt: 'Create a short welcome message with the supplied avatar.' },
  ]) {
    workflows.push(await runCreativeWorkflow(definition))
  }
  workflows.push(await runArtifactPersistenceWorkflow())
  workflows.push(await runArtifactMediaContractWorkflow())

  const artifactPersistencePassed = workflows
    .filter((workflow) => workflow.workflow === 'artifact_persistence' || workflow.workflow === 'artifact_media_contract')
    .every((workflow) => workflow.status === 'pass')
  const creativeWorkflowPassed = workflows.some(
    (workflow) => workflow.workflow !== 'artifact_persistence' && workflow.status === 'pass',
  )
  const report: CreativeSmokeReport = {
    id: randomUUID(),
    testedAt: new Date().toISOString(),
    overall: artifactPersistencePassed && creativeWorkflowPassed ? 'pass' : 'fail',
    artifactPersistencePassed,
    creativeWorkflowPassed,
    workflows,
  }
  await saveCreativeSmokeReport(report)
  return report
}

async function runCreativeWorkflow(input: {
  workflow: CreativeSmokeWorkflow['workflow']
  capability: CapabilityRouterCapability
  prompt: string
}): Promise<CreativeSmokeWorkflow> {
  let execution = createExecution({
    appSlug: APP_SLUG,
    actor: { type: 'admin', label: 'Live Creative Smoke Test' },
    requestedCapability: input.capability,
    prompt: input.prompt,
    action: 'generate',
    costMode: 'cheap',
    expensiveMedia: false,
    metadata: { source: 'live_creative_smoke_test', workflow: input.workflow },
  })
  if (execution.status === 'blocked' || execution.status === 'awaiting_approval') {
    return workflowResult(input, execution.executionId, {
      status: 'blocked',
      provider: execution.providerPlan.provider,
      model: execution.modelPlan.model,
      error: execution.error,
      blocker: execution.approval.reason ?? execution.error,
      providerAttempts: [],
    })
  }
  execution = startExecution(execution.executionId) ?? execution
  try {
    const result = await executeCapabilityOrchestration({
      input: input.prompt,
      capability: input.capability,
      appId: APP_SLUG,
      qualityTier: 'cheap',
      safeMode: true,
      saveArtifact: true,
      metadata: {
        executionId: execution.executionId,
        source: 'live_creative_smoke_test',
        duration: input.workflow === 'video' ? 2 : input.workflow === 'music' ? 5 : undefined,
      },
    })
    const response = {
      ...result,
      jobStatus: result.status ?? (result.success ? 'completed' : 'failed'),
      storageUrl: result.artifactUrl ?? result.storageUrl,
      mediaUrl: result.mediaUrl ?? (
        result.output?.startsWith('https://') ? result.output : undefined
      ),
    }
    recordExecutionResponse(execution.executionId, response)
    const pending = result.status === 'pending' || result.status === 'processing'
    const artifact = result.artifactId ? await getArtifact(result.artifactId) : null
    const visible = artifact
      ? (await listArtifacts({ appSlug: APP_SLUG, limit: 100 })).artifacts.some((item) => item.id === artifact.id)
      : false
    const status: CreativeSmokeStatus = pending && result.jobId
      ? 'pending'
      : result.success && artifact?.previewUrl && visible
        ? 'pass'
        : result.readiness === 'BLOCKED'
          || result.readiness === 'NEEDS_INPUT'
          || result.readiness === 'NEEDS_CONFIGURATION'
          || result.readiness === 'UNAVAILABLE'
          ? 'blocked'
          : 'fail'
    return workflowResult(input, execution.executionId, {
      status,
      provider: result.provider,
      model: result.model,
      jobId: result.jobId ?? null,
      artifactId: artifact?.id ?? null,
      previewUrl: artifact?.previewUrl || null,
      jobsEntryVisible: Boolean(getExecution(execution.executionId)),
      artifactsEntryVisible: visible,
      error: result.error ?? result.warning ?? null,
      blocker: status === 'blocked' ? result.error ?? result.warning ?? 'No executable provider route.' : null,
      artifactMimeType: artifact?.mimeType ?? null,
      providerAttempts: result.providerAttempts ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Creative workflow failed.'
    recordExecutionResponse(execution.executionId, { success: false, error: message })
    return workflowResult(input, execution.executionId, {
      status: 'fail',
      provider: execution.providerPlan.provider,
      model: execution.modelPlan.model,
      error: message,
      blocker: message,
      providerAttempts: [],
    })
  }
}

async function runArtifactPersistenceWorkflow(): Promise<CreativeSmokeWorkflow> {
  const execution = createExecution({
    appSlug: APP_SLUG,
    actor: { type: 'admin', label: 'Live Creative Smoke Test' },
    requestedCapability: 'chat',
    prompt: 'Verify artifact persistence and preview.',
    action: 'generate',
    costMode: 'cheap',
    metadata: { source: 'live_creative_smoke_test', workflow: 'artifact_persistence' },
  })
  startExecution(execution.executionId)
  try {
    const artifact = await createArtifact({
      appSlug: APP_SLUG,
      executionId: execution.executionId,
      type: 'report',
      subType: 'live_creative_smoke_test',
      title: 'Live creative smoke artifact',
      capability: 'artifact_persistence',
      mimeType: 'application/json',
      content: Buffer.from(JSON.stringify({ ok: true, testedAt: new Date().toISOString() })),
    })
    recordExecutionResponse(execution.executionId, {
      success: true,
      status: 'completed',
      artifactId: artifact.id,
      storageUrl: artifact.downloadUrl,
    })
    const visible = (await listArtifacts({ appSlug: APP_SLUG, limit: 100 }))
      .artifacts.some((item) => item.id === artifact.id)
    return {
      workflow: 'artifact_persistence',
      capability: 'artifact_persistence',
      status: artifact.previewUrl && visible ? 'pass' : 'fail',
      provider: 'local_vps',
      model: null,
      executionId: execution.executionId,
      jobId: null,
      artifactId: artifact.id,
      previewUrl: artifact.previewUrl || null,
      jobsEntryVisible: Boolean(getExecution(execution.executionId)),
      artifactsEntryVisible: visible,
      error: artifact.previewUrl && visible ? null : 'Artifact did not appear with a preview URL.',
      blocker: artifact.previewUrl && visible ? null : 'Artifact persistence or listing is incomplete.',
      artifactMimeType: artifact.mimeType,
      providerAttempts: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artifact persistence failed.'
    recordExecutionResponse(execution.executionId, { success: false, error: message })
    return {
      workflow: 'artifact_persistence',
      capability: 'artifact_persistence',
      status: 'fail',
      provider: 'local_vps',
      model: null,
      executionId: execution.executionId,
      jobId: null,
      artifactId: null,
      previewUrl: null,
      jobsEntryVisible: Boolean(getExecution(execution.executionId)),
      artifactsEntryVisible: false,
      error: message,
      blocker: message,
      artifactMimeType: null,
      providerAttempts: [],
    }
  }
}

async function runArtifactMediaContractWorkflow(): Promise<CreativeSmokeWorkflow> {
  const execution = createExecution({
    appSlug: APP_SLUG,
    actor: { type: 'admin', label: 'Live Creative Smoke Test' },
    requestedCapability: 'image_generation',
    prompt: 'Verify media byte detection and image preview.',
    action: 'generate',
    costMode: 'cheap',
    metadata: { source: 'live_creative_smoke_test', workflow: 'artifact_media_contract' },
  })
  startExecution(execution.executionId)
  try {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    const artifact = await createArtifact({
      appSlug: APP_SLUG,
      executionId: execution.executionId,
      type: 'image',
      subType: 'artifact_media_contract',
      title: 'Live smoke image MIME contract',
      capability: 'text_to_image',
      mimeType: 'application/json',
      content: png,
    })
    recordExecutionResponse(execution.executionId, {
      success: true,
      status: 'completed',
      artifactId: artifact.id,
      storageUrl: artifact.downloadUrl,
    })
    const visible = (await listArtifacts({ appSlug: APP_SLUG, limit: 100 }))
      .artifacts.some((item) => item.id === artifact.id)
    const passed = artifact.mimeType === 'image/png'
      && artifact.storagePath.endsWith('.png')
      && Boolean(artifact.previewUrl)
      && visible
    return {
      workflow: 'artifact_media_contract',
      capability: 'text_to_image',
      status: passed ? 'pass' : 'fail',
      provider: 'local_vps',
      model: null,
      executionId: execution.executionId,
      jobId: null,
      artifactId: artifact.id,
      previewUrl: artifact.previewUrl || null,
      jobsEntryVisible: Boolean(getExecution(execution.executionId)),
      artifactsEntryVisible: visible,
      error: passed ? null : 'PNG bytes were not persisted with the image/png contract.',
      blocker: passed ? null : 'Artifact MIME, extension, preview, or listing contract failed.',
      artifactMimeType: artifact.mimeType,
      providerAttempts: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media artifact contract failed.'
    recordExecutionResponse(execution.executionId, { success: false, error: message })
    return {
      workflow: 'artifact_media_contract',
      capability: 'text_to_image',
      status: 'fail',
      provider: 'local_vps',
      model: null,
      executionId: execution.executionId,
      jobId: null,
      artifactId: null,
      previewUrl: null,
      jobsEntryVisible: Boolean(getExecution(execution.executionId)),
      artifactsEntryVisible: false,
      error: message,
      blocker: message,
      artifactMimeType: null,
      providerAttempts: [],
    }
  }
}

function workflowResult(
  input: { workflow: CreativeSmokeWorkflow['workflow']; capability: string },
  executionId: string,
  values: Partial<CreativeSmokeWorkflow>,
): CreativeSmokeWorkflow {
  return {
    workflow: input.workflow,
    capability: input.capability,
    status: values.status ?? 'fail',
    provider: values.provider ?? null,
    model: values.model ?? null,
    executionId,
    jobId: values.jobId ?? null,
    artifactId: values.artifactId ?? null,
    previewUrl: values.previewUrl ?? null,
    jobsEntryVisible: values.jobsEntryVisible ?? Boolean(getExecution(executionId)),
    artifactsEntryVisible: values.artifactsEntryVisible ?? false,
    error: values.error ?? null,
    blocker: values.blocker ?? null,
    artifactMimeType: values.artifactMimeType ?? null,
    providerAttempts: values.providerAttempts ?? [],
  }
}
