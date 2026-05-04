'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import {
  Bot, BrainCircuit, Code2,
  Database,
  HeartPulse, ImageIcon, Lock,
  Mic, Music2, Network, Search, ShieldCheck, Sparkles,
  Video, Zap, ArrowRight, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay },
})

const appProfiles = [
  {
    name: 'Crypto / Finance',
    color: 'text-yellow-300',
    border: 'border-yellow-500/20',
    bg: 'hover:bg-yellow-400/[0.04]',
    agents: ['Crypto Agent', 'Risk Agent', 'Market Research Agent', 'Diagnostics Agent'],
    features: ['Real-time market research', 'Risk analysis and alerts', 'Portfolio monitoring', 'Secure key management'],
  },
  {
    name: 'Marketing',
    color: 'text-blue-300',
    border: 'border-blue-500/20',
    bg: 'hover:bg-blue-400/[0.04]',
    agents: ['Campaign Agent', 'Research Agent', 'Copy Agent', 'Analytics Agent'],
    features: ['Campaign generation', 'Competitor research', 'Copy and asset creation', 'Performance tracking'],
  },
  {
    name: 'Companion / Social AI',
    color: 'text-pink-300',
    border: 'border-pink-500/20',
    bg: 'hover:bg-pink-400/[0.04]',
    agents: ['Character Agent', 'Memory/Emotion Agent', 'Media Agent', 'Adult Policy Agent'],
    features: ['Per-user memory and context', 'Emotional intelligence layer', 'Voice and avatar creation', 'Adult policy if needed'],
  },
  {
    name: 'Media / Creative',
    color: 'text-rose-300',
    border: 'border-rose-500/20',
    bg: 'hover:bg-rose-400/[0.04]',
    agents: ['Media Agent', 'Voice Agent', 'Scraper Agent', 'Research Agent'],
    features: ['Image, video, music generation', 'Talking avatar builder', 'Music video creation', 'Asset storage and reuse'],
  },
  {
    name: 'SaaS / Admin App',
    color: 'text-emerald-300',
    border: 'border-emerald-500/20',
    bg: 'hover:bg-emerald-400/[0.04]',
    agents: ['Support Agent', 'Onboarding Agent', 'Automation Agent', 'Diagnostics Agent'],
    features: ['Automated support flows', 'User onboarding assistance', 'System monitoring', 'Diagnostics and alerts'],
  },
  {
    name: 'Custom Product',
    color: 'text-violet-300',
    border: 'border-violet-500/20',
    bg: 'hover:bg-violet-400/[0.04]',
    agents: ['Aiva Operator', 'Repo Builder', 'Researcher', 'App Discovery'],
    features: ['Agent assignment and config', 'Custom memory and tools', 'Repo and deploy awareness', 'Full audit trail'],
  },
]

const intelligencePackage = [
  { icon: Bot,          label: 'Agents',             desc: 'Scoped to the app with role, tools, and approval rules' },
  { icon: Database,     label: 'Memory',             desc: 'Per-app context and cross-session persistence'           },
  { icon: Zap,          label: 'Tools / Actions',    desc: 'Capability set specific to the product'                  },
  { icon: Mic,          label: 'Voice / Media',      desc: 'TTS, STT, image, video, music, and avatars'              },
  { icon: Lock,         label: 'Adult Policy',       desc: 'Per-app content policy if the product requires it'       },
  { icon: Search,       label: 'Research',           desc: 'Market watching, scraping, and opportunity discovery'    },
  { icon: Code2,        label: 'Repo / Deploy',      desc: 'Command to code to PR, with merge and deploy approval'   },
  { icon: HeartPulse,   label: 'Monitoring',         desc: 'App health, job status, provider state, and alerts'      },
  { icon: ShieldCheck,  label: 'Budget / Security',  desc: 'Spend limits, key boundaries, and role permissions'      },
]

