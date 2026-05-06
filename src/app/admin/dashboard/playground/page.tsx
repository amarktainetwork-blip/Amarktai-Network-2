'use client'

import { useState } from 'react'
import {
  GENX_TEXT_MODELS,
  GENX_IMAGE_MODELS,
  GENX_VIDEO_MODELS,
  GENX_AUDIO_MODELS,
  GENX_TTS_MODELS,
  GENX_STT_MODELS,
} from '@/lib/genx-client'

type PlaygroundTab =
  | 'chat'
  | 'coding'
  | 'research'
  | 'image'
  | 'video'
  | 'music'
  | 'voice-tts'
  | 'stt'
  | 'avatar'
  | 'adult'

const tabs: Array<{ id: PlaygroundTab; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'coding', label: 'Coding' },
  { id: 'research', label: 'Research' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'music', label: 'Music / Audio' },
  { id: 'voice-tts', label: 'Voice / TTS' },
  { id: 'stt', label: 'STT' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'adult', label: 'Adult (gated)' },
]

const modelsByTab: Record<PlaygroundTab, readonly string[]> = {
  chat: GENX_TEXT_MODELS,
  coding: GENX_TEXT_MODELS,
  research: GENX_TEXT_MODELS,
  image: GENX_IMAGE_MODELS,
  video: GENX_VIDEO_MODELS,
  music: GENX_AUDIO_MODELS,
  'voice-tts': GENX_TTS_MODELS,
  stt: GENX_STT_MODELS,
  avatar: GENX_VIDEO_MODELS,
  adult: GENX_TEXT_MODELS,
}

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('chat')
  const [model, setModel] = useState<string>(GENX_TEXT_MODELS[0])
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const models = modelsByTab[activeTab]

  function handleTabChange(tab: PlaygroundTab) {
    setActiveTab(tab)
    setModel(modelsByTab[tab][0] ?? '')
    setOutput('')
  }

  async function runPrompt() {
    if (!prompt.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const response = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, modelId: model, capability: activeTab }),
      })
      const data = await response.json().catch(() => ({}))
      setOutput(typeof data.reply === 'string' ? data.reply : JSON.stringify(data, null, 2))
    } catch (err) {
      setOutput(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Playground</p>
        <h1 className="mt-3 text-3xl font-black text-white">AI Playground</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Explore and test AI capabilities across chat, coding, research, image, video, music, voice, STT, and avatar generation.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={[
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                activeTab === tab.id
                  ? 'bg-cyan-400/20 text-cyan-200'
                  : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'adult' && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              Adult content tab is gated. The app package adult policy must be set to &quot;allowed&quot; before any adult-capable models are activated.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder={`Enter a ${activeTab} prompt…`}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600"
            />
          </label>

          <button
            onClick={runPrompt}
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Running…' : 'Run'}
          </button>

          {output && (
            <pre className="min-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-xs leading-5 text-slate-300">
              {output}
            </pre>
          )}
        </div>
      </section>
    </div>
  )
}
