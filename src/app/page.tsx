import Link from 'next/link'
import {
  ArrowRight,
  AudioLines,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  FileText,
  Film,
  Image,
  Layers3,
  Lock,
  Mic,
  Music,
  Puzzle,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'
import BrandName from '@/components/BrandName'

// ── Capability families ───────────────────────────────────────────────────────

const CAPABILITY_FAMILIES = [
  { icon: Brain, label: 'Text & Reasoning', desc: 'Chat, reasoning, research, summarization, classification, embeddings, rerank', color: 'text-teal-400' },
  { icon: Image, label: 'Image Generation', desc: 'Text-to-image, image editing, computer vision, segmentation, depth estimation', color: 'text-cyan-400' },
  { icon: Video, label: 'Video Generation', desc: 'Text-to-video, image-to-video, video transformation, long-running async jobs', color: 'text-violet-400' },
  { icon: AudioLines, label: 'Audio & Voice', desc: 'Text-to-speech, speech recognition, voice design, audio classification', color: 'text-teal-400' },
  { icon: Music, label: 'Music & Lyrics', desc: 'Full song generation, lyrics writing, style-guided music creation', color: 'text-cyan-400' },
  { icon: Bot, label: 'Avatar & Voice Clone', desc: 'Talking avatar video, voice persona design, lip-sync generation', color: 'text-violet-400' },
  { icon: FileText, label: 'Document & Vision', desc: 'Document QA, visual question answering, image-to-text, OCR pipelines', color: 'text-teal-400' },
  { icon: Cpu, label: 'Data & Time-Series', desc: 'Tabular classification, regression, time-series forecasting, feature extraction', color: 'text-cyan-400' },
  { icon: Puzzle, label: 'Connected-App Execution', desc: 'HMAC-signed capability requests, scoped jobs, artifact return, audit trail', color: 'text-violet-400' },
] as const

// ── Providers ─────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { name: 'GenX', desc: 'Text, image, video, audio, music, avatar, TTS, STT', badge: 'Primary' },
  { name: 'Hugging Face', desc: 'Text, image, audio, STT, embeddings, specialist models', badge: 'Specialist' },
  { name: 'Qwen / Wan', desc: 'Text, image, video, audio, embeddings, async jobs', badge: 'Media' },
  { name: 'Xiaomi MiMo', desc: 'Text, reasoning, vision, audio, TTS, STT, web search', badge: 'Reasoning' },
  { name: 'Groq', desc: 'Ultra-fast text, reasoning, STT, TTS', badge: 'Speed' },
  { name: 'Together AI', desc: 'Text, image, embeddings, rerank, open models', badge: 'Open' },
] as const

// ── Studio capabilities ───────────────────────────────────────────────────────

