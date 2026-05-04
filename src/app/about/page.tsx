'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  Eye,
  HeartPulse,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkPulseBackground from '@/components/visual/NetworkPulseBackground'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.48, delay },
})

const missionPillars = [
  {
    icon: BrainCircuit,
    title: 'Self-learning intelligence',
    desc: 'The network learns from apps, users, conversations, outcomes, actions, artifacts, and admin decisions. It builds app-specific memory and operator context over time.',
    accent: 'text-blue-400',
  },
  {
    icon: HeartPulse,
    title: 'Self-healing operations',
    desc: 'Designed to monitor apps, services, jobs, providers, storage, and VPS capacity. Built to detect failures, recommend fixes, and trigger safe recovery workflows.',
    accent: 'text-emerald-400',
  },
  {
    icon: Eye,
    title: 'Operational self-awareness',
    desc: 'Knows connected apps, active agents, missing keys, failed jobs, repo status, provider health, storage load, pending approvals, and what has changed.',
    accent: 'text-cyan-400',
  },
  {
    icon: ShieldCheck,
    title: 'Self-secure controls',
    desc: 'Approval gates, action audits, adult access per app, destructive action confirmation, provider boundaries, role permissions, security diagnostics, and private invite access.',
    accent: 'text-red-400',
  },
]

const operatorAwareness = [
  'Knows connected apps',
  'Knows active agents',
  'Knows missing keys',
  'Knows failed jobs',
  'Knows repo status',
  'Knows provider health',
  'Knows storage and load',
  'Knows what needs approval',
  'Knows what has changed',
]

const autonomyLadder = [
  { step: 'Observe',   desc: 'Monitors the state of every connected app and agent'   },
  { step: 'Understand',desc: 'Builds context from memory, history, and outcomes'       },
  { step: 'Plan',      desc: 'Structures a proposed action or workflow'                },
  { step: 'Propose',   desc: 'Surfaces the plan for operator review'                   },
  { step: 'Approve',   desc: 'Operator confirms before anything executes'              },
  { step: 'Act',       desc: 'Executes the approved action with full audit trail'      },
  { step: 'Learn',     desc: 'Records the outcome and adjusts for next time'           },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <NetworkPulseBackground className="opacity-55" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> AmarktAI Assistant · AI operating ecosystem
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-display mt-4 max-w-5xl"
          >
            Amarkt<span className="text-blue-400">AI</span> Network exists because AI should coordinate — not just respond.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-6 max-w-3xl text-lg text-slate-300"
          >
            Every AI tool answers questions. Amarkt<span className="text-blue-400">AI</span> Network is built for something different: a living ecosystem that learns from apps, heals from failures, secures its own actions, and evolves every product it touches.
          </motion.p>
        </div>
      </section>

      {/* ── Aiva — the operator ───────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp()}>
              <p className="text-label text-cyan-300">AmarktAI Assistant — the operator</p>
              <h2 className="text-headline mt-3">
                Not just a chat interface. The intelligence that turns scattered AI into a coordinated operating system.
              </h2>
              <p className="mt-5 text-slate-400">
                AmarktAI Assistant understands apps, agents, users, memory, actions, tools, approvals, and context. It knows the state of the network. It knows what is connected, broken, pending, or ready. And it coordinates everything from a single private command layer.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {[
                  'Understands every connected app and its intelligence package',
                  'Coordinates agents, tools, memory, and approvals',
                  'Knows system health without being told to check',
                  'Proposes actions — and waits for approval before acting',
                  'Learns from decisions and builds operator context',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-5">Operational self-awareness</p>
                <div className="grid grid-cols-3 gap-2">
                  {operatorAwareness.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-slate-400"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Mission pillars ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()}>
            <p className="text-label text-blue-300">Four pillars</p>
            <h2 className="text-headline mt-3">What makes the network living.</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {missionPillars.map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp(i * 0.07)}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                <p.icon className={`h-6 w-6 ${p.accent}`} />
                <h3 className="mt-4 text-base font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Autonomy ladder ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()}>
            <p className="text-label text-violet-300">Autonomy model</p>
            <h2 className="text-headline mt-3">How the network earns the right to act.</h2>
          </motion.div>

          <div className="mt-10 flex flex-col gap-0">
            {autonomyLadder.map((item, i) => (
              <motion.div
                key={item.step}
                {...fadeUp(i * 0.07)}
                className="relative flex items-start gap-5 py-4"
              >
                {i < autonomyLadder.length - 1 && (
                  <div className="absolute left-[14px] top-9 h-full w-px bg-gradient-to-b from-white/15 to-transparent" />
                )}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-300/10 text-[11px] font-bold text-violet-300">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.step}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product ecosystem ─────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              {...fadeUp()}
              className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#061828] to-[#040d1a] p-7"
            >
              <div className="flex items-center gap-2 mb-4">
                <Network className="h-4 w-4 text-cyan-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">Product ecosystem control</p>
              </div>
              <h2 className="text-lg font-semibold text-white">One network. Every product you build.</h2>
              <p className="mt-2 text-sm text-slate-400">
                Every app in the portfolio can receive its own AI package. Agents, memory, tools, voice, media, research, repo awareness, monitoring, and security rules — all scoped to the product.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-cyan-400 shrink-0" /> App-specific agents and memory</li>
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-cyan-400 shrink-0" /> Adult policy, voice, and media per app</li>
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-cyan-400 shrink-0" /> Repo and deploy awareness</li>
              </ul>
            </motion.div>

            <motion.div
              {...fadeUp(0.1)}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-4 w-4 text-violet-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-400">Private and invite-only</p>
              </div>
              <h2 className="text-lg font-semibold text-white">Built for builders running more than one product.</h2>
              <p className="mt-2 text-sm text-slate-400">
                Amarkt<span className="text-blue-400">AI</span> Network is not an open-signup platform. Access is reviewed for builders with real product ecosystems where coordination, memory, and operational intelligence matter.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-violet-400 shrink-0" /> Private onboarding process</li>
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-violet-400 shrink-0" /> Configured around your product stack</li>
                <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 mt-0.5 text-violet-400 shrink-0" /> Capability and access scoped per use case</li>
              </ul>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp(0.15)}
            className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">Ready to connect your products to a living AI network?</h2>
              <p className="mt-1 text-sm text-slate-400">Request access and describe what you are building.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/apps" className="btn-ghost whitespace-nowrap">
                Explore the ecosystem
              </Link>
              <Link href="/contact" className="btn-primary whitespace-nowrap">
                Request Access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
