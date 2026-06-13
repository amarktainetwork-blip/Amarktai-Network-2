import Link from 'next/link'
import {
  ArrowRight,
  AudioLines,
  Brain,
  CheckCircle2,
  FileText,
  Film,
  Image,
  Layers3,
  Lock,
  Music,
  Puzzle,
  Sparkles,
} from 'lucide-react'
import BrandName from '@/components/BrandName'
import PublicShell from '@/components/public/PublicShell'

const CAPABILITY_FAMILIES = [
  { icon: Brain, label: 'Text and reasoning', detail: 'Chat, research, summarization, classification, and structured answers.' },
  { icon: Image, label: 'Images and vision', detail: 'Create, edit, understand, and transform visual content.' },
  { icon: Film, label: 'Video', detail: 'Plan and generate video with truthful long-running job status.' },
  { icon: AudioLines, label: 'Voice and audio', detail: 'Speech generation, transcription, and audio understanding.' },
  { icon: Music, label: 'Music and lyrics', detail: 'Create songs, instrumentals, lyrics, and reusable audio artifacts.' },
  { icon: FileText, label: 'Documents and data', detail: 'Analyze files, answer document questions, and return structured results.' },
] as const

const FLOW = [
  ['Describe the outcome', 'Start with what you need, not a vendor or model name.'],
  ['AmarktAI selects a capability', 'The request is validated against the canonical capability catalog.'],
  ['Review when required', 'Risky or policy-sensitive actions wait for explicit approval.'],
  ['Receive a truthful result', 'Completed outputs become reusable artifacts; pending work stays pending.'],
] as const

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden bg-[#07111F] py-28 text-white lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-48 -top-48 h-[680px] w-[680px] rounded-full bg-teal-900/30 blur-[140px]" />
          <div className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full bg-cyan-900/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-teal-300">
            <Sparkles className="h-3.5 w-3.5" />
            Universal AI capability engine
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-8xl">
            <BrandName />
            <span className="mt-2 block bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
              turns intent into finished work.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Create, analyze, research, automate, and connect products through one capability-first command layer.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-teal-300">
              Open AmarktAI <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/platform" className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10">
              Explore capabilities
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#F4F8FA] py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Capability first</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight lg:text-5xl">
            One clear product for many kinds of AI work.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITY_FAMILIES.map(({ icon: Icon, label, detail }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="h-7 w-7 text-teal-600" />
                <h3 className="mt-5 text-lg font-black">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07111F] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">How it works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Ask once. Follow the work.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
              AmarktAI keeps capability selection, approvals, jobs, and artifacts in one understandable flow.
            </p>
          </div>
          <div className="space-y-3">
            {FLOW.map(([title, detail], index) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-400 text-sm font-black text-slate-950">{index + 1}</span>
                <div>
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Connected apps</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Bring AmarktAI capabilities into your products.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Registered apps request only the capabilities they are allowed to use. Every request is signed, scoped, and recorded.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [Lock, 'Signed requests', 'Secure app identity and replay protection.'],
              [Puzzle, 'Capability scopes', 'Explicit access for each connected product.'],
              [Layers3, 'Reusable artifacts', 'Outputs remain available for later work.'],
              [CheckCircle2, 'Honest status', 'Unavailable work never appears completed.'],
            ].map(([Icon, title, detail]) => {
              const ItemIcon = Icon as typeof Lock
              return (
                <article key={title as string} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <ItemIcon className="h-5 w-5 text-teal-600" />
                  <h3 className="mt-3 font-black">{title as string}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{detail as string}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
