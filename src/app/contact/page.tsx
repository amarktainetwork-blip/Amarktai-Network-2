'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Bot,
  Code2,
  Network,
} from 'lucide-react'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    building: '',
    apps: '',
    capabilities: '',
    message: '',
  })

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
          message: `[REQUEST ACCESS]\nWhat are you building: ${form.building}\nApps to connect: ${form.apps}\nAI capabilities needed: ${form.capabilities}\nAdditional context: ${form.message}`,
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
      <main className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.1fr]">
          <section>
            <p className="text-label text-cyan-300">Private access</p>
            <h1 className="text-headline mt-4">Request access to Amarkt<span className="text-blue-400">AI</span> Network.</h1>
            <p className="mt-5 max-w-xl text-slate-300">
              For builders creating more than one AI-powered product. Access is reviewed — not open signup.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: ShieldCheck, text: 'Private onboarding — not an open-signup platform.'              },
                { icon: Sparkles,    text: 'Configured around your apps, agents, and capability needs.'     },
                { icon: Bot,         text: 'Access scoped per approved product and use case.'                },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <item.icon className="h-4 w-4 text-cyan-300 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">What we will discuss</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-start gap-2"><Network className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" /> Which apps you want to connect to the network</li>
                <li className="flex items-start gap-2"><Bot className="h-4 w-4 text-blue-300 shrink-0 mt-0.5" /> Which agents, memory, or tools each product needs</li>
                <li className="flex items-start gap-2"><Code2 className="h-4 w-4 text-violet-300 shrink-0 mt-0.5" /> Whether you need agents, media, research, repo automation, or app memory</li>
                <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" /> Security, adult policy, and approval gate requirements</li>
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Best fit</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-300" /> Builders running multiple AI-powered products.</li>
                <li className="flex items-center gap-2"><Bot className="h-4 w-4 text-blue-300" /> Teams who need agents, memory, and operational coordination — not just chat.</li>
              </ul>
            </div>
          </section>

          <section className="card-premium p-7">
            {ok ? (
              <div className="py-14 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
                <h2 className="mt-4 text-xl font-semibold">Request received</h2>
                <p className="mt-2 text-sm text-slate-400">We will review your request and respond directly.</p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-slate-400">
                    Full name
                    <input
                      aria-label="Full name"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                      placeholder="Full name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Email
                    <input
                      aria-label="Email"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                      type="email"
                      placeholder="Your email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                </div>

                <label className="block text-xs text-slate-400">
                  What are you building?
                  <input
                    aria-label="What are you building"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    placeholder="Describe your product or portfolio"
                    required
                    value={form.building}
                    onChange={(e) => setForm({ ...form, building: e.target.value })}
                  />
                </label>

                <label className="block text-xs text-slate-400">
                  What apps do you want to connect?
                  <input
                    aria-label="Apps to connect"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    placeholder="e.g. crypto app, companion app, marketing tool"
                    value={form.apps}
                    onChange={(e) => setForm({ ...form, apps: e.target.value })}
                  />
                </label>

                <label className="block text-xs text-slate-400">
                  What AI capabilities do you need?
                  <input
                    aria-label="AI capabilities needed"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    placeholder="e.g. agents, memory, media, research, repo automation"
                    value={form.capabilities}
                    onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                  />
                </label>

                <label className="block text-xs text-slate-400">
                  Anything else?
                  <textarea
                    aria-label="Additional context"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    rows={4}
                    placeholder="Any other context, requirements, or questions"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </label>

                {error && <p className="text-xs text-red-300">Unable to submit right now. Please retry.</p>}
                <button disabled={loading} className="btn-primary w-full justify-center" type="submit">
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
