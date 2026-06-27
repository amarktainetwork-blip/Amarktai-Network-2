import { Mic2, Radio, Settings2, ShieldCheck, Waves } from 'lucide-react'

export const dynamic = 'force-dynamic'

const requiredBackend = [
  'POST /api/admin/voice-agent/session',
  'POST /api/admin/voice-agent/stream',
  'GET /api/admin/voice-agent/context',
  'POST /api/admin/voice-agent/memory',
]

const existingVoiceRoutes = [
  '/api/admin/voice/options',
  '/api/admin/voice/preview',
  '/api/admin/voice-persona',
  '/api/admin/voice-access-settings',
]

export default function VoiceAgentPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Voice Agent</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Platform owner voice control</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              This is the permanent voice-agent surface for the platform owner. It is intentionally marked not wired until the streaming session backend exists.
            </p>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">Not wired yet</span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card icon={<Mic2 />} title="Selectable voice" body="Voice settings routes exist, but this page does not start a live session until the voice-agent session API is added." />
        <Card icon={<Waves />} title="Streaming session" body="Requires a bidirectional stream route for microphone input, transcript events, and audio output." />
        <Card icon={<ShieldCheck />} title="Owner context" body="The agent must load authenticated platform-owner context and avoid public or app-user leakage." />
        <Card icon={<Radio />} title="Reusable contract" body="The same voice contract can later be exposed to app-level voice selections." />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Backend contract required">
          <div className="space-y-2">
            {requiredBackend.map((route) => (
              <Row key={route} label={route} value="required" />
            ))}
          </div>
        </Panel>

        <Panel title="Existing voice configuration routes">
          <div className="space-y-2">
            {existingVoiceRoutes.map((route) => (
              <Row key={route} label={route} value="available for settings/config" />
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-start gap-3">
          <Settings2 className="mt-1 h-5 w-5 text-cyan-300" />
          <div>
            <h2 className="text-lg font-black text-white">Honest runtime state</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              No microphone, streaming, or generated speech controls are enabled here because there is no canonical voice-agent streaming backend yet. Configure voices in Settings; wire the session API before enabling live controls.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Card({ icon, title, body }: { icon: React.ReactElement; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <span className="text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <h2 className="mt-4 text-sm font-black text-white">{title}</h2>
      <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
    </article>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-lg font-black text-white">{title}</h2><div className="mt-4">{children}</div></section>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2 text-xs"><span className="font-mono font-bold text-slate-300">{label}</span><span className="text-right font-black text-amber-200">{value}</span></div>
}
