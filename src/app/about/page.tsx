'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, Eye, HeartPulse, ShieldCheck } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, delay },
})

const pillars = [
  { icon: BrainCircuit, title: 'Learns', body: 'Builds context from products, users, outcomes and operator decisions.' },
  { icon: HeartPulse, title: 'Heals', body: 'Detects failures, prepares recovery steps and keeps the network moving.' },
  { icon: Eye, title: 'Knows', body: 'Understands connected apps, agents, jobs, providers, storage and blockers.' },
  { icon: ShieldCheck, title: 'Secures', body: 'Keeps access, adult policy, deploys and destructive actions approval-gated.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.10),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0),#030712_84%)]" />
          <div className="relative mx-auto max-w-6xl">
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-xs font-black uppercase tracking-[0.26em] text-cyan-200">
              About AmarktAI Network
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="mt-5 max-w-5xl text-5xl font-black tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
              Built for operators who need AI to coordinate, not just answer.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16 }} className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              AmarktAI Network is a private operating ecosystem for products, agents, memory, media, research, code and approvals. AmarktAI Assistant is the operator layer that turns those parts into one controlled command system.
            </motion.p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">The mission</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">Make every app in the ecosystem intelligent, aware and controlled.</h2>
            </motion.div>
            <motion.div {...fadeUp(0.08)} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7">
              <p className="text-base leading-8 text-slate-300">
                The future is not one assistant sitting beside one app. It is a network where each product has the right agents, memory, tools, policies and operational awareness — while the admin keeps control of every powerful action.
              </p>
              <p className="mt-5 text-base leading-8 text-slate-400">
                That is the role of AmarktAI Network: connect the products, understand their state, propose the next move, and keep the operator in command.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
            {pillars.map((pillar, index) => (
              <motion.div key={pillar.title} {...fadeUp(index * 0.06)} className="rounded-[1.65rem] border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]">
                <pillar.icon className="h-7 w-7 text-cyan-200" />
                <h3 className="mt-6 text-xl font-black text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{pillar.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071a28] via-[#07111f] to-[#12091f] p-10 text-center">
            <h2 className="text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">Private by design. Built for serious product ecosystems.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-slate-400">Request access and tell us what you are building, which apps you want connected, and what intelligence they need.</p>
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
