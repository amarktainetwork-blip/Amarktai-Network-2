'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react'

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
          message: `[REQUEST ACCESS]\nWhat are you building: ${form.building}\nAI capabilities needed: ${form.capabilities}\nAdditional context: ${form.message}`,
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
    <div className="min-h-screen bg-[#030712] text-white">
      <Header />
      <main className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.10),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0),#030712_78%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-200">Request access</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-[-0.065em] text-white sm:text-6xl">
              Tell us what you want the network to understand.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              AmarktAI Network is private and reviewed. Share the products you are building and the AI capabilities you need.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-slate-400">
              {['Product ecosystem and app goals', 'Agents, memory, media, research or repo automation', 'Security, adult policy and approval requirements'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">{item}</div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/25 backdrop-blur-2xl">
            {ok ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">Request received</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">We will review your request and respond directly.</p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-slate-400">
                    Full name
                    <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Email
                    <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40" type="email" placeholder="Your email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </label>
                </div>

                <label className="block text-xs text-slate-400">
                  What are you building?
                  <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40" placeholder="Product, app or portfolio" required value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
                </label>

                <label className="block text-xs text-slate-400">
                  What AI capabilities do you need?
                  <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40" placeholder="Agents, memory, media, research, repo automation…" value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} />
                </label>

                <label className="block text-xs text-slate-400">
                  Additional context
                  <textarea className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40" rows={5} placeholder="What should we know before reviewing access?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </label>

                {error && <p className="text-xs text-red-300">Unable to submit right now. Please retry.</p>}
                <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-100 disabled:opacity-50" type="submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Send Access Request
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
