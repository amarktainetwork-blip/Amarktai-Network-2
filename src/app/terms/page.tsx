import PublicShell from '@/components/public/PublicShell'

const sections = [
  ['Use', 'Use of AmarktAI systems must remain lawful, responsible, and aligned with applicable agreements.'],
  ['Responsibility', 'Operators remain responsible for submitted instructions, connected systems, and downstream use of produced artifacts.'],
  ['Controls', 'Infrastructure controls, approval flows, and policy checks may limit or block unsafe or non-compliant operations.'],
  ['Liability', 'Service availability and liability are governed by applicable contract terms and law.'],
  ['Contact', 'Legal inquiries may be sent to legal@amarktai.com.'],
]

export default function TermsPage() {
  return (
    <PublicShell>
      <section className="architecture-band px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Legal</p>
          <h1 className="mt-5 text-5xl font-semibold text-white">Terms of Service</h1>
          <p className="mt-4 text-sm text-[var(--amarkt-muted)]">Last updated: May 2026</p>
        </div>
      </section>
      <section className="bg-[var(--amarkt-black)] px-5 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl divide-y divide-white/[0.08] border border-white/[0.08]">
          {sections.map(([title, body]) => (
            <article key={title} className="bg-[var(--amarkt-graphite)] p-7">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--amarkt-muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
