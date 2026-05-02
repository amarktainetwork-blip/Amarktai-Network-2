'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Command,
  Compass,
  Fingerprint,
  GitBranch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Orbit,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkPulseBackground from '@/components/visual/NetworkPulseBackground'

const platformPillars = [
  {
    icon: Bot,
    title: 'Aiva at the centre',
    body: 'Aiva is the operator interface: real-time conversation, routed intelligence, memory-aware context and permission-gated action control.',
  },
  {
    icon: Boxes,
    title: 'Every app gets its own AI brain',
    body: 'Marketing, travel, learning, equine, religious, companion and future apps can each use their own capabilities, budgets and model package.',
  },
  {
    icon: GitBranch,
    title: 'Prompt-to-PR workspace',
    body: 'Connect a repo, describe the work, review the diff and create a PR. The goal is simple: command in, reviewed code out.',
  },
  {
    icon: ShieldCheck,
    title: 'Control without chaos',
    body: 'Deploys, PRs, spend, marketing sends and destructive actions are approval-gated and audited instead of hidden behind blind automation.',
  },
]

const commandFlow = [
  'Connect an app, website or repo',
  'Aiva builds context and capability needs',
  'The system routes to the right AI tools',
  'Outputs, actions and artifacts are tracked',
]

const useCases = [
  'AI companion and character apps',
  'Horse and equine management systems',
  'Marketing engines that promote your portfolio',
  'Religious, education and course platforms',
  'Travel planning and destination apps',
  'Internal coding and deployment workspaces',
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay },
})

function AivaOrb() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_58%)]"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-8 rounded-full border border-violet-300/20"
      />
      <div className="absolute inset-16 rounded-full border border-white/10 bg-slate-950/80 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl backdrop-blur-xl">
          <Sparkles className="mx-auto h-9 w-9 text-cyan-200" />
          <p className="mt-4 text-sm uppercase tracking-[0.28em] text-cyan-200">Aiva</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Your AI operator</h3>
          <p className="mt-3 max-w-xs text-sm text-slate-400">Conversation, app control, artifacts, code and action approvals in one living system.</p>
        </div>
      </div>
      {[
        { label: 'Apps', x: '3%', y: '26%', icon: Boxes },
        { label: 'Repos', x: '70%', y: '18%', icon: GitBranch },
        { label: 'Actions', x: '70%', y: '70%', icon: Command },
        { label: 'Memory', x: '8%', y: '68%', icon: BrainCircuit },
      ].map((node, index) => (
        <motion.div
          key={node.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * 0.12 }}
          className="absolute rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur-xl"
          style={{ left: node.x, top: node.y }}
        >
          <node.icon className="mr-1.5 inline h-3.5 w-3.5 text-cyan-300" />{node.label}
        </motion.div>
      ))}
    </div>
  )
}

function CommandPreview() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#06101f]/90 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="text-xs text-slate-400">Amarktai Command Center</span></div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-200">Live routing</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Aiva', 'Streaming conversation', 'Ready'],
            ['Apps', 'AI packages saved', 'Configured'],
            ['Repo', 'Prompt-to-PR flow', 'Review gated'],
          ].map(([title, detail, status]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-xs text-slate-500">{detail}</p>
              <p className="mt-4 text-[11px] text-cyan-200">{status}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
          <p className="text-xs text-slate-400">Aiva command</p>
          <p className="mt-2 text-sm text-white">“Audit the marketing app, update the landing page copy, create a PR, and wait for my approval.”</p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030711] text-white">
      <Header />

      <section className="relative isolate overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <NetworkPulseBackground className="opacity-70" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.16),transparent_30%),linear-gradient(180deg,rgba(3,7,17,0),#030711_88%)]" />
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-100">
              <Orbit className="h-3.5 w-3.5" /> Amarktai Network · AI operating system
            </div>
            <h1 className="max-w-5xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              One intelligent command layer for every app you build.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Amarktai Network is the control system for your AI business: Aiva understands the work, connects your apps, routes the intelligence, manages artifacts, and keeps every important action visible, approved and auditable.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/admin/login" className="group inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-950/30 transition hover:bg-white">
                Enter workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/[0.08]">
                Request access
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {['Aiva-led operations', 'App AI packages', 'Prompt-to-PR control'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
                  <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-300" /> {item}
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.12 }}>
            <AivaOrb />
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-cyan-200">What Amarktai actually is</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Not a provider dashboard. Not a chatbot wrapper.</h2>
            <p className="mt-5 text-slate-400">Amarktai Network is the system that sits above your apps. It gives each product the intelligence it needs, gives Aiva context and control, and gives you one place to see what is working, what failed, what was generated and what still needs approval.</p>
          </motion.div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {platformPillars.map((pillar, index) => (
              <motion.div key={pillar.title} {...fadeUp(index * 0.06)} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl shadow-black/10 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]">
                <pillar.icon className="h-7 w-7 text-cyan-200" />
                <h3 className="mt-5 text-lg font-bold text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{pillar.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div {...fadeUp()}>
            <CommandPreview />
          </motion.div>
          <motion.div {...fadeUp(0.12)}>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-violet-200">The operating flow</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Aiva turns scattered tools into one controlled workflow.</h2>
            <p className="mt-5 text-slate-400">Your apps do not need the same AI setup. One might need chat only. One might need voice, image, video, memory, web crawling and repo control. Amarktai lets each app receive exactly what it needs.</p>
            <div className="mt-8 space-y-3">
              {commandFlow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300 text-xs font-black text-slate-950">{index + 1}</span>
                  <span className="text-sm font-medium text-slate-200">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/[0.08] via-white/[0.03] to-violet-400/[0.08] p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-200">Built for your app portfolio</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">One network. Many products. One operator.</h2>
              <p className="mt-5 text-slate-400">The goal is not to show off provider logos. The goal is to make Amarktai the intelligence layer behind your apps and make Aiva the one place you operate them from.</p>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map((useCase, index) => (
                <motion.div key={useCase} {...fadeUp(index * 0.04)} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <Fingerprint className="mb-3 h-4 w-4 text-emerald-300" /> {useCase}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: RadioTower, title: 'Real-time Aiva', body: 'Streaming conversations, smart routing and clear route visibility for operator confidence.' },
              { icon: LockKeyhole, title: 'Permission-gated control', body: 'Aiva can request powerful actions, but PRs, deploys and destructive work require confirmation.' },
              { icon: Compass, title: 'Go-live visibility', body: 'Readiness checks, provider scores and artifacts reveal what is connected and what still needs work.' },
            ].map((item, index) => (
              <motion.div key={item.title} {...fadeUp(index * 0.08)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <item.icon className="h-7 w-7 text-cyan-200" />
                <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div {...fadeUp()} className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-10 text-center shadow-2xl shadow-cyan-950/20">
          <PlayCircle className="mx-auto h-10 w-10 text-cyan-200" />
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">Amarktai Network is becoming the control room for everything you build.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-slate-400">Aiva, app AI packages, smart routing, artifacts, provider intelligence and repo workbench are now part of one direction: build, manage and improve your entire app portfolio from one intelligent operating layer.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-100">Enter workspace <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">Request access <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
