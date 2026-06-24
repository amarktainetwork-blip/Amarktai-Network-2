'use client'

import { useState } from 'react'
import PublicShell from '@/components/public/PublicShell'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    environment: '',
    message: '',
  })

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyOrProject: form.organization,
          message: [
            '[AMARKTAI INQUIRY]',
            `Organization: ${form.organization}`,
            `Operating environment: ${form.environment}`,
            `Notes: ${form.message}`,
          ].join('\n'),
        }),
      })

      if (!response.ok) throw new Error('submission failed')
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Contact</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-tight text-balance text-white lg:text-7xl">
            Let’s talk about the workflows, apps, or capability systems you want to operate more effectively.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--amarkt-muted)] sm:text-lg">
            Share the outcome, app, workflow, or operating challenge that matters. A human operator reviews every inquiry and responds directly.
          </p>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
          <aside className="premium-panel rounded-[2rem] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">Inquiry profile</p>
            <h2 className="mt-5 text-2xl font-black text-white">Best for teams evaluating serious AI operations.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">
              Use this form for platform evaluation, connected app planning, creative operations, research workflows, or runtime-control questions.
            </p>
            <div className="mt-8 space-y-6">
              {[
                'Connected business apps',
                'Command-driven workflows',
                'Media, app, and repository creation',
                'Deployment and operating support',
              ].map((item) => (
                <div key={item} className="flex gap-4">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--amarkt-blue)]" />
                  <p className="text-sm leading-7 text-[var(--amarkt-soft)]">{item}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="premium-panel overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
            {sent ? (
              <div className="p-8 lg:p-10">
                <div className="section-line h-px w-16" />
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-blue)]">Inquiry received</p>
                <p className="mt-5 max-w-xl text-base leading-8 text-[var(--amarkt-soft)]">
                  The message has been recorded. A response will be directed to the submitted contact address.
                </p>
              </div>
            ) : (
              <form className="divide-y divide-white/[0.08]" onSubmit={onSubmit}>
                {[
                  ['name', 'Full name', 'text', true],
                  ['email', 'Email address', 'email', true],
                  ['organization', 'Organization or project', 'text', true],
                  ['environment', 'Operating environment', 'text', false],
                ].map(([key, label, type, required]) => (
                  <label key={key as string} className="block px-7 py-5">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">{label}</span>
                    <input
                      type={type as string}
                      required={Boolean(required)}
                      value={form[key as keyof typeof form]}
                      onChange={(event) => setForm({ ...form, [key as string]: event.target.value })}
                      className="mt-3 w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-[var(--amarkt-dim)]"
                    />
                  </label>
                ))}

                <label className="block px-7 py-5">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">Operational notes</span>
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    className="mt-3 w-full resize-none border-0 bg-transparent text-base leading-8 text-white outline-none placeholder:text-[var(--amarkt-dim)]"
                  />
                </label>

                <div className="px-7 py-6">
                  {error && <p className="mb-4 text-sm text-[#f0a0aa]">The message could not be submitted. Please retry.</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full border border-cyan-300/20 bg-cyan-300 px-7 py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_45px_rgba(56,189,248,0.22)] transition hover:bg-cyan-200 disabled:opacity-45"
                  >
                    {loading ? 'Submitting' : 'Submit inquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
