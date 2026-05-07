import PublicShell from '@/components/public/PublicShell'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const sections = [
  ['Data we collect', 'We collect account, inquiry, and operational usage data required to provide and secure the AmarktAI Network service.'],
  ['How data is used', 'Data is used to run system features, route requests, maintain safety controls, and improve product performance.'],
  ['Retention and deletion', 'We retain data only as needed for operational, legal, and security obligations, then delete or anonymize records.'],
  ['Security controls', 'Traffic protection, access controls, and operational guardrails are used to protect stored and in-transit data.'],
  ['Contact', 'For privacy requests or concerns, contact privacy@amarktai.com.'],
]

export default function PrivacyPage() {
  return (
    <PublicShell>
      <SectionWrap className="pt-14 lg:pt-18">
        <SectionInner>
          <h1 className="text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">Privacy Policy</h1>
          <p className="mt-4 text-slate-300">Last updated: May 2026</p>
        </SectionInner>
      </SectionWrap>
      <SectionWrap>
        <SectionInner className="space-y-4">
          {sections.map(([title, body]) => (
            <SurfaceCard key={title}>
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
            </SurfaceCard>
          ))}
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
