/**
 * Avatar & Voice page — voice personas, TTS, STT, and avatar media.
 *
 * User-friendly launcher for voice and avatar capabilities.
 * Links to Studio for actual execution.
 */

import Link from 'next/link'
import { ArrowRight, AudioLines, Bot, Mic, Music, Volume2 } from 'lucide-react'

const VOICE_CAPABILITIES = [
  {
    icon: Volume2,
    label: 'Text to Speech',
    desc: 'Convert text to natural-sounding speech. Supports multiple voices and styles.',
    status: 'working',
    providers: ['GenX', 'Hugging Face'],
    href: '/admin/dashboard/studio',
  },
  {
    icon: Mic,
    label: 'Speech Recognition (STT)',
    desc: 'Transcribe audio to text. Supports multiple languages and audio formats.',
    status: 'working',
    providers: ['GenX', 'Groq', 'Hugging Face'],
    href: '/admin/dashboard/studio',
  },
  {
    icon: Bot,
    label: 'Avatar Video',
    desc: 'Create a talking avatar video from text or audio. Requires GenX configuration.',
    status: 'partial',
    providers: ['GenX'],
    href: '/admin/dashboard/studio',
  },
  {
    icon: AudioLines,
    label: 'Voice Clone / Design',
    desc: 'Design or clone a voice profile. Requires consent and provider support.',
    status: 'coming',
    providers: ['GenX'],
    href: '/admin/dashboard/studio',
  },
  {
    icon: Music,
    label: 'Music Generation',
    desc: 'Generate full songs with vocals, instruments, and style guidance.',
    status: 'working',
    providers: ['GenX'],
    href: '/admin/dashboard/studio',
  },
] as const

const STATUS_STYLES = {
  working: { badge: 'bg-emerald-900/60 text-emerald-300', label: 'Working' },
  partial: { badge: 'bg-amber-900/60 text-amber-300', label: 'Partial setup' },
  coming: { badge: 'bg-slate-800 text-slate-400', label: 'Provider available' },
}

export default function AvatarVoicePage() {
  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Avatar & Voice</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
          Voice, TTS, STT & Avatar
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate speech, transcribe audio, create avatar videos, and produce music — all from Studio.
        </p>
      </div>

      {/* ── Capability cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VOICE_CAPABILITIES.map(({ icon: Icon, label, desc, status, providers, href }) => {
          const style = STATUS_STYLES[status]
          return (
            <Link
              key={label}
              href={href}
              className="group flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition hover:border-teal-500/30 hover:bg-teal-500/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10">
                  <Icon className="h-5 w-5 text-teal-400" />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.badge}`}>
                  {style.label}
                </span>
              </div>

              <div>
                <p className="font-black text-slate-100 group-hover:text-white">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {providers.map((p) => (
                    <span key={p} className="rounded-full border border-teal-500/20 bg-teal-500/8 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                      {p}
                    </span>
                  ))}
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-teal-400" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Studio CTA ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-100">Ready to create?</p>
            <p className="mt-1 text-sm text-slate-400">
              Open Studio to generate speech, transcribe audio, or create avatar videos with a simple prompt.
            </p>
          </div>
          <Link
            href="/admin/dashboard/studio"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-400"
          >
            Open Studio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

    </div>
  )
}
