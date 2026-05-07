'use client'

import { useState } from 'react'
import PublicShell from '@/components/public/PublicShell'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    operation: '',
    scope: '',
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
          companyOrProject: form.operation,
          message: `[OPERATIONAL INQUIRY]\nOperating environment: ${form.operation}\nCurrent scope: ${form.scope}\nNotes: ${form.message}`,
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
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#95a0bc]">Contact</p>
        <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1fb] sm:text-5xl">
          Operational inquiry channel for private AI infrastructure discussions.
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="border border-[#2a3142] bg-[#0b0f19] p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-[#9ca8c3]">Inquiry profile</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#c2cce0]">
              <li>• Private infrastructure scope</li>
              <li>• Model and agent routing context</li>
              <li>• Deployment governance requirements</li>
              <li>• Operational timeline and constraints</li>
            </ul>
          </aside>

          <div className="border border-[#2a3142] bg-[#0b0f19] p-6">
            {ok ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#9ca8c3]">Inquiry received</p>
                <p className="mt-4 text-sm leading-7 text-[#cad2e6]">Your operational inquiry has been recorded. Follow-up will be sent to the provided contact.</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
                  Name
                  <input
                    className="mt-2 w-full border border-[#2d3448] bg-[#0a0d16] px-3 py-3 text-sm text-[#e6ebf8] outline-none focus:border-[#6e7dc4]"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
                  Email
                  <input
                    type="email"
                    className="mt-2 w-full border border-[#2d3448] bg-[#0a0d16] px-3 py-3 text-sm text-[#e6ebf8] outline-none focus:border-[#6e7dc4]"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
                  Operating environment
                  <input
                    className="mt-2 w-full border border-[#2d3448] bg-[#0a0d16] px-3 py-3 text-sm text-[#e6ebf8] outline-none focus:border-[#6e7dc4]"
                    required
                    value={form.operation}
                    onChange={(e) => setForm({ ...form, operation: e.target.value })}
                  />
                </label>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
                  Current scope
                  <input
                    className="mt-2 w-full border border-[#2d3448] bg-[#0a0d16] px-3 py-3 text-sm text-[#e6ebf8] outline-none focus:border-[#6e7dc4]"
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  />
                </label>
                <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
                  Notes
                  <textarea
                    rows={5}
                    className="mt-2 w-full border border-[#2d3448] bg-[#0a0d16] px-3 py-3 text-sm text-[#e6ebf8] outline-none focus:border-[#6e7dc4]"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </label>
                {error && <p className="text-xs text-[#f0a9b1]">Unable to submit right now. Please retry.</p>}
                <button
                  disabled={loading}
                  className="border border-[#3a4561] bg-[#10162a] px-5 py-3 text-xs uppercase tracking-[0.13em] text-[#dde4f8] transition hover:bg-[#151c33] disabled:opacity-50"
                  type="submit"
                >
                  {loading ? 'Sending' : 'Submit inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
