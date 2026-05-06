import { APPROVED_AI_PROVIDERS, APPROVED_ASSISTANT_MODELS, APPROVED_WORKBENCH_MODELS, HUGGING_FACE_TASK_ROUTES } from '@/lib/approved-ai-catalog'
import {
  GENX_TEXT_MODELS,
  GENX_IMAGE_MODELS,
  GENX_VIDEO_MODELS,
  GENX_AUDIO_MODELS,
  GENX_TTS_MODELS,
  GENX_STT_MODELS,
} from '@/lib/genx-client'

const GENX_CATALOG_GROUPS = [
  { label: 'Text / Code / Reasoning', models: GENX_TEXT_MODELS },
  { label: 'Image Generation', models: GENX_IMAGE_MODELS },
  { label: 'Video Generation', models: GENX_VIDEO_MODELS },
  { label: 'Music / Audio Generation', models: GENX_AUDIO_MODELS },
  { label: 'Text-to-Speech (TTS)', models: GENX_TTS_MODELS },
  { label: 'Speech-to-Text (STT)', models: GENX_STT_MODELS },
]

export default function AIModelsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">AI Models</p>
        <h1 className="mt-3 text-3xl font-black text-white">Approved providers and model routes.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          The Workbench and Assistant read from the same approved provider catalog. Hugging Face is presented as task routes instead of a raw model picker.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {APPROVED_AI_PROVIDERS.map((provider) => (
          <div key={provider.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-base font-bold text-white">{provider.displayName}</p>
            <p className="mt-2 text-xs text-slate-500">{provider.envVars.join(', ')}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{provider.notes}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">GenX model catalog</h2>
        <p className="mt-1 text-xs text-slate-500">Full catalog grouped by capability. These real model IDs are sent to GenX — no auto:* aliases.</p>
        <div className="mt-4 space-y-5">
          {GENX_CATALOG_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.models.map((modelId) => (
                  <span key={modelId} className="rounded-lg border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">{modelId}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ModelList title="Workbench model routes" models={APPROVED_WORKBENCH_MODELS} />
        <ModelList title="Assistant model routes" models={APPROVED_ASSISTANT_MODELS} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">Hugging Face task routes</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HUGGING_FACE_TASK_ROUTES.map((route) => (
            <div key={route.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-semibold text-white">{route.taskLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{route.id}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ModelList({ title, models }: { title: string; models: readonly { id: string; label: string; provider: string; costMode: string }[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {models.map((model) => (
          <div key={`${model.provider}:${model.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-white">{model.label}</p>
            <p className="mt-1 text-xs text-slate-500">{model.provider} / {model.id} / {model.costMode}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
