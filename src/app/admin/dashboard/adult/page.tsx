import type React from 'react'
import { AlertTriangle, CheckCircle2, CircleSlash, ShieldOff } from 'lucide-react'

export const dynamic = 'force-dynamic'

type CapStatus = 'Configured' | 'Blocked' | 'Not configured'

function envStatus(key: string): 'set' | 'missing' {
  return process.env[key] ? 'set' : 'missing'
}

function capabilityStatus(primaryEnvKey: string): CapStatus {
  if (!process.env[primaryEnvKey]) return 'Blocked'
  return 'Not configured' // configured means key is present; proof is still needed
}

const CAP_TONE: Record<CapStatus, string> = {
  Configured: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Blocked: 'border-red-300/20 bg-red-300/10 text-red-100',
  'Not configured': 'border-slate-600/50 bg-slate-800/80 text-slate-300',
}

const ENV_VARS = {
  adult_video: [
    'HF_ADULT_VIDEO_ENDPOINT',
    'HF_ADULT_VIDEO_ENDPOINT_FALLBACK',
    'HF_ADULT_VIDEO_MODEL',
    'HF_ADULT_VIDEO_MODEL_FALLBACK',
  ],
  adult_text: ['HF_ADULT_TEXT_ENDPOINT'],
  adult_image: ['HF_ADULT_IMAGE_ENDPOINT'],
  adult_voice: ['HF_ADULT_VOICE_ENDPOINT'],
  adult_avatar: ['HF_ADULT_AVATAR_ENDPOINT'],
}

const CAP_LABELS: Record<string, string> = {
  adult_video: 'Adult video generation',
  adult_text: 'Adult text generation',
  adult_image: 'Adult image generation',
  adult_voice: 'Adult voice synthesis',
  adult_avatar: 'Adult avatar video',
}

const PRIMARY_ENV: Record<string, string> = {
  adult_video: 'HF_ADULT_VIDEO_ENDPOINT',
  adult_text: 'HF_ADULT_TEXT_ENDPOINT',
  adult_image: 'HF_ADULT_IMAGE_ENDPOINT',
  adult_voice: 'HF_ADULT_VOICE_ENDPOINT',
  adult_avatar: 'HF_ADULT_AVATAR_ENDPOINT',
}

function getEnvStatuses(): Record<string, Record<string, 'set' | 'missing'>> {
  const result: Record<string, Record<string, 'set' | 'missing'>> = {}
  for (const [cap, vars] of Object.entries(ENV_VARS)) {
    result[cap] = {}
    for (const v of vars) {
      result[cap][v] = envStatus(v)
    }
  }
  return result
}

export default function AdultPage() {
  const envStatuses = getEnvStatuses()

  const capabilities = Object.keys(ENV_VARS) as (keyof typeof ENV_VARS)[]

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Adult Private</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Adult Private capabilities</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Adult capability status based on Hugging Face endpoint environment variables.
            All adult capabilities route exclusively through self-hosted HuggingFace inference endpoints.
            No capability is active without a set HF endpoint env var.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-0.5 h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-sm font-black text-white">HuggingFace endpoints only</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Adult capabilities are served exclusively through self-hosted HuggingFace inference endpoints configured via environment variables.
              Third-party commercial providers are not used for adult content.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {capabilities.map((cap) => {
          const primaryKey = PRIMARY_ENV[cap]
          const status = capabilityStatus(primaryKey)
          const vars = envStatuses[cap]
          return (
            <CapabilityCard
              key={cap}
              capabilityId={cap}
              label={CAP_LABELS[cap]}
              status={status}
              envVars={vars}
            />
          )
        })}
      </section>
    </div>
  )
}

function CapabilityCard({
  capabilityId,
  label,
  status,
  envVars,
}: {
  capabilityId: string
  label: string
  status: CapStatus
  envVars: Record<string, 'set' | 'missing'>
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.12em] text-slate-500">{capabilityId}</p>
          <p className="mt-1 text-base font-black text-white">{label}</p>
        </div>
        <CapPill status={status} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.entries(envVars).map(([key, val]) => (
          <EnvRow key={key} envKey={key} status={val} />
        ))}
      </div>
    </div>
  )
}

function EnvRow({ envKey, status }: { envKey: string; status: 'set' | 'missing' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2">
      <span className="font-mono text-xs text-slate-300">{envKey}</span>
      {status === 'set' ? (
        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> Set
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-black text-red-300">
          <CircleSlash className="h-3.5 w-3.5" /> Missing
        </span>
      )}
    </div>
  )
}

function CapPill({ status }: { status: CapStatus }) {
  const Icon =
    status === 'Configured' ? CheckCircle2 :
    status === 'Blocked' ? AlertTriangle :
    CircleSlash
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', CAP_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  )
}
