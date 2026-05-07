'use client'

import { useState } from 'react'
import PublicShell from '@/components/public/PublicShell'
import CommandConstellationScene from '@/components/public/CommandConstellationScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', building: '', capabilities: '', message: '' })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyOrProject: form.building,
          message: `[RESTRICTED INQUIRY]\nWhat are you building: ${form.building}\nCapabilities needed: ${form.capabilities}\nAdditional context: ${form.message}`,
        }),
      })
      if (!res.ok) throw new Error('request failed')
      setOk(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden pb-12 pt-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <CommandConstellationScene variant="ambient" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020612]/50 via-transparent to-[#020612]/80" />
        <SectionInner className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Restricted contact</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl">
            Submit a restricted access inquiry.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            AmarktAI Network access is reviewed and provisioned for verified operator teams. Share your environment, workflows, and operational requirements.
          </p>
        </SectionInner>
      </section>

      {/* FORM */}
      <SectionWrap>
        <SectionInner className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Access model</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This is a reviewed access process. We evaluate the operational environment, required capabilities, and trust requirements before provisioning access. There is no self-serve signup.
            </p>
            <div className="mt-8 grid gap-3">
              {['Operational AI environment', 'Verified operator team', 'Real production workloads', 'Reviewed access provisioning'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <SurfaceCard>
            {ok ? (
              <div className="py-12">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Inquiry received</p>
                <h2 className="mt-4 text-2xl font-black text-white">Your restricted access request is under review.</h2>
                <p className="mt-3 text-sm text-slate-400">We will respond through the provided contact if the inquiry meets access criteria.</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Restricted inquiry</p>
                <label className="block text-xs text-slate-400">
                  Full name
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Work email
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  What are you building?
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    required
                    value={form.building}
                    onChange={(e) => setForm({ ...form, building: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Required capabilities
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    placeholder="Studio, Workbench, agents, memory, approvals"
                    value={form.capabilities}
                    onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Operational context
                  <textarea
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </label>
                {error && <p className="text-xs text-red-300">Unable to submit right now. Please retry.</p>}
                <button
                  disabled={loading}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100 disabled:opacity-50"
                  type="submit"
                >
                  {loading ? 'Sending…' : 'Send restricted inquiry'}
                </button>
              </form>
            )}
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
