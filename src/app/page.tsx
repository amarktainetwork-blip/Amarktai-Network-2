'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  ChevronRight,
  Code2,
  Command,
  Cpu,
  Database,
  Eye,
  FileCode2,
  Globe,
  HeartPulse,
  ImageIcon,
  Lock,
  Mic,
  Music2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NetworkPulseBackground from '@/components/visual/NetworkPulseBackground'
import AivaNetworkGraph from '@/components/visual/AivaNetworkGraph'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay },
})

const livingLoops = [
  {
    icon: BrainCircuit,
    label: 'Learn',
    color: 'text-blue-300',
    border: 'border-blue-500/20',
    glow: 'hover:border-blue-400/40',
    body: 'Builds memory from apps, users, outcomes, and admin decisions. The network grows smarter with every interaction.',
  },
  {
    icon: HeartPulse,
    label: 'Heal',
    color: 'text-emerald-300',
    border: 'border-emerald-500/20',
    glow: 'hover:border-emerald-400/40',
    body: 'Designed to detect failures, diagnose issues, and recommend or prepare safe recovery workflows.',
  },
  {
    icon: ShieldCheck,
    label: 'Secure',
    color: 'text-red-300',
    border: 'border-red-500/20',
    glow: 'hover:border-red-400/40',
    body: 'Keys, adult access, destructive actions, and deployments are approval-gated. Every action is auditable.',
  },
  {
    icon: Zap,
    label: 'Act',
    color: 'text-violet-300',
    border: 'border-violet-500/20',
    glow: 'hover:border-violet-400/40',
    body: 'Plans work, prepares actions, creates PRs, generates assets, and waits for approval before acting.',
  },
]

const appExamples = [
  {
    name: 'Crypto / Finance',
    agents: ['Crypto Agent', 'Risk Agent', 'Market Research Agent', 'Diagnostics Agent'],
    color: 'text-yellow-300',
    accent: 'border-yellow-500/20',
  },
  {
    name: 'Marketing',
    agents: ['Campaign Agent', 'Research Agent', 'Copy Agent', 'Analytics Agent'],
    color: 'text-blue-300',
    accent: 'border-blue-500/20',
  },
  {
    name: 'Companion / Social AI',
    agents: ['Character Agent', 'Memory/Emotion Agent', 'Media Agent', 'Adult Policy Agent'],
    color: 'text-pink-300',
    accent: 'border-pink-500/20',
  },
  {
    name: 'SaaS / Admin App',
    agents: ['Support Agent', 'Onboarding Agent', 'Automation Agent', 'Diagnostics Agent'],
    color: 'text-emerald-300',
    accent: 'border-emerald-500/20',
  },
]

const agents = [
  { icon: Command,    label: 'Aiva Operator',    desc: 'Coordinates the network'         },
  { icon: FileCode2,  label: 'Repo Builder',      desc: 'Command to code to PR'           },
  { icon: Search,     label: 'Researcher',        desc: 'Markets, tools, opportunities'   },
  { icon: Globe,      label: 'App Discovery',     desc: 'Finds new product opportunities' },
  { icon: Zap,        label: 'Marketing',         desc: 'Campaign and copy generation'    },
  { icon: Eye,        label: 'Scraper',           desc: 'Live data and context gathering' },
  { icon: Database,   label: 'Memory / Emotion',  desc: 'Per-app memory and context'      },
  { icon: ImageIcon,  label: 'Media',             desc: 'Image, video, music, avatars'    },
  { icon: Mic,        label: 'Voice',             desc: 'TTS, STT, persona audio'         },
  { icon: HeartPulse, label: 'Diagnostics',       desc: 'Health, jobs, services'          },
  { icon: Cpu,        label: 'Deployment',        desc: 'Infrastructure awareness'        },
  { icon: Bot,        label: 'App-specific',      desc: 'Crypto, Companion, Campaign…'    },
]

const discoveryFlow = [
  'Discover', 'Research', 'Plan', 'Assign Agents',
  'Generate', 'Review', 'PR', 'Deploy', 'Monitor', 'Learn',
]

const creativeItems = [
  { icon: ImageIcon, label: 'Images'             },
  { icon: Video,     label: 'Video'              },
  { icon: Music2,    label: 'Music'              },
  { icon: Mic,       label: 'Voice'              },
  { icon: Bot,       label: 'Avatars'            },
  { icon: Sparkles,  label: 'Music Video Builder'},
]

const approvalGates = [
  'Adult app access',
  'Deploy approval',
  'Merge approval',
  'Spend approval',
  'Destructive action confirmation',
  'Audit logs',
]

