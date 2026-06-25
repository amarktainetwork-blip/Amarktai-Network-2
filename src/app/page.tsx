import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  FileImage,
  Globe,
  Layers3,
  Mic,
  Music,
  Network,
  Package,
  Play,
  Radar,
  Send,
  Shield,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'
import BrandName from '@/components/BrandName'

// ─── Hero ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <PublicShell>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[760px] overflow-hidden bg-[#03050a]" aria-label="Hero">
        <div className="absolute inset-0 opacity-90">
          <IntelligenceFabric className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,.97)_0%,rgba(3,5,10,.82)_42%,rgba(3,5,10,.18)_72%,rgba(3,5,10,.04)_100%),linear-gradient(180deg,transparent_60%,#03050a)]" />
        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-5 py-24 lg:px-8">
          <div className="max-w-3xl [text-shadow:0_2px_24px_rgba(0,0,0,.9)]">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Central <span className="text-blue-400">AI</span> Capability Platform
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[.95] tracking-[-0.045em] text-white sm:text-6xl lg:text-8xl">
              <BrandName />
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-bold leading-8 text-slate-100 sm:text-2xl">
              A central <span className="text-blue-400">AI</span> capability platform for building and running AI-powered apps.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Every app gets access to shared <span className="text-blue-300">AI</span> capabilities - chat, research, image, video, music, voice, avatars, Brand Memory, RAG, agents, asset storage, approvals, publishing, analytics, and learning.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_28px_rgba(59,130,246,0.45)] transition hover:bg-blue-400 hover:shadow-[0_0_36px_rgba(59,130,246,0.55)]"
              >
                Launch your <span className="text-blue-200">AI</span>-powered workflow <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/55 px-6 py-3.5 text-sm font-black text-white backdrop-blur-md transition hover:border-white/35 hover:bg-slate-900/70"
              >
                Explore the platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── What AmarktAI does ───────────────────────────────────────────────── */}
      <section className="bg-white py-20 text-slate-950 lg:py-28" id="what-we-do">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">What we do</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">
            AmarktAI turns <span className="text-blue-600">AI</span> into usable business workflows.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            The platform gives apps one reliable place to request AI capabilities, store outputs, enforce approvals, route through active providers, and keep operational state visible without turning each app into its own infrastructure project.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: <Network className="h-6 w-6" />,
                title: 'One platform, many apps',
                body: 'Apps stay simple. AmarktAI handles the AI capability layer behind them — routing, providers, memory, storage, approvals, and learning.',
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: 'Intelligent routing',
                body: 'Apps request capabilities and workflows. AmarktAI routes each request based on capability, quality, speed, cost, fallback, and availability.',
              },
              {
                icon: <CheckCircle2 className="h-6 w-6" />,
                title: 'Honest results',
                body: 'No fake green lights. Connected means a live test passed. Missing setup stays visible without pretending work has completed.',
              },
            ].map((c) => (
              <article key={c.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-blue-500">{c.icon}</div>
                <h3 className="mt-5 text-xl font-black">{c.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Runtime workflow section ─────────────────────────────────────────── */}
      <section className="bg-[#050a14] py-20 text-white lg:py-28" id="runtime-workflow">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Runtime workflow</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">
            From app request to stored, reviewable output.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Apps ask for a capability. AmarktAI handles validation, routing, execution, persistence, review state, and downstream handoff through the same control plane.
          </p>
          <div className="mt-12 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { step: '01', label: 'Request', sub: 'App + capability' },
              { step: '02', label: 'Policy', sub: 'Permissions + safety' },
              { step: '03', label: 'Routing', sub: 'Provider + model' },
              { step: '04', label: 'Execution', sub: 'Text, media, agents' },
              { step: '05', label: 'Artifact', sub: 'Stored output' },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">{s.step}</p>
                <p className="mt-3 text-sm font-black text-white">{s.label}</p>
                <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '06', label: 'Review', sub: 'Approval state' },
              { step: '07', label: 'Publish / export', sub: 'Manual or scheduled' },
              { step: '08', label: 'Measure', sub: 'Usage + outcomes' },
              { step: '09', label: 'Improve', sub: 'Learning signals' },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">{s.step}</p>
                <p className="mt-3 text-sm font-black text-white">{s.label}</p>
                <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/platform" className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-300 transition hover:bg-blue-500/20">
              Explore the control plane <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── AI Capabilities section ──────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 text-slate-950 lg:py-28" id="capabilities">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Capabilities</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">
            One runtime. Every <span className="text-blue-600">AI</span> capability your app needs.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Sparkles />, label: 'Chat & reasoning', group: 'Intelligence' },
              { icon: <Globe />, label: 'Research', group: 'Intelligence' },
              { icon: <Radar />, label: 'Website scraping', group: 'Intelligence' },
              { icon: <BookOpen />, label: 'Brand Memory', group: 'Intelligence' },
              { icon: <Database />, label: 'RAG & knowledge', group: 'Intelligence' },
              { icon: <Bot />, label: 'Agents', group: 'Intelligence' },
              { icon: <FileImage />, label: 'Image generation', group: 'Media' },
              { icon: <Video />, label: 'Video generation', group: 'Media' },
              { icon: <Music />, label: 'Music generation', group: 'Media' },
              { icon: <Mic />, label: 'Voice / TTS', group: 'Media' },
              { icon: <Users />, label: 'Avatars', group: 'Media' },
              { icon: <Play />, label: 'Marketing campaigns', group: 'Workflows' },
              { icon: <Package />, label: 'Campaign storage', group: 'Workflows' },
              { icon: <CheckCircle2 />, label: 'Approvals', group: 'Workflows' },
              { icon: <Send />, label: 'Publishing / export', group: 'Workflows' },
              { icon: <BarChart3 />, label: 'Analytics', group: 'Workflows' },
              { icon: <Shield />, label: 'VPS readiness', group: 'Platform' },
              { icon: <Layers3 />, label: 'Provider routing', group: 'Platform' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">{c.icon}</div>
                <div>
                  <p className="text-sm font-black text-slate-900">{c.label}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">{c.group}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/capabilities" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
              View all capabilities <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Agents and learning ──────────────────────────────────────────────── */}
      <section className="bg-[#060c18] py-20 text-white lg:py-28" id="agents">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Agents and learning</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
              <span className="text-blue-400">AI</span> agents that work, learn, and improve.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              AmarktAI runs specialist agents — marketing, research, customer service, and automation — each routing through the capability layer. Every run produces a learning signal that improves future decisions.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Marketing agent — campaign planning, copy, targeting',
                'Research agent — web search, summarisation, synthesis',
                'Customer service agent — FAQ, response drafts, escalation',
                'Automation agent — workflow steps, scheduling, handoffs',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">How agents work</p>
            <div className="mt-6 space-y-3">
              {[
                ['App sends', 'task + goal'],
                ['Agent picks', 'capabilities from allowed set'],
                ['Runtime routes', 'to best provider automatically'],
                ['Result returned', 'to app + learning signal recorded'],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                  <span className="text-xs font-bold text-slate-400">{label}</span>
                  <span className="text-xs font-black text-blue-300">{val}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">Apps never specify providers or models. Runtime decides.</p>
          </div>
        </div>
      </section>

      {/* ── Brand Memory and RAG ─────────────────────────────────────────────── */}
      <section className="bg-white py-20 text-slate-950 lg:py-28" id="brand-memory">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Brand Memory and RAG</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Your brand&apos;s knowledge, always available.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-blue-50 p-7">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h3 className="mt-5 text-xl font-black">Brand Memory</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                AmarktAI extracts brand identity from your website — name, category, audience, tone, visual style, products, services, DOs, DON&apos;Ts, and compliance notes. Every campaign and asset generation is guided by this persistent memory.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
              <Database className="h-6 w-6 text-blue-600" />
              <h3 className="mt-5 text-xl font-black">RAG Knowledge Base</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Website content is ingested into a vector knowledge base using HuggingFace embeddings and Qdrant. Agents retrieve relevant context for every campaign plan, research task, or customer query.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Asset storage and approvals ──────────────────────────────────────── */}
      <section className="bg-slate-100 py-20 text-slate-950 lg:py-28" id="asset-storage">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Asset storage and approvals</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
              Every asset stored. No publish without approval.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Every generated image, video, caption, script, and post is saved as a versioned asset with full audit trail. Approvals are enforced before publishing — no asset goes live without an explicit approve decision.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { status: 'draft', label: 'Asset created', color: 'bg-slate-200 text-slate-700' },
              { status: 'pending_review', label: 'Sent for approval', color: 'bg-amber-100 text-amber-700' },
              { status: 'approved', label: 'Approved — ready to publish', color: 'bg-emerald-100 text-emerald-700' },
              { status: 'published', label: 'Published or exported', color: 'bg-blue-100 text-blue-700' },
            ].map((row) => (
              <div key={row.status} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <span className="text-sm font-bold text-slate-800">{row.label}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${row.color}`}>{row.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Publishing and analytics ─────────────────────────────────────────── */}
      <section className="bg-[#050a14] py-20 text-white lg:py-28" id="publishing">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Publishing and analytics</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Schedule, publish, measure, learn.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: <Send className="h-6 w-6" />, title: 'Scheduling', body: 'Set a time and platform for each approved asset. The scheduler respects approval status — blocked items stay blocked.' },
              { icon: <BarChart3 className="h-6 w-6" />, title: 'Analytics', body: 'Track impressions, reach, clicks, CTR, engagement rate, and more. Ingest from any source or platform API.' },
              { icon: <Zap className="h-6 w-6" />, title: 'Learning signals', body: 'Every result feeds back to the runtime. Agents and campaigns improve with each published outcome.' },
            ].map((c) => (
              <article key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <div className="text-blue-400">{c.icon}</div>
                <h3 className="mt-5 text-xl font-black">{c.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider runtime ─────────────────────────────────────────────────── */}
      <section className="bg-white py-20 text-slate-950 lg:py-28" id="providers">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Provider runtime</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Apps never choose providers or models.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            AmarktAI routes each request based on capability, quality, speed, cost, fallback chain, and live availability. The active provider set is always exactly these five — no removed providers are used.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: 'genx', name: 'GenX', desc: 'Primary — chat, image, video, music, TTS, STT', color: 'border-blue-200 bg-blue-50' },
              { key: 'huggingface', name: 'Hugging Face', desc: 'Embeddings, music, fallback text', color: 'border-yellow-200 bg-yellow-50' },
              { key: 'together', name: 'Together AI', desc: 'Image, fallback text generation', color: 'border-purple-200 bg-purple-50' },
              { key: 'groq', name: 'Groq', desc: 'Fast fallback text inference', color: 'border-emerald-200 bg-emerald-50' },
              { key: 'mimo', name: 'MiMo', desc: 'Text generation fallback', color: 'border-slate-200 bg-slate-50' },
            ].map((p) => (
              <div key={p.key} className={`rounded-2xl border p-5 ${p.color}`}>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="mt-4 text-sm font-black text-slate-900">{p.name}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">Active providers only. Provider status is based on real configured keys and live checks in the admin control centre.</p>
        </div>
      </section>

      {/* ── Readiness gates ──────────────────────────────────────────────────── */}
      <section className="bg-slate-950 py-20 text-white lg:py-28" id="readiness-gates">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Readiness gates</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            No publish path depends on hardcoded green lights.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            The admin control centre separates configured, missing, degraded, and recovered services. Database, storage, queues, vector search, providers, and publishing all report from runtime probes or stored state.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Database persistence',
              'Provider keys',
              'Artifact storage',
              'Approvals',
              'Publishing jobs',
              'Worker queue',
              'Vector store',
              'VPS probes',
            ].map((r) => (
              <div key={r} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <Shield className="h-4 w-4 shrink-0 text-blue-300" />
                <span className="text-xs font-bold text-slate-300">{r}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500">Readiness details live behind admin authentication and never expose secret values.</p>
        </div>
      </section>

      {/* ── Apps section ─────────────────────────────────────────────────────── */}
      <section className="bg-cyan-50 py-20 text-slate-950 lg:py-28" id="apps">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">One platform, many apps</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Apps stay simple. AmarktAI handles the <span className="text-blue-600">AI</span> capability layer behind them.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Each app requests workflows and capabilities from the platform. The platform handles routing, providers, storage, memory, approvals, scheduling, publishing, analytics, and learning.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { name: 'Marketing', desc: 'Campaigns, assets, publishing' },
              { name: 'Customer Service', desc: 'FAQ, response drafts' },
              { name: 'CRM', desc: 'Contact intelligence' },
              { name: 'Horse Management', desc: 'Breed, health, training' },
              { name: 'Crypto', desc: 'Research, signals' },
              { name: 'Adult Creator', desc: 'Permission-gated, safety-controlled' },
              { name: 'Education', desc: 'Courses, tutoring' },
              { name: 'Legal', desc: 'Document drafts' },
              { name: 'Music', desc: 'Generation, cataloguing' },
              { name: 'Trading', desc: 'Research, alerts' },
            ].map((app) => (
              <div key={app.name} className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-900">{app.name}</p>
                <p className="mt-1 text-xs text-slate-500">{app.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/apps" className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
              See all apps <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Safety section ───────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-20 text-white lg:py-28" id="safety">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Safety</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
              Gated. Permission-controlled. Safety-first.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Adult creator workflows are isolated, permission-gated, and safety-controlled. They require explicit permissions, legal and consent checks, and strict restrictions against illegal, non-consensual, underage, or rights-violating content.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Age verification and consent confirmation required',
                'Rights checks for voice cloning and likeness use',
                'Minors, non-consensual, and illegal content blocked',
                'All requests filtered before submission',
                'No celebrity impersonation without verified rights',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/safety" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">
                Read our safety policy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <Shield className="h-8 w-8 text-blue-400" />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-blue-400">Content restrictions</p>
            <ul className="mt-4 space-y-2">
              {[
                'Content depicting minors',
                'Non-consensual acts or depictions',
                'Real-person sexual deepfakes without rights',
                'Celebrity sexual impersonation',
                'Revenge or leaked content',
                'Voice cloning without consent',
                'Illegal content in any jurisdiction',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Future apps / CTA ────────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-200"><BrandName /></p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight lg:text-5xl">
              Your AI-powered workflow starts here.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-blue-100">
              One platform. Every AI capability. Apps stay simple.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              Launch your workflow <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/20"
            >
              Explore the platform
            </Link>
          </div>
        </div>
      </section>

    </PublicShell>
  )
}