const STUDIO_ITEMS = [
  { icon: Brain, label: 'Chat & Reasoning' },
  { icon: Image, label: 'Image Generation' },
  { icon: Film, label: 'Video Generation' },
  { icon: Mic, label: 'Voice & TTS' },
  { icon: Music, label: 'Music & Songs' },
  { icon: Bot, label: 'Avatar Video' },
  { icon: FileText, label: 'Documents & Research' },
  { icon: Sparkles, label: 'Campaigns & Copy' },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <PublicShell>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#07111F] py-28 lg:py-36">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-teal-900/25 blur-[140px]" />
          <div className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-900/20 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-900/15 blur-[100px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '60px 60px' }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.8)]" />
              Universal AI Capability Engine
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
              <BrandName />
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400">
                Network
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-slate-200 sm:text-2xl">
              The agentic AI operating system for apps, media, automation, and connected products.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
              62 AI capabilities. Six approved providers. Capability-first routing. Connected-app execution with HMAC security, scoped jobs, artifacts, and audit trail — all from one command layer.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(20,184,166,0.35)] transition hover:bg-teal-400 hover:shadow-[0_0_48px_rgba(20,184,166,0.5)]"
              >
                Open Command Center <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
              >
                Explore the platform
              </Link>
            </div>

            {/* Stats strip */}
            <div className="mt-12 flex flex-wrap gap-6">
              {[
                ['62', 'AI Capabilities'],
                ['6', 'Approved Providers'],
                ['9', 'Capability Groups'],
                ['100%', 'Truthful Status'],
              ].map(([num, label]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-2xl font-black text-teal-300">{num}</span>
                  <span className="text-xs font-semibold text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Capability Showcase ──────────────────────────────────────────── */}
      <section className="bg-[#F3F7FA] py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">62 AI Capabilities</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              Far beyond a chatbot.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              AmarktAI routes every request to the right provider and model by capability — not by raw model-picking. Every output is an artifact.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITY_FAMILIES.map(({ icon: Icon, label, desc, color }) => (
              <article
                key={label}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-[0_8px_32px_rgba(20,184,166,0.12)]"
              >
                <div className={`h-8 w-8 ${color}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Provider Mesh ────────────────────────────────────────────────── */}
      <section className="bg-[#07111F] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Provider Mesh</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                Capability-first routing. Not model-picking.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-400">
                AmarktAI selects the right provider and model for each capability automatically. You describe what you want — the engine routes it to the best available provider, with fallbacks.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Automatic fallback', 'Credential-aware', 'Async job support', 'Artifact handling'].map((tag) => (
                  <span key={tag} className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PROVIDERS.map(({ name, desc, badge }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-teal-500/30 hover:bg-teal-500/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-white">{name}</p>
                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Connected Apps ───────────────────────────────────────────────── */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Connected App Flow</p>
                <div className="mt-4 space-y-3">
                  {[
                    { step: '1', label: 'Register app', detail: 'Name, slug, scopes, signing secret' },
                    { step: '2', label: 'HMAC-signed request', detail: 'SHA-256 signature + timestamp replay protection' },
                    { step: '3', label: 'Scope validation', detail: 'ai:image:execute, ai:video:execute, ai:text:execute…' },
                    { step: '4', label: 'Job created', detail: 'Async execution with provider routing' },
                    { step: '5', label: 'Artifact returned', detail: 'Download URL, preview, connected-app reference' },
                    { step: '6', label: 'Audit event written', detail: 'Accepted/rejected with safe metadata' },
                  ].map(({ step, label, detail }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-black text-teal-700">
                        {step}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Connected Apps</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                Your apps call AmarktAI for AI tasks.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Register any external app. It sends HMAC-signed requests with declared scopes. AmarktAI verifies, routes, executes, and returns artifacts — with a full audit trail.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Lock, label: 'HMAC-SHA256 security', desc: 'Signed requests with replay protection' },
                  { icon: Layers3, label: 'Scoped capabilities', desc: 'Declare exactly what each app can do' },
                  { icon: Zap, label: 'Async job execution', desc: 'Long-running media jobs with polling' },
                  { icon: CheckCircle2, label: 'Full audit trail', desc: 'Every accepted and rejected event logged' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <Icon className="h-5 w-5 text-teal-600" />
                    <p className="mt-2 text-sm font-bold text-slate-900">{label}</p>
                    <p className="mt-1 text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Studio Showcase ──────────────────────────────────────────────── */}
      <section className="bg-[#07111F] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Studio</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              Chat-first AI creation command center.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-400">
              Describe what you want to create. Studio routes to the right capability, runs the job, and saves the artifact — ready to download, preview, or hand off to a connected app.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_ITEMS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-teal-500/40 hover:bg-teal-500/8"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10">
                  <Icon className="h-5 w-5 text-teal-400" />
                </div>
                <p className="text-sm font-bold text-slate-200">{label}</p>
              </div>
            ))}
          </div>

          {/* Command demo */}
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-400">Example command</p>
            <p className="mt-3 text-xl font-bold text-white">
              &ldquo;Create a 3-minute rock song with female vocals, then generate a matching album cover image.&rdquo;
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Intent understood', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
                { label: 'Music job → GenX', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
                { label: 'Image job → Qwen', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
                { label: 'Artifacts saved', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
              ].map(({ label, color }) => (
                <span key={label} className={`rounded-full border px-3 py-1 text-xs font-bold ${color}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Trust & Readiness ────────────────────────────────────────────── */}
      <section className="bg-[#F3F7FA] py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Readiness & Trust</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              Honest status. No fake green lights.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              AmarktAI shows exactly what is configured and what needs setup. Provider credentials, storage, connected-app secrets, and capability readiness are all visible — in plain language.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Ready', desc: 'Credential configured and tested', color: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
              { label: 'Needs setup', desc: 'Add your API key to activate', color: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
              { label: 'Not configured', desc: 'Optional provider not set up', color: 'border-slate-200 bg-white', badge: 'bg-slate-100 text-slate-600' },
              { label: 'Action required', desc: 'Connected app secret missing', color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700' },
            ].map(({ label, desc, color, badge }) => (
              <div key={label} className={`rounded-2xl border p-5 ${color}`}>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-black ${badge}`}>{label}</span>
                <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#07111F] py-20 text-white lg:py-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-900/30 via-slate-900/50 to-violet-900/20 px-8 py-16 shadow-[0_0_80px_rgba(20,184,166,0.15)] lg:px-16">
          {/* Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/20 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/15 blur-[80px]" />

          <div className="relative z-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Get started</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                One command layer.<br />
                <span className="text-teal-300">Connected work. Honest results.</span>
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-400">
                Open the command center, configure your providers, and start creating — images, video, music, voice, documents, and connected-app AI execution.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-7 py-4 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(20,184,166,0.4)] transition hover:bg-teal-400"
              >
                Open Command Center <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/10"
              >
                Platform overview
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicShell>
  )
}
