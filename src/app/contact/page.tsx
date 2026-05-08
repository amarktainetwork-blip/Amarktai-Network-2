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
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#04060f] pb-20 pt-24 lg:pb-24 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(96,165,250,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.5)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.3)] to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#4a5f88]">Contact</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[#eef2fb] sm:text-5xl">
            Institutional inquiry channel for private AI infrastructure discussions.
          </h1>
        </div>
      </section>

      {/* Inquiry form */}
      <section className="bg-[#05070f] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            {/* Sidebar */}
            <aside className="space-y-6">
              <div className="border border-[#1a2038] bg-[#070a14] p-7">
                <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-[#3d5070]">Inquiry profile</p>
                <div className="space-y-4">
                  {[
                    'Private infrastructure scope and operating environment',
                    'Model routing and agent orchestration requirements',
                    'Deployment governance constraints',
                    'Operational timeline and security considerations',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[rgba(96,165,250,0.45)]" />
                      <p className="text-sm leading-7 text-[#7a8daf]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#1a2038] bg-[#070a14] p-7">
                <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#3d5070]">Response protocol</p>
                <p className="text-sm leading-7 text-[#6a7da0]">
                  Inquiries are reviewed by a human operator. Responses are directed to the submitted contact address within the relevant operational timeframe.
                </p>
              </div>
            </aside>

            {/* Form panel */}
            <div className="border border-[#1a2038] bg-[#070a14]">
              {ok ? (
                <div className="flex h-full flex-col items-start justify-center p-10">
                  <div className="mb-4 h-1 w-10 bg-[rgba(96,165,250,0.5)]" />
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#4a6a9a]">Inquiry received</p>
                  <p className="mt-5 max-w-md text-base leading-8 text-[#8a9dbe]">
                    Your operational inquiry has been recorded. A response will be directed to your provided contact address.
                  </p>
                </div>
              ) : (
                <form className="space-y-0 divide-y divide-[#1a2038]" onSubmit={onSubmit}>
                  {[
                    { id: 'name', label: 'Full name', type: 'text', required: true, key: 'name' as const },
                    { id: 'email', label: 'Email address', type: 'email', required: true, key: 'email' as const },
                    { id: 'operation', label: 'Operating environment', type: 'text', required: true, key: 'operation' as const },
                    { id: 'scope', label: 'Current operational scope', type: 'text', required: false, key: 'scope' as const },
                  ].map((field) => (
                    <label key={field.id} className="block">
                      <span className="block px-7 pt-5 text-[10px] uppercase tracking-[0.2em] text-[#4a6080]">{field.label}</span>
                      <input
                        type={field.type}
                        required={field.required}
                        value={form[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="w-full bg-transparent px-7 pb-5 pt-2 text-sm text-[#d8e4f5] outline-none placeholder:text-[#2d3d5a] focus:bg-[#060912]"
                      />
                    </label>
                  ))}

                  <label className="block">
                    <span className="block px-7 pt-5 text-[10px] uppercase tracking-[0.2em] text-[#4a6080]">Notes</span>
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full resize-none bg-transparent px-7 pb-5 pt-2 text-sm text-[#d8e4f5] outline-none placeholder:text-[#2d3d5a] focus:bg-[#060912]"
                    />
                  </label>

                  <div className="px-7 py-5">
                    {error && (
                      <p className="mb-4 text-xs text-[#d07a85]">Unable to submit at this time. Please retry.</p>
                    )}
                    <button
                      disabled={loading}
                      type="submit"
                      className="border border-[#2a3a62] bg-[#0d1428] px-8 py-3.5 text-xs uppercase tracking-[0.18em] text-[#c8d8f0] transition hover:bg-[#111c38] disabled:opacity-40"
                    >
                      {loading ? 'Submitting…' : 'Submit inquiry'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
