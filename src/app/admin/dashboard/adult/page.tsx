export const dynamic = 'force-dynamic'

const ADULT_CAPABILITIES = [
  {
    id: 'adult_text',
    label: 'Adult Text',
    envPrimary: 'HF_ADULT_TEXT_ENDPOINT',
    envFallback: 'HF_ADULT_TEXT_ENDPOINT_FALLBACK',
    envModel: 'HF_ADULT_TEXT_MODEL',
    envModelFallback: 'HF_ADULT_TEXT_MODEL_FALLBACK',
  },
  {
    id: 'adult_image',
    label: 'Adult Image',
    envPrimary: 'HF_ADULT_IMAGE_ENDPOINT',
    envFallback: 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK',
    envModel: 'HF_ADULT_IMAGE_MODEL',
    envModelFallback: 'HF_ADULT_IMAGE_MODEL_FALLBACK',
  },
  {
    id: 'adult_voice',
    label: 'Adult Voice',
    envPrimary: 'HF_ADULT_VOICE_ENDPOINT',
    envFallback: 'HF_ADULT_VOICE_ENDPOINT_FALLBACK',
    envModel: 'HF_ADULT_VOICE_MODEL',
    envModelFallback: 'HF_ADULT_VOICE_MODEL_FALLBACK',
  },
  {
    id: 'adult_avatar',
    label: 'Adult Avatar',
    envPrimary: 'HF_ADULT_AVATAR_ENDPOINT',
    envFallback: 'HF_ADULT_AVATAR_ENDPOINT_FALLBACK',
    envModel: 'HF_ADULT_AVATAR_MODEL',
    envModelFallback: 'HF_ADULT_AVATAR_MODEL_FALLBACK',
  },
  {
    id: 'adult_video',
    label: 'Adult Video',
    envPrimary: 'HF_ADULT_VIDEO_ENDPOINT',
    envFallback: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK',
    envModel: 'HF_ADULT_VIDEO_MODEL',
    envModelFallback: 'HF_ADULT_VIDEO_MODEL_FALLBACK',
  },
]

export default async function AdultPrivatePage() {
  const capabilityStatus = ADULT_CAPABILITIES.map((cap) => {
    const primarySet = Boolean(process.env[cap.envPrimary]?.trim())
    const fallbackSet = Boolean(process.env[cap.envFallback]?.trim())
    const modelSet = Boolean(process.env[cap.envModel]?.trim())
    return {
      ...cap,
      primarySet,
      fallbackSet,
      modelSet,
      status: 'deferred',
      blocker: 'Deferred from active V1 runtime.',
    }
  })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin — Private</p>
        <h1 className="mt-2 text-2xl font-black text-white">Adult Private</h1>
        <p className="mt-1 text-sm text-slate-400">
          This private area is blocked from active V1 execution and retained as an admin visibility surface rather than launch readiness.
          The active V1 provider set remains separate from adult capability routing.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Adult permission gate</h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <span className="text-sm text-slate-300">ADULT_MODE_ENABLED</span>
          <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-black ${process.env.ADULT_MODE_ENABLED === 'true' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>
            {process.env.ADULT_MODE_ENABLED === 'true' ? 'Enabled' : 'Not set'}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Capability endpoint status</h2>
        <p className="mt-1 text-xs text-slate-500">Adult capabilities are not routed through active V1 providers and are excluded from V1 readiness/proof.</p>
        <div className="mt-4 space-y-4">
          {capabilityStatus.map((cap) => (
            <div key={cap.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-slate-200">{cap.label}</p>
                <span className="rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] font-black text-slate-300">
                  Blocked / Deferred
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs text-slate-500 font-mono">
                <EnvRow name={cap.envPrimary} set={cap.primarySet} />
                <EnvRow name={cap.envFallback} set={cap.fallbackSet} />
                <EnvRow name={cap.envModel} set={cap.modelSet} />
                <EnvRow name={cap.envModelFallback} set={Boolean(process.env[cap.envModelFallback]?.trim())} />
              </div>
              {cap.blocker && (
                <p className="mt-2 text-xs text-red-300">{cap.blocker}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-400/10 border bg-amber-400/5 p-5">
        <h2 className="font-black text-amber-200">Adult video note</h2>
        <p className="mt-2 text-sm text-amber-100/70">
          Adult video is <strong>Deferred</strong> from active V1. Legacy endpoint fields are shown only as inactive reference fields:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs text-amber-200">
          <li>HF_ADULT_VIDEO_ENDPOINT</li>
          <li>HF_ADULT_VIDEO_ENDPOINT_FALLBACK</li>
          <li>HF_ADULT_VIDEO_MODEL</li>
          <li>HF_ADULT_VIDEO_MODEL_FALLBACK</li>
        </ul>
        <p className="mt-2 text-xs text-amber-100/60">These fields do not make adult video part of V1 readiness or runtime proof.</p>
      </section>
    </div>
  )
}

function EnvRow({ name, set }: { name: string; set: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{name}</span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${set ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
        {set ? 'Set' : 'Not set'}
      </span>
    </div>
  )
}
