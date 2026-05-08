import PublicShell from '@/components/public/PublicShell'

const sections = [
  ['Scope', 'This policy describes how public website inquiry data and related operational records are handled.'],
  ['Data handling', 'Data is processed for communication, security, system integrity, service delivery, and compliance duties.'],
  ['Retention', 'Records are retained for required operational and legal periods, then removed or anonymized.'],
  ['Security', 'Traffic controls, restricted systems, monitoring, and operational safeguards protect stored and transmitted data.'],
  ['Contact', 'Privacy inquiries may be sent to privacy@amarktai.com.'],
]

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="architecture-band px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Legal</p>
          <h1 className="mt-5 text-5xl font-semibold text-white">Privacy Policy</h1>
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
