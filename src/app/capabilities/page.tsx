import Link from 'next/link'
import { ArrowRight, Bot, Boxes, Database, FileImage, Mic, Music, Search, ShieldCheck, Sparkles, Video } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const groups = [
  {
    label: 'Intelligence',
    items: [
      ['Text and reasoning', 'Structured output, app assistance, workflow decisions', Sparkles],
      ['Research', 'Research tasks, synthesis, retrieval-backed context', Search],
      ['Agents', 'Marketing, research, customer service, automation', Bot],
      ['Memory and RAG', 'Brand memory, app memory, vector retrieval', Database],
    ],
  },
  {
    label: 'Media',
    items: [
      ['Image', 'Generated images and image artifacts', FileImage],
      ['Video', 'Video jobs, avatar clips, status-aware outputs', Video],
      ['Music', 'Music and audio generation routes', Music],
      ['Voice and avatars', 'TTS, STT, avatar presenter workflows', Mic],
    ],
  },
  {
    label: 'Operations',
    items: [
      ['Artifacts', 'Stored outputs, links, previews, status', Boxes],
      ['Approvals', 'Manual review, needs changes, publish gates', ShieldCheck],
      ['Campaigns', 'Autonomous marketing results and generated assets', Bot],
      ['Learning', 'Execution signals and agent summaries', Sparkles],
    ],
  },
]

export default function CapabilitiesPage() {
  return (
    <PublicShell>
      <section className="bg-[#03050a] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-blue-300">Capabilities</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-none tracking-tight lg:text-7xl">
            Request capabilities, not infrastructure routes.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            The platform exposes capability categories to apps while runtime owns routing, fallback, storage, approval state, and proof through automatic decisions.
          </p>
        </div>
      </section>

      {groups.map((group, index) => (
        <section key={group.label} className={`${index % 2 === 0 ? 'bg-[#071019]' : 'bg-[#03050a]'} py-20 text-white lg:py-24`}>
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{group.label}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {group.items.map(([title, body, Icon]) => {
                const ItemIcon = Icon as typeof Sparkles
                return (
                  <article key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                    <ItemIcon className="h-6 w-6 text-cyan-300" />
                    <h2 className="mt-5 text-lg font-black text-white">{String(title)}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{String(body)}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Provider boundary</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            The capability console does not expose infrastructure pickers.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
            The approved execution network is routed automatically. After a run, the proof panel can show what the runtime selected. Before a run, users choose context, capability, request, budget, quality, and permitted safety settings.
          </p>
          <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300">
            Open capability console <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
