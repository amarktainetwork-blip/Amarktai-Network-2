import type React from 'react'
import { CheckCircle2, Cpu, ArrowRight, Zap } from 'lucide-react'

export default function AppRuntimePage() {
  const exampleRequest = {
    capability: 'music_generation',
    input: {
      prompt: 'Upbeat jazz instrumental, 30 seconds',
      duration: 30,
    },
    sessionId: 'app-session-abc123',
  }

  const exampleResponse = {
    ok: true,
    result: {
      provider: 'runtime-selected',
      model: 'runtime-selected',
      artifactUrl: 'https://cdn.example.com/artifacts/music-abc123.mp3',
      durationMs: 4200,
      proofRecorded: true,
    },
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">App Runtime</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">App Runtime API</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Apps request capabilities, not providers or models.
            The AmarktAI Network routes, executes, stores artifacts, and records proof.
            Apps never specify which provider or model to use.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <div>
            <span className="text-sm font-black text-emerald-200">Execute route wired</span>
            <span className="ml-2 font-mono text-xs text-emerald-400">/api/admin/studio/execute</span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 text-cyan-300">
            <Zap className="h-4 w-4" />
            <h2 className="text-lg font-black text-white">Platform contract</h2>
          </div>
          <div className="mt-4 space-y-3">
            <ContractRow
              label="Apps request capabilities, not providers or models"
              detail="The payload must not include provider or model fields. Routing is server-side only."
            />
            <ContractRow
              label="The network routes execution"
              detail="AmarktAI Network selects the provider and model based on the capability mesh, proof status, and fallback chains."
            />
            <ContractRow
              label="Artifacts are stored"
              detail="On success, output artifacts are persisted and a URL is returned to the app."
            />
            <ContractRow
              label="Proof is recorded"
              detail="Every successful execution records provider proof. Proof status drives future routing decisions."
            />
            <ContractRow
              label="runtime-selected in responses"
              detail="Provider and model fields in the response carry the value 'runtime-selected' to reflect that the app did not specify them."
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-300" />
            <h2 className="text-lg font-black text-white">API readiness</h2>
          </div>
          <div className="mt-4 space-y-2">
            <ReadinessRow label="Execute route" route="/api/admin/studio/execute" status="Wired" />
            <ReadinessRow label="Capability" route="music_generation" status="Wired" />
            <ReadinessRow label="Provider / model in request" route="(not allowed)" status="Rejected by server" tone="neutral" />
            <ReadinessRow label="Artifact storage" route="On success" status="Active" />
            <ReadinessRow label="Proof recording" route="On success" status="Active" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-black text-white">Example request</h2>
          <p className="mt-1 text-xs text-slate-500">
            Capability: <span className="font-mono text-cyan-300">music_generation</span>
            &nbsp;— no provider or model fields.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(exampleRequest, null, 2)}
          </pre>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-black text-white">Example response</h2>
          <p className="mt-1 text-xs text-slate-500">
            Provider and model are <span className="font-mono text-cyan-300">runtime-selected</span> — the app never chose them.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(exampleResponse, null, 2)}
          </pre>
        </section>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-black text-white">How execution flows</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <FlowStep label="App sends capability request" />
          <ArrowRight className="h-4 w-4 text-slate-600" />
          <FlowStep label="Network validates capability" />
          <ArrowRight className="h-4 w-4 text-slate-600" />
          <FlowStep label="Network routes to provider" />
          <ArrowRight className="h-4 w-4 text-slate-600" />
          <FlowStep label="Execution runs" />
          <ArrowRight className="h-4 w-4 text-slate-600" />
          <FlowStep label="Artifact stored + proof recorded" />
          <ArrowRight className="h-4 w-4 text-slate-600" />
          <FlowStep label="Response with runtime-selected fields returned" />
        </div>
      </section>
    </div>
  )
}

function ContractRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/55 p-3">
      <p className="text-xs font-black text-slate-200">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function ReadinessRow({ label, route, status, tone = 'good' }: {
  label: string
  route: string
  status: string
  tone?: 'good' | 'neutral'
}) {
  const statusClass = tone === 'good' ? 'text-emerald-300' : 'text-slate-400'
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0">
      <span className="font-bold text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-slate-400">{route}</span>
        <span className={['font-black', statusClass].join(' ')}>{status}</span>
      </div>
    </div>
  )
}

function FlowStep({ label }: { label: string }) {
  return (
    <span className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 font-bold text-slate-300">
      {label}
    </span>
  )
}
