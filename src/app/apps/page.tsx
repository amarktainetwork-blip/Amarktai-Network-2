'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, BrainCircuit, Code2, HeartPulse, Mic, Network, Search, ShieldCheck, Sparkles } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, delay },
})

const stack = [
  { icon: Bot, label: 'Agents', body: 'Specialist roles for each product.' },
  { icon: BrainCircuit, label: 'Memory', body: 'Context that belongs to the app.' },
  { icon: Search, label: 'Research', body: 'Market, competitor and source intelligence.' },
  { icon: Code2, label: 'Repo', body: 'Plan, patch, PR and deploy awareness.' },
  { icon: Mic, label: 'Voice & media', body: 'Creative capability when the app needs it.' },
  { icon: ShieldCheck, label: 'Policy', body: 'Adult access, safety, budget and approvals.' },
]

const examples = [
  { name: 'Finance systems', detail: 'Risk, reporting, market research and diagnostics agents.' },
  { name: 'Marketing systems', detail: 'Campaign, copy, lead research and analytics agents.' },
  { name: 'Companion apps', detail: 'Memory, personality, media and app-level adult policy.' },
  { name: 'SaaS products', detail: 'Support, onboarding, automation and operations agents.' },
]

export default function AppsPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(34,211,238,0.11),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0),#030712_84%)]" />
          <div className="relative mx-auto max-w-6xl">
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-xs font-black uppercase tracking-[0.26em] text-cyan-200">
              Ecosystem
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="mt-5 max-w-5xl text-5xl font-black tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
              Every product gets the intelligence it actually needs.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16 }} className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              AmarktAI Network is designed so each app can have its own agents, memory, tools, policies and operating context — all coordinated by AmarktAI Assistant.
            </motion.p>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map((item, index) => (
              <motion.div key={item.label} {...fadeUp(index * 0.05)} className="rounded-[1.65rem] border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]">
                <item.icon className="h-7 w-7 text-cyan-200" />
                <h2 className="mt-6 text-xl font-black text-white">{item.label}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="capabilities" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <motion.div {...fadeUp()}>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">App profiles</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">One system. Different intelligence for different products.</h2>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2">
              {examples.map((item, index) => (
                <motion.div key={item.name} {...fadeUp(index * 0.06)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-sm font-black text-white">{item.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...fadeUp()} className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071a28] via-[#07111f] to-[#12091f] p-10 text-center">
            <Network className="mx-auto h-10 w-10 text-cyan-200" />
            <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">Add an app. Give it the right agents. Keep the operator in control.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-slate-400">Request access and tell us what products you want the network to understand.</p>
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
