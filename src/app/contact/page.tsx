'use client'

import { useState } from 'react'
import PublicShell from '@/components/public/PublicShell'
import SuperbrainScene from '@/components/public/SuperbrainScene'
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
      <SectionWrap className="pb-8 pt-14 lg:pt-18">
        <SectionInner className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Restricted contact</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">Tell us what systems you need the superbrain to run.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">This is a reviewed access process for operator teams. Share your app environment, workflows, and trust requirements.</p>
            <div className="mt-8 h-[260px] overflow-hidden rounded-3xl border border-white/10 bg-[#030d21]">
              <SuperbrainScene variant="ambient" />
            </div>
          </div>

          <SurfaceCard>
            {ok ? (
              <div className="py-12">
                <h2 className="text-2xl font-black text-white">Inquiry received</h2>
                <p className="mt-3 text-sm text-slate-400">Your restricted access request is now under review.</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <label className="block text-xs text-slate-400">Full name
                  <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block text-xs text-slate-400">Work email
                  <input type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="block text-xs text-slate-400">What are you building?
                  <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50" required value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
                </label>
                <label className="block text-xs text-slate-400">Required capabilities
                  <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Studio, Workbench, agents, memory, approvals" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} />
                </label>
                <label className="block text-xs text-slate-400">Additional context
                  <textarea rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </label>
                {error && <p className="text-xs text-red-300">Unable to submit right now. Please retry.</p>}
                <button disabled={loading} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-100 disabled:opacity-50" type="submit">{loading ? 'Sending…' : 'Send restricted inquiry'}</button>
              </form>
            )}
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
