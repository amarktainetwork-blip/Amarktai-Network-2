import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpen, Bot, CheckCircle2, Database, FileImage, Globe, Layers3, Mic, Music, Network, Package, Play, Radar, Send, Shield, Sparkles, Users, Video, Zap } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const capabilityGroups = [
  {
    group: 'Intelligence',
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'text-blue-600',
    caps: [
      { icon: <Sparkles className="h-5 w-5" />, label: 'Chat and reasoning', desc: 'Conversational AI, reasoning chains, structured outputs' },
      { icon: <Globe className="h-5 w-5" />, label: 'Research', desc: 'Web search, synthesis, fact-checking, citations' },
      { icon: <Radar className="h-5 w-5" />, label: 'Website scraping', desc: 'In-house scraper — no external paid APIs' },
      { icon: <BookOpen className="h-5 w-5" />, label: 'Brand Memory', desc: 'Persistent brand identity, guidelines, and rules' },
      { icon: <Database className="h-5 w-5" />, label: 'RAG and knowledge', desc: 'HuggingFace embeddings + Qdrant vector store' },
      { icon: <Bot className="h-5 w-5" />, label: 'Agents', desc: 'Marketing, research, customer service, automation' },
    ],
  },
  {
    group: 'Media',
    color: 'border-purple-200 bg-purple-50',
    iconColor: 'text-purple-600',
    caps: [
      { icon: <FileImage className="h-5 w-5" />, label: 'Image generation', desc: 'GenX, HuggingFace, Together — quality tiers' },
      { icon: <Video className="h-5 w-5" />, label: 'Video generation', desc: 'Short videos, reels, avatar video presenters' },
      { icon: <Music className="h-5 w-5" />, label: 'Music generation', desc: 'Songs, jingles, background tracks — multiple genres' },
      { icon: <Mic className="h-5 w-5" />, label: 'Voice / TTS', desc: 'Text-to-speech, voiceovers, multiple voice types' },
      { icon: <Users className="h-5 w-5" />, label: 'Avatars', desc: 'AI avatar presenters, talking heads, brand characters' },
    ],
  },
  {
    group: 'Workflows',
    color: 'border-emerald-200 bg-emerald-50',
    iconColor: 'text-emerald-600',
    caps: [
      { icon: <Play className="h-5 w-5" />, label: 'Marketing campaigns', desc: 'End-to-end autonomous campaign generation' },
      { icon: <Package className="h-5 w-5" />, label: 'Campaign storage', desc: 'Versioned assets with full audit trail' },
      { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Approvals', desc: 'Human-in-the-loop approval queue enforcement' },
      { icon: <Send className="h-5 w-5" />, label: 'Publishing and export', desc: 'Scheduled publishing or manual export packages' },
      { icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics', desc: '17 metrics — impressions, CTR, engagement, and more' },
    ],
  },
  {
    group: 'Platform',
    color: 'border-slate-200 bg-slate-50',
    iconColor: 'text-slate-700',
    caps: [
      { icon: <Network className="h-5 w-5" />, label: 'Provider routing', desc: 'Automatic routing — apps never choose providers' },
      { icon: <Shield className="h-5 w-5" />, label: 'VPS readiness', desc: 'Live health checks for all system components' },
      { icon: <Layers3 className="h-5 w-5" />, label: 'Learning signals', desc: 'Every run feeds feedback to improve future decisions' },
      { icon: <Zap className="h-5 w-5" />, label: 'Budget and quality tiers', desc: 'Cheap, balanced, premium — per capability request' },
    ],
  },
]

export default function CapabilitiesPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Capabilities</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            Every <span className="text-blue-400">AI</span> capability your app needs.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI provides a unified capability layer. Apps request what they need — the platform handles routing, providers, quality, cost, and fallback. No app ever sets a provider or model directly.
          </p>
        </div>
      </section>

      {/* Capability groups */}
      {capabilityGroups.map((group) => (
        <section key={group.group} className={`py-16 lg:py-20 ${group.color.split(' ')[1] === 'bg-blue-50' ? 'bg-blue-50' : group.color.split(' ')[1] === 'bg-purple-50' ? 'bg-purple-50' : group.color.split(' ')[1] === 'bg-emerald-50' ? 'bg-emerald-50' : 'bg-slate-50'} text-slate-950`}>
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${group.iconColor}`}>{group.group}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.caps.map((cap) => (
                <article key={cap.label} className={`rounded-2xl border p-6 bg-white shadow-sm ${group.color.split(' ')[0]}`}>
                  <div className={group.iconColor}>{cap.icon}</div>
                  <h3 className="mt-4 text-lg font-black text-slate-900">{cap.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{cap.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Provider note */}
      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Platform providers</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Active providers only. Apps never pick them.
          </h2>
          <div className="mt-8 flex flex-wrap gap-4">
            {['GenX', 'Hugging Face', 'Together AI', 'Groq', 'MiMo'].map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                <span className="text-sm font-black text-white">{p}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-400">Removed providers — OpenAI, Gemini, Anthropic, DeepSeek, MiniMax, Qwen, and others — are not active in the platform runtime.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Use every capability from one platform.</h2>
            <p className="mt-2 text-blue-100">Apps stay simple. AmarktAI handles the AI capability layer.</p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 transition hover:bg-blue-50">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
