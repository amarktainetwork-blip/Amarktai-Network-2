import Link from 'next/link'
import { ArrowRight, Command, Library, Puzzle, ShieldCheck, Sparkles } from 'lucide-react'
import BrandName from '@/components/BrandName'
import PublicShell from '@/components/public/PublicShell'

const capabilities = [
  ['Command Center', 'Describe an outcome, inspect the capability plan, approve sensitive work, and follow execution.', Command],
  ['Studio', 'Create image, video, music, voice, and document outputs through capability-first controls.', Sparkles],
  ['Connected Apps', 'Give registered products scoped access to AmarktAI capabilities with signed requests.', Puzzle],
  ['Artifacts', 'Keep completed outputs available for preview, download, and reuse.', Library],
  ['Truthful operation', 'Unavailable and unconfigured work is reported honestly instead of appearing successful.', ShieldCheck],
] as const

export default function PlatformPage() {
  return (
    <PublicShell>
      <section className="bg-[#07111F] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Platform</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            <BrandName /> is one capability layer from request to result.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Start with the outcome. AmarktAI handles capability selection, approval, progress, and reusable outputs.
          </p>
        </div>
      </section>
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:px-8">
          {capabilities.map(([title, body, Icon]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
              <Icon className="h-6 w-6 text-cyan-600" />
              <h2 className="mt-6 text-2xl font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-cyan-50 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="max-w-4xl text-4xl font-black">Start with the outcome, not the tool.</h2>
          <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Open AmarktAI <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