const infraCards = [
  { icon: Network,     label: 'Apps',       desc: 'Connected and monitored'  },
  { icon: Bot,         label: 'Agents',     desc: 'Active roles and states'   },
  { icon: Globe,       label: 'Providers',  desc: 'Health and key status'     },
  { icon: Cpu,         label: 'Jobs',       desc: 'Queues and failed runs'    },
  { icon: ShieldCheck, label: 'Security',   desc: 'Keys, gates, permissions'  },
  { icon: Database,    label: 'VPS / Load', desc: 'Capacity and storage'      },
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030711] text-white">
      <Header />

      {/* ── 1. Hero ──────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-40">
        <NetworkPulseBackground className="opacity-60" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.10),transparent_32%),linear-gradient(180deg,rgba(3,7,17,0),#030711_90%)]" />

        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Amarktai Network · AI operating ecosystem
            </div>

            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              A living AI command layer for apps, agents, memory, media, and code.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Aiva coordinates specialist agents, tools, memory, research, media, code, infrastructure, and approval-gated actions in one private command network.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-950/30 transition hover:opacity-90"
              >
                Request Access <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/apps"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/[0.08]"
              >
                Explore the ecosystem <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.14 }}
          >
            <AivaNetworkGraph />
          </motion.div>
        </div>
      </section>

      {/* ── 2. Not a chatbot — a command network ─────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-cyan-200">Not a chatbot. A command network.</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Chatbots answer. Amarktai Network coordinates.
            </h2>
            <p className="mt-5 text-slate-400">
              This is not ChatGPT. This is not Claude. This is not a model picker. Aiva understands apps, agents, memory, tools, approvals, and system state — and turns scattered AI into a coordinated operating system.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Bot,
                title: 'Aiva does not just respond.',
                body: 'Aiva coordinates. It understands what every connected app needs, which agents are active, what has changed, and what is waiting for approval.',
                color: 'text-cyan-300',
              },
              {
                icon: Network,
                title: 'Every app gets its own intelligence.',
                body: 'Each product can receive dedicated agents, memory, tools, adult policy, voice, media, research, repo and deploy awareness, and monitoring.',
                color: 'text-violet-300',
              },
              {
                icon: Lock,
                title: 'Autonomy with approval.',
                body: 'Powerful actions — merges, deploys, spend, destructive operations — are gated. Every action is audited. Nothing is hidden behind blind automation.',
                color: 'text-emerald-300',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp(i * 0.07)}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.03]"
              >
                <item.icon className={`h-7 w-7 ${item.color}`} />
                <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. The living network (Learn / Heal / Secure / Act) ─ */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-violet-200">The living network</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              A network that knows what it is running.
            </h2>
            <p className="mt-5 text-slate-400">
              Four continuous loops keep the ecosystem healthy, growing, safe, and moving forward.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {livingLoops.map((loop, i) => (
              <motion.div
                key={loop.label}
                {...fadeUp(i * 0.08)}
                className={`rounded-3xl border ${loop.border} ${loop.glow} bg-white/[0.03] p-7 shadow-xl transition`}
              >
                <div className="flex items-center gap-3">
                  <loop.icon className={`h-7 w-7 ${loop.color}`} />
                  <span className={`text-sm font-bold uppercase tracking-wider ${loop.color}`}>{loop.label}</span>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-400">{loop.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. App intelligence packages ─────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-emerald-200">App intelligence packages</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Every app can have its own agents, memory, permissions, and tools.
              </h2>
              <p className="mt-5 text-slate-400">
                Built to give each connected product a dedicated AI package — the right agents, rules, budget, voice, memory, and tools for that product&apos;s job. Designed to support per-app intelligence at scale.
              </p>
              <ul className="mt-7 space-y-2 text-sm text-slate-300">
                {[
                  'Agents scoped to the app',
                  'Per-app memory and context',
                  'Adult policy if needed',
                  'Voice, media, and research',
                  'Repo and deploy awareness',
                  'Monitoring and diagnostics',
                  'Budget and security rules',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2">
              {appExamples.map((app, i) => (
                <motion.div
                  key={app.name}
                  {...fadeUp(i * 0.07)}
                  className={`rounded-2xl border ${app.accent} bg-white/[0.03] p-5 transition hover:bg-white/[0.05]`}
                >
                  <p className={`text-sm font-bold ${app.color}`}>{app.name}</p>
                  <ul className="mt-3 space-y-1">
                    {app.agents.map((a) => (
                      <li key={a} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-1 w-1 rounded-full bg-slate-500 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Agent network ─────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-blue-200">Agent network</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Agents are not plugins.
            </h2>
            <p className="mt-5 text-slate-400">
              They are assigned roles, tools, permissions, memory, and approval rules. Each agent knows what it can and cannot do.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.label}
                {...fadeUp(i * 0.04)}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-blue-400/25 hover:bg-blue-400/[0.03]"
              >
                <agent.icon className="h-5 w-5 text-blue-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{agent.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{agent.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. From idea to app (Researcher / App Discovery) ─── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-300/[0.06] via-white/[0.02] to-violet-400/[0.06] p-10">
          <motion.div {...fadeUp()} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-cyan-200">From idea to app</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Research an idea. Generate a plan. Open the PR. Monitor the rollout.
            </h2>
            <p className="mt-5 text-slate-400">
              The Researcher and App Discovery agents watch markets, discover opportunities, alert the operator, draft improved product plans, and send approved plans to agents and the workbench.
            </p>
          </motion.div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {discoveryFlow.map((step, i) => (
              <motion.div
                key={step}
                {...fadeUp(i * 0.04)}
                className="flex items-center gap-2"
              >
                <span className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200">
                  {step}
                </span>
                {i < discoveryFlow.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Creative studio ───────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-pink-200">Creative studio</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Create assets across multiple AI capabilities, combine them, and reuse them inside your apps.
              </h2>
              <p className="mt-5 text-slate-400">
                Text, image, voice, video, music, talking avatars, and music video builder — structured for coordinated creative production, not disconnected one-off tools.
              </p>
            </motion.div>
            <div className="grid grid-cols-3 gap-3">
              {creativeItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  {...fadeUp(i * 0.06)}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center transition hover:border-pink-400/25 hover:bg-pink-400/[0.03]"
                >
                  <item.icon className="h-6 w-6 text-pink-300" />
                  <span className="text-xs font-medium text-slate-300">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Repo Workbench ────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-orange-200">Repo Workbench</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Tell Aiva what to change. Review the plan. Approve the PR.
              </h2>
              <p className="mt-5 text-slate-400">
                Import a repo, describe the task, review the diff, run checks, and merge with approval. Command to code to production — with a full audit trail.
              </p>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <div className="rounded-3xl border border-white/10 bg-[#06101f]/90 p-4 shadow-2xl shadow-cyan-950/20">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3">
                  {[
                    { label: 'Connect repo',  icon: Code2,        status: 'Connected', color: 'text-emerald-300' },
                    { label: 'Describe task', icon: Command,      status: 'Planned',   color: 'text-cyan-300'   },
                    { label: 'Review diff',   icon: FileCode2,    status: 'Reviewed',  color: 'text-violet-300' },
                    { label: 'Approve PR',    icon: ShieldCheck,  status: 'Gated',     color: 'text-amber-300'  },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <step.icon className={`h-4 w-4 ${step.color}`} />
                        <span className="text-sm text-slate-200">{step.label}</span>
                      </div>
                      <span className={`text-xs font-medium ${step.color}`}>{step.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 9. Infrastructure awareness ──────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">Infrastructure awareness</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              A network that knows the state of what it is running.
            </h2>
            <p className="mt-5 text-slate-400">
              Understands what is connected, broken, pending, or ready. Aiva is structured for operational self-awareness across the full network.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {infraCards.map((card, i) => (
              <motion.div
                key={card.label}
                {...fadeUp(i * 0.06)}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-slate-400/20 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                  <card.icon className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{card.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Approval-gated autonomy ──────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/[0.06] via-white/[0.02] to-slate-900/20 p-10">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <motion.div {...fadeUp()}>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-violet-200">Approval-gated autonomy</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Autonomy with approval. Memory with boundaries. Power with audit trails.
                </h2>
                <p className="mt-5 text-slate-400">
                  Aiva and agents can plan, prepare, and propose. Powerful actions do not execute without confirmation. Every decision leaves a trace.
                </p>
              </motion.div>
              <div className="grid gap-3 sm:grid-cols-2">
                {approvalGates.map((gate, i) => (
                  <motion.div
                    key={gate}
                    {...fadeUp(i * 0.05)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
                  >
                    <Lock className="h-4 w-4 text-violet-400 shrink-0" />
                    {gate}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. Final CTA ────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          {...fadeUp()}
          className="mx-auto max-w-4xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-12 text-center shadow-2xl shadow-cyan-950/20"
        >
          <Sparkles className="mx-auto h-10 w-10 text-cyan-200" />
          <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl">
            For builders creating more than one AI-powered product.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-400">
            Private invite-only access. Tell us what you are building, which apps you want to connect, and what AI capabilities you need.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-cyan-950/30 transition hover:opacity-90"
            >
              Request Access <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
