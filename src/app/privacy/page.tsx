import PublicShell from '@/components/public/PublicShell'

const sections = [
  ['Scope', 'This policy explains how operational and inquiry data is processed on the public website and connected service systems.'],
  ['Data handling', 'Data is processed for service delivery, security controls, system integrity, and legal obligations.'],
  ['Retention', 'Records are retained only for required operational and compliance periods, then removed or anonymized.'],
  ['Security', 'Traffic controls, access restrictions, and infrastructure monitoring are used to protect stored and transmitted data.'],
  ['Contact', 'Privacy inquiries: privacy@amarktai.com'],
]

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-5 pb-8 pt-16 lg:px-8 lg:pt-24">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[#edf1fb] sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-[#98a2bc]">Last updated: May 2026</p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <div className="space-y-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142]">
          {sections.map(([title, body]) => (
            <article key={title} className="bg-[#0b0f19] p-6">
              <h2 className="text-base font-semibold text-[#edf0fa]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#bbc5dc]">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
