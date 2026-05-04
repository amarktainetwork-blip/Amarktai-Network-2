'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, BrainCircuit, Code2, Eye, HeartPulse, LockKeyhole, Network, Search, ShieldCheck, Sparkles, Wand2, Zap } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, delay },
})

const ecosystem = [
  { icon: Bot, title: 'Aiva operator', body: 'A conversational command layer that understands apps, agents, memory, workflows and approvals.' },
  { icon: Network, title: 'Agent network', body: 'Specialist agents for code, research, media, marketing, diagnostics, deployment and app-specific work.' },
  { icon: BrainCircuit, title: 'Memory & emotion', body: 'App-aware and user-aware context designed to learn from outcomes, preferences and decisions.' },
  { icon: Code2, title: 'Repo Workbench', body: 'Pull a repo, choose an agent/model, describe the work, review the diff, create the PR.' },
  { icon: Search, title: 'Research engine', body: 'Discover tools, providers, competitors and app opportunities, then turn findings into plans.' },
  { icon: Wand2, title: 'Creative studio', body: 'Images, video, voice, music, avatars and combined media workflows from one controlled place.' },
]

const loops = [
  { icon: BrainCircuit, title: 'Learn', body: 'Builds context from apps, users, outputs and admin decisions.' },
  { icon: HeartPulse, title: 'Heal', body: 'Detects failures, diagnoses issues and prepares safe recovery steps.' },
  { icon: Eye, title: 'Know', body: 'Tracks connected apps, agents, jobs, providers, storage, repos and blockers.' },
  { icon: ShieldCheck, title: 'Secure', body: 'Keeps adult access, deploys, spend and destructive actions approval-gated.' },
]

const flow = ['Discover', 'Research', 'Plan', 'Create', 'Approve', 'Deploy', 'Monitor', 'Learn']

function NetworkVisual() {
  const nodes = [
    ['Apps', 'left-[10%] top-[20%]'],
    ['Agents', 'right-[10%] top-[18%]'],
    ['Memory', 'left-[6%] bottom-[22%]'],
    ['Code', 'right-[8%] bottom-[24%]'],
    ['Media', 'left-[38%] top-[5%]'],
    ['Security', 'left-[39%] bottom-[5%]'],
  ]
  return (
    <div className="relative mx-auto h-[440px] max-w-[560px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#050b18]/80 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_25%_20%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.12),transparent_30%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 560 440" fill="none">
        <motion.path d="M280 220 C160 110 115 95 80 90" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse' }} />
        <motion.path d="M280 220 C400 105 455 85 500 90" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }} />
        <motion.path d="M280 220 C150 310 108 340 78 350" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4, repeat: Infinity, repeatType: 'reverse', delay: 0.4 }} />
        <motion.path d="M280 220 C390 310 448 338 500 348" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.1, repeat: Infinity, repeatType: 'reverse', delay: 0.6 }} />
        <motion.path d="M280 220 C272 120 280 65 282 42" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.0, repeat: Infinity, repeatType: 'reverse', delay: 0.8 }} />
        <motion.path d="M280 220 C285 320 283 382 282 408" stroke="url(#a)" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.3, repeat: Infinity, repeatType: 'reverse', delay: 1 }} />
        <defs><linearGradient id="a" x1="0" y1="0" x2="560" y2="440"><stop stopColor="#22d3ee" stopOpacity="0"/><stop offset="0.5" stopColor="#67e8f9"/><stop offset="1" stopColor="#60a5fa" stopOpacity="0"/></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 4, repeat: Infinity }} className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/80 px-8 py-7 text-center shadow-2xl shadow-cyan-950/40">
          <Sparkles className="mx-auto h-8 w-8 text-cyan-200" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">Aiva</p>
          <p className="mt-2 text-xl font-black text-white">Network Operator</p>
          <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">Coordinates agents, memory, tools, media, code and approvals.</p>
        </motion.div>
      </div>
      {nodes.map(([label, pos], index) => (
        <motion.div key={label} initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + index * 0.1 }} className={`absolute ${pos} rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-xl`}>
          {label}
        </motion.div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <Header />
      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(34,211,238,0.15),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0),#030712_88%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                AI operating ecosystem
              </div>
              <h1 className="max-w-5xl text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
                One intelligent network for every product you build.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                Aiva coordinates agents, memory, research, media, code, infrastructure and approval-gated actions inside one private command network.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/20 hover:bg-cyan-100">
                  Request Access <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#ecosystem" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">
                  Explore the network
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
              <NetworkVisual />
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeUp()} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Not a chatbot</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">A command network that knows what it is running.</h2>
              </div>
              <p className="text-base leading-8 text-slate-400">Chatbots answer. AmarktAI Network coordinates. It is structured to understand apps, agents, tools, user memory, repo state, provider health, infrastructure load and the approvals needed before powerful actions run.</p>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
            {loops.map((item, index) => (
              <motion.div key={item.title} {...fadeUp(index * 0.06)} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/10 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]">
                <item.icon className="h-7 w-7 text-cyan-200" />
                <h3 className="mt-6 text-xl font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="ecosystem" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">The ecosystem</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Apps, agents, memory, media and code — connected.</h2>
            </motion.div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ecosystem.map((item, index) => (
                <motion.div key={item.title} {...fadeUp(index * 0.05)} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.055]">
                  <item.icon className="h-7 w-7 text-cyan-200" />
                  <h3 className="mt-5 text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-white/10 bg-gradient-to-br from-[#071a28] via-[#07111f] to-[#12091f] p-8 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <motion.div {...fadeUp()}>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">From idea to operating product</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Research. Plan. Create. Approve. Deploy. Learn.</h2>
                <p className="mt-5 text-slate-400">A researcher agent can discover opportunities. A repo agent can prepare the code. Creative agents can produce assets. Aiva keeps the network aware, gated and improving.</p>
              </motion.div>
              <div className="grid gap-3 sm:grid-cols-4">
                {flow.map((step, index) => (
                  <motion.div key={step} {...fadeUp(index * 0.04)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-2 text-sm font-bold text-white">{step}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-10 text-center shadow-2xl shadow-cyan-950/20">
            <Zap className="mx-auto h-10 w-10 text-cyan-200" />
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">For builders who need more than another AI tab.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-slate-400">Request access to a private command layer designed for people building product ecosystems, not single prompts.</p>
            <div className="mt-8">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-100">Request Access <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
