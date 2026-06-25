'use client'

import { useState } from 'react'
import { AlertTriangle, Lock, ShieldAlert, ShieldOff } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/dashboard/ui'

// Disallowed terms — checked client-side before any submission
const DISALLOWED_PATTERNS = [
  /\bminor\b/i, /\bchild\b/i, /\bkid\b/i, /\bunderage\b/i, /\bteen\b/i, /\bjuvenile\b/i,
  /non.?consensual/i, /\bforce\b.*\bsex\b/i,
  /revenge.?porn/i, /leaked.?content/i, /leaked.?nude/i,
  /celebrity.?sex/i, /celebrity.?nude/i, /impersonat/i,
  /voice.?clone.?without.?consent/i,
  /deepfake.?(without|without consent)/i,
]

type GateState = 'locked' | 'checking' | 'unlocked' | 'blocked'

export default function AdultModePage() {
  const [gate, setGate] = useState<GateState>('locked')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [voiceConsent, setVoiceConsent] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('')
  const [blockReason, setBlockReason] = useState<string | null>(null)

  function unlock() {
    setGateError(null)
    if (!ageConfirmed) { setGateError('You must confirm you are 18 or older.'); return }
    if (!consentConfirmed) { setGateError('You must confirm all depicted content involves consenting adults.'); return }
    if (!rightsConfirmed) { setGateError('You must confirm you have the rights to generate this content.'); return }
    setGate('unlocked')
  }

  function checkPrompt(text: string) {
    setPrompt(text)
    setBlockReason(null)
    for (const pattern of DISALLOWED_PATTERNS) {
      if (pattern.test(text)) {
        setBlockReason(`Blocked: content matching prohibited pattern. Review the content policy.`)
        return
      }
    }
  }

  const canSubmit = gate === 'unlocked' && prompt.trim().length > 0 && !blockReason

  return (
    <div className="space-y-5">
      <PageHeader
        label="Adult Mode"
        title="Adult Content Gate"
        description="Adult content is disabled by default. All age, consent, and rights checks must pass before this mode is active."
      />

      {/* Gate section */}
      {gate !== 'unlocked' ? (
        <SectionCard title="Access Gate">
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/8 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="text-sm text-amber-100/80 space-y-1">
                <p className="font-black text-amber-300">Adult mode is OFF by default.</p>
                <p>You must agree to all terms below before this feature is available in this session. No content is generated until you unlock.</p>
              </div>
            </div>

            <div className="space-y-3">
              <CheckItem
                checked={ageConfirmed}
                onChange={setAgeConfirmed}
                label="I confirm I am 18 years of age or older."
              />
              <CheckItem
                checked={consentConfirmed}
                onChange={setConsentConfirmed}
                label="I confirm that all depicted individuals are consenting adults. I will not generate content depicting minors, non-consensual acts, real-person sexual deepfakes without documented rights, celebrity sexual impersonation, revenge/leaked content, or illegal sexual content."
              />
              <CheckItem
                checked={rightsConfirmed}
                onChange={setRightsConfirmed}
                label="I have the rights to generate any content I request. I will not clone voices or likenesses without consent."
              />
              <CheckItem
                checked={voiceConsent}
                onChange={setVoiceConsent}
                label="(If using voice) I have obtained explicit consent from any voice owner whose likeness may be used."
              />
            </div>

            {gateError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {gateError}
              </div>
            )}

            <button
              onClick={unlock}
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-300 hover:bg-amber-500/15"
            >
              <Lock className="h-4 w-4" /> Confirm and Unlock for this Session
            </button>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <p className="text-sm font-black text-emerald-300">Adult mode active for this session.</p>
            <button
              onClick={() => setGate('locked')}
              className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-300"
            >
              <ShieldOff className="h-3.5 w-3.5" /> Lock
            </button>
          </div>

          <SectionCard title="Content Request">
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                The platform routes your request automatically. Do not include provider or model names — they are not accepted.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Request Description</label>
                <textarea
                  value={prompt}
                  onChange={e => checkPrompt(e.target.value)}
                  placeholder="Describe the content you need…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                />
              </div>

              {blockReason && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-black">Content blocked before submission</p>
                    <p className="mt-0.5 text-xs">{blockReason}</p>
                  </div>
                </div>
              )}

              <button
                disabled={!canSubmit}
                onClick={() => {/* route through /api/brain/adult-text — provider selected by runtime */}}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit Request
              </button>

              <p className="text-[10px] text-slate-600">
                Requests are routed by the runtime. No provider or model can be specified here. All requests are subject to content filtering.
              </p>
            </div>
          </SectionCard>
        </>
      )}

      <SectionCard title="Prohibited Content">
        <ul className="space-y-1.5 text-xs text-slate-400">
          {[
            'Any content depicting minors or underage individuals',
            'Non-consensual acts or depictions',
            'Real-person sexual deepfakes without documented rights',
            'Celebrity sexual impersonation',
            'Revenge / leaked content of any kind',
            'Illegal sexual content in any jurisdiction',
            'Voice cloning without explicit consent of the voice owner',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-red-500">✗</span>
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function CheckItem({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  )
}
