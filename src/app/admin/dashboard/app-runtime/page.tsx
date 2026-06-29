export const dynamic = 'force-dynamic'

const REQUEST_EXAMPLE = `{
  "capability": "music_generation",
  "input": "song lyrics or prompt",
  "controls": {
    "genre": "pop",
    "bpm": 120,
    "lyrics": "...",
    "vocalMode": "vocal"
  }
}`

const RESPONSE_EXAMPLE = `{
  "capability": "music_generation",
  "success": true,
  "provider": "runtime-selected-provider",
  "model": "runtime-selected-model",
  "artifactId": "artifact-id",
  "storageUrl": "storage-url",
  "proofStatus": "proven",
  "attempts": [],
  "nextAction": null
}`

const PRINCIPLES = [
  { title: 'Apps request capabilities', body: 'Apps send a capability id, input, and optional controls. They never specify a provider or model.' },
  { title: 'AmarktAI Network routes', body: 'The platform selects the best available provider based on capability, cost tier, proof status, and budget.' },
  { title: 'AmarktAI Network executes', body: 'The platform calls the selected provider API, handles retries, and falls back to next eligible provider on failure.' },
  { title: 'AmarktAI Network stores artifacts', body: 'Generated output is persisted as a typed artifact with a stable storageUrl and artifactId.' },
  { title: 'AmarktAI Network records proof', body: 'Each execution is recorded with provider, model, proofStatus, and attempt history.' },
  { title: 'AmarktAI Network returns structured results', body: 'The result includes provider/model only in the response — not in the request.' },
]

export default function AppRuntimePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">App Runtime</h1>
        <p className="mt-1 text-sm text-slate-400">
          Apps request capabilities. AmarktAI Network routes, executes, stores artifacts, and records proof.
          Apps do not choose providers or models.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Platform contract</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-black text-cyan-300">{p.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <h2 className="font-black text-white">App request — no provider or model</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-5">
            {REQUEST_EXAMPLE}
          </pre>
          <p className="mt-2 text-xs text-slate-500">Provider and model are runtime-selected. Apps never include them.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <h2 className="font-black text-white">Runtime result — provider in response only</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-5">
            {RESPONSE_EXAMPLE}
          </pre>
          <p className="mt-2 text-xs text-slate-500">Provider and model appear in the result for proof/audit. Not in the request.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Execution route status</h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <span className="text-sm text-slate-300">/api/admin/studio/execute</span>
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">Wired</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Studio and future apps call this endpoint with a capability request. The runtime handles provider selection.</p>
      </section>
    </div>
  )
}