const capabilities = [
  { icon: Sparkles,     name: 'Aiva',           desc: 'Operator intelligence. Understands apps, agents, memory, and approval state.',       tags: ['core', 'coordinator'] },
  { icon: Code2,        name: 'Repo Workbench', desc: 'Connect repo, describe task, review diff, approve PR. Command to code to production.', tags: ['code', 'github', 'pr'] },
  { icon: BrainCircuit, name: 'Memory Layer',   desc: 'Per-app context, cross-session persistence, and learning from outcomes.',             tags: ['memory', 'context'] },
  { icon: Bot,          name: 'Agent Network',  desc: 'Specialist agents assigned roles, tools, permissions, memory, and approval rules.',    tags: ['agents', 'network'] },
  { icon: Search,       name: 'Researcher',     desc: 'Watches markets, discovers opportunities, drafts plans, alerts the operator.',         tags: ['research', 'discovery'] },
  { icon: ImageIcon,    name: 'Image Studio',   desc: 'High-fidelity generation with policy-aware routing. Standard and adult modes.',        tags: ['image', 'creative'] },
  { icon: Mic,          name: 'Voice Studio',   desc: 'TTS and STT with persona-aware voice routing. Audio artifacts stored.',               tags: ['voice', 'audio'] },
  { icon: Video,        name: 'Video Studio',   desc: 'Queue-backed video generation with tracking and artifact storage.',                   tags: ['video', 'creative'] },
  { icon: Music2,       name: 'Music Creator',  desc: 'AI song generation: theme, genre, mood, vocals, lyrics, BPM, and cover art.',         tags: ['music', 'audio'] },
  { icon: HeartPulse,   name: 'Diagnostics',    desc: 'Infrastructure awareness: VPS, services, jobs, providers, storage, and health.',       tags: ['health', 'infra'] },
  { icon: ShieldCheck,  name: 'Approval Gates', desc: 'Adult access, deploy, merge, spend, and destructive actions — all approval-gated.',   tags: ['security', 'gates'] },
  { icon: Network,      name: 'App Discovery',  desc: 'Discovers new product opportunities and sends approved plans to agents.',             tags: ['discovery', 'research'] },
]

export default function AppsPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-label text-violet-300">AI operating ecosystem</p>
            <h1 className="text-display mt-4 max-w-5xl">
              Every app gets its own intelligence package.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-slate-300">
              Connect a product to Amarktai Network and give it a dedicated set of agents, memory, tools, voice, media, research, repo awareness, monitoring, and security rules. The network learns from each app and keeps it improving.
            </p>
          </motion.div>

          {/* Intelligence package */}
          <section className="mt-14">
            <motion.div {...fadeUp()}>
              <p className="text-label text-cyan-300">What every app can receive</p>
              <h2 className="text-headline mt-3">The app intelligence stack.</h2>
            </motion.div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {intelligencePackage.map((item, i) => (
                <motion.div
                  key={item.label}
                  {...fadeUp(i * 0.04)}
                  className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
                >
                  <item.icon className="h-5 w-5 text-cyan-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* App profiles */}
          <section id="capabilities" className="mt-20">
            <motion.div {...fadeUp()}>
              <p className="text-label text-blue-300">App profiles</p>
              <h2 className="text-headline mt-3">What a connected app looks like.</h2>
              <p className="mt-4 max-w-2xl text-slate-400">
                Each product type gets a different configuration. Built to support any product category from a single coordinated network.
              </p>
            </motion.div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {appProfiles.map((app, i) => (
                <motion.div
                  key={app.name}
                  {...fadeUp(i * 0.06)}
                  className={`rounded-2xl border ${app.border} ${app.bg} bg-white/[0.02] p-6 transition`}
                >
                  <p className={`text-sm font-bold ${app.color}`}>{app.name}</p>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Agents</p>
                    <ul className="space-y-1">
                      {app.agents.map((a) => (
                        <li key={a} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Bot className="h-3 w-3 shrink-0 text-slate-600" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Capabilities</p>
                    <ul className="space-y-1">
                      {app.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* All capabilities */}
          <section className="mt-20">
            <motion.div {...fadeUp()}>
              <p className="text-label text-emerald-300">Full capability set</p>
              <h2 className="text-headline mt-3">What the network can do.</h2>
            </motion.div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.name}
                  {...fadeUp(i * 0.04)}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
                >
                  <cap.icon className="h-5 w-5 text-cyan-400" />
                  <h3 className="mt-4 text-base font-semibold text-white">{cap.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">{cap.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cap.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <motion.div {...fadeUp(0.2)} className="mt-16">
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0a1226] to-[#040916] p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white max-w-xl">
                    Ready to give your products a coordinated AI intelligence layer?
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">Request access and tell us what you are building.</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Link href="/about" className="btn-ghost whitespace-nowrap">About Aiva</Link>
                  <Link href="/contact" className="btn-primary whitespace-nowrap">
                    Request Access <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
