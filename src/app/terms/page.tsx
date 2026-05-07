import PublicShell from '@/components/public/PublicShell'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const sections = [
  ['Use of service', 'By using AmarktAI Network, you agree to these terms and to using the platform lawfully and responsibly.'],
  ['Restricted access', 'Access is provisioned for approved operators and may be suspended for policy or security violations.'],
  ['Operational responsibility', 'You are responsible for actions initiated from your environment and for reviewing high-impact operations.'],
  ['Warranty and liability', 'The platform is provided as available, with liability limits to the maximum extent permitted by law.'],
  ['Contact', 'For legal inquiries, contact legal@amarktai.com.'],
]

export default function TermsPage() {
  return (
    <PublicShell>
      <SectionWrap className="pt-14 lg:pt-18">
        <SectionInner>
          <h1 className="text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">Terms of Service</h1>
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
