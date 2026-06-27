import Link from 'next/link'
import { ArrowRight, CheckCircle2, Shield, XCircle } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const requiredControls = [
  'Authenticated access for platform operations',
  'App-level permissions before sensitive routes are available',
  'Provider and storage readiness checks before execution',
  'Human approval state for workflows that require review',
  'Artifact references and execution status instead of unverifiable claims',
]

const prohibitedUse = [
  'Illegal content or instructions',
  'Non-consensual or rights-violating use of likeness, voice, or private data',
  'Requests involving minors or exploitation',
  'Attempts to bypass safety gates, approvals, or audit controls',
  'Provider key, system credential, or private data exposure',
]

export default function SafetyPage() {
  return (
    <PublicShell>
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Safety</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            Gated. Permission-controlled. Safety-first.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI applies safety controls across capability requests, provider routing, storage, approvals, voice use, and operational access.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Runtime safeguards</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Safety controls built into the capability layer.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-7">
              <Shield className="h-7 w-7 text-blue-600" />
              <h3 className="mt-5 text-xl font-black">Required before access</h3>
              <ul className="mt-5 space-y-3">
                {requiredControls.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-7">
              <XCircle className="h-7 w-7 text-red-600" />
              <h3 className="mt-5 text-xl font-black">Blocked use</h3>
              <ul className="mt-5 space-y-3">
                {prohibitedUse.map((item) => (
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

      <section className="bg-slate-50 py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Platform-wide safety</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Governance, approval, and provider controls stay centralized.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Content and policy filtering',
                body: 'Requests are checked against policy and app permissions before submission reaches a capability route.',
              },
              {
                icon: <CheckCircle2 className="h-6 w-6 text-blue-600" />,
                title: 'Approval enforcement',
                body: 'Publishing can be blocked until an approve decision exists. Stored outputs retain status and references.',
              },
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Provider governance',
                body: 'Runtime routing is enforced at the platform level. Apps request outcomes instead of selecting infrastructure.',
              },
            ].map((card) => (
              <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                {card.icon}
                <h3 className="mt-5 text-xl font-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Voice rights</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Voice workflows require rights and consent.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Voice workflows must confirm permission from the voice owner and must not impersonate people or use private audio without rights.
          </p>
        </div>
      </section>

      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Questions about safety?</h2>
            <p className="mt-2 text-blue-100">Review our privacy policy and terms or contact us directly.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50">
              Contact us <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/privacy" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20">
              Privacy policy
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
