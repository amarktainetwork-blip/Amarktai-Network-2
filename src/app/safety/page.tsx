import Link from 'next/link'
import { ArrowRight, CheckCircle2, Shield, XCircle } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

export default function SafetyPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Safety</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            Gated. Permission-controlled. Safety-first.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI applies strict safety controls across all workflows. Adult creator capabilities are isolated, permission-gated, and subject to explicit consent and legal checks. No content that is illegal, non-consensual, underage, or rights-violating is permitted.
          </p>
        </div>
      </section>

      {/* Adult mode safety */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Adult creator workflows</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Isolated. Permission-gated. Safety-controlled.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Adult creator workflows are isolated from all other platform functionality. They require explicit permissions, legal consent checks, age verification, and rights confirmation before any content is generated. All content is filtered before submission and subject to platform-level content restrictions.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {/* Required checks */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
              <Shield className="h-7 w-7 text-blue-600" />
              <h3 className="mt-5 text-xl font-black">Required before access</h3>
              <ul className="mt-5 space-y-3">
                {[
                  'Age confirmation (18+)',
                  'Consent confirmation — all depicted individuals are consenting adults',
                  'Rights confirmation — you hold rights to all content and likenesses',
                  'Voice consent — explicit consent from any voice owner',
                  'No minors, non-consensual content, or illegal material',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Prohibited content */}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-7">
              <XCircle className="h-7 w-7 text-red-600" />
              <h3 className="mt-5 text-xl font-black">Strictly prohibited</h3>
              <ul className="mt-5 space-y-3">
                {[
                  'Any content depicting minors or underage individuals',
                  'Non-consensual acts or depictions of any kind',
                  'Real-person sexual deepfakes without documented rights',
                  'Celebrity sexual impersonation',
                  'Revenge or leaked content',
                  'Voice cloning without explicit consent of the voice owner',
                  'Illegal sexual content in any jurisdiction',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Platform-wide safety */}
      <section className="bg-slate-50 py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Platform-wide safety</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Safety controls built into the capability layer.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Content filtering',
                body: 'All requests — including adult mode — are checked against prohibited content patterns before any submission reaches the platform.',
              },
              {
                icon: <CheckCircle2 className="h-6 w-6 text-blue-600" />,
                title: 'Approval enforcement',
                body: 'Publishing is blocked until an explicit approve decision is made. No asset goes live without human review in manual approval mode.',
              },
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Provider governance',
                body: 'Only the five active platform providers are used. Removed providers are never called. Capability routing is enforced at the runtime level.',
              },
            ].map((c) => (
              <article key={c.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                {c.icon}
                <h3 className="mt-5 text-xl font-black">{c.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Voice cloning */}
      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Voice cloning</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Voice cloning requires explicit consent.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Voice cloning is only permitted when the user confirms they hold explicit consent from the voice owner. Minor voices cannot be cloned under any circumstances. Celebrity impersonation requires verified rights confirmation.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'consentConfirmed: true', desc: 'Required for all voice cloning', color: 'border-emerald-500/30 text-emerald-300' },
              { label: 'Minor voices blocked', desc: 'Hard block — no exceptions', color: 'border-red-500/30 text-red-300' },
              { label: 'Celebrity rights check', desc: 'Requires rightsConfirmed flag', color: 'border-amber-500/30 text-amber-300' },
            ].map((r) => (
              <div key={r.label} className={`rounded-xl border bg-white/5 p-5 ${r.color.split(' ')[0]}`}>
                <p className={`font-mono text-xs font-black ${r.color.split(' ')[1]}`}>{r.label}</p>
                <p className="mt-2 text-xs text-slate-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Questions about safety?</h2>
            <p className="mt-2 text-blue-100">Review our privacy policy and terms or contact us directly.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50">
              Contact us <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/privacy" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20">
              Privacy policy
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
