import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Database, FileImage, Music, Mic, Send, Video, Zap } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const workflowSteps = [
  { step: '01', icon: <Zap className="h-5 w-5" />, label: 'Website URL', sub: 'Provide any website URL. The platform scrapes and extracts brand content automatically.' },
  { step: '02', icon: <Zap className="h-5 w-5" />, label: 'Brand extraction', sub: 'Name, category, audience, tone, visual style, products, services, DOs, DON\'Ts, and compliance notes extracted.' },
  { step: '03', icon: <BookOpen className="h-5 w-5" />, label: 'Brand Memory', sub: 'Brand identity is stored as persistent Brand Memory. Every future campaign and asset generation references it.' },
  { step: '04', icon: <Database className="h-5 w-5" />, label: 'RAG knowledge', sub: 'Website content is embedded into a vector knowledge base. Agents retrieve relevant context for every task.' },
  { step: '05', icon: <Zap className="h-5 w-5" />, label: 'Campaign plan', sub: 'Marketing agent creates a campaign plan with items, captions, hashtags, and platform targets.' },
  { step: '06', icon: <FileImage className="h-5 w-5" />, label: 'Generated assets', sub: 'Images, videos, music, voiceovers, avatars, captions, and scripts are generated and stored.' },
  { step: '07', icon: <CheckCircle2 className="h-5 w-5" />, label: 'Approval queue', sub: 'Every asset enters the approval queue. Nothing is published without an explicit approval decision.' },
  { step: '08', icon: <Send className="h-5 w-5" />, label: 'Schedule / export', sub: 'Approved items are scheduled for platforms or exported as packages for manual posting.' },
  { step: '09', icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics and learning', sub: 'Performance metrics are ingested. Learning signals improve future campaigns.' },
]

export default function MarketingPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Marketing automation</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            From website URL to published campaign.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Give AmarktAI a website URL. It scrapes, extracts brand identity, builds Brand Memory, creates a campaign plan, generates assets, manages approvals, and schedules publishing — fully autonomous.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-500">
              Run marketing workflow <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/platform" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10">
              View platform
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow steps */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Marketing workflow</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            9-step autonomous marketing pipeline.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((s) => (
              <article key={s.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">{s.step}</span>
                  <div className="text-blue-500">{s.icon}</div>
                </div>
                <h3 className="mt-4 text-lg font-black">{s.label}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{s.sub}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Content types */}
      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Content types</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Every format. Every platform.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <FileImage className="h-6 w-6" />, label: 'Social posts', sub: 'Instagram, TikTok, X, LinkedIn, Facebook, Pinterest' },
              { icon: <FileImage className="h-6 w-6" />, label: 'Images', sub: 'Campaign visuals, product shots, brand art' },
              { icon: <Video className="h-6 w-6" />, label: 'Short video / reels', sub: 'YouTube Shorts, TikTok, Instagram Reels' },
              { icon: <Mic className="h-6 w-6" />, label: 'Voiceovers', sub: 'Ad narration, product explainers' },
              { icon: <Music className="h-6 w-6" />, label: 'Music', sub: 'Background tracks, jingles, brand audio' },
              { icon: <Zap className="h-6 w-6" />, label: 'Captions', sub: 'Platform-native, hashtags, CTAs' },
              { icon: <Zap className="h-6 w-6" />, label: 'Scripts', sub: 'Video scripts, ad copy, voiceover scripts' },
              { icon: <Zap className="h-6 w-6" />, label: 'Avatar presenters', sub: 'AI avatar video presenters' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-blue-400">{c.icon}</div>
                <p className="mt-4 text-sm font-black">{c.label}</p>
                <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approval and publishing */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Approval and publishing</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            No publish without approval.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Every generated asset enters the approval queue. Approve, request changes, or reject. Only approved assets can be scheduled or exported.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Draft', color: 'bg-slate-100 text-slate-700', desc: 'Asset created and stored' },
              { label: 'Pending review', color: 'bg-amber-100 text-amber-700', desc: 'Awaiting human decision' },
              { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', desc: 'Ready to schedule or export' },
              { label: 'Published', color: 'bg-blue-100 text-blue-700', desc: 'Confirmed by backend result' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${s.color}`}>{s.label}</span>
                <p className="mt-3 text-xs text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Launch your first campaign.</h2>
            <p className="mt-2 text-base text-blue-100">Give AmarktAI a URL. It handles the rest.</p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 transition hover:bg-blue-50">
            Start marketing workflow <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
