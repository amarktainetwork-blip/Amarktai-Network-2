'use client'

import { useState } from 'react'
import {
  GENX_IMAGE_MODELS,
  GENX_VIDEO_MODELS,
  GENX_AUDIO_MODELS,
  GENX_TTS_MODELS,
} from '@/lib/genx-client'

type StudioTab = 'image' | 'video' | 'music' | 'voice'

const tabs: Array<{ id: StudioTab; label: string }> = [
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'music', label: 'Music / Audio' },
  { id: 'voice', label: 'Voice / TTS' },
]

const modelsByTab: Record<StudioTab, readonly string[]> = {
  image: GENX_IMAGE_MODELS,
  video: GENX_VIDEO_MODELS,
  music: GENX_AUDIO_MODELS,
  voice: GENX_TTS_MODELS,
}

const placeholderByTab: Record<StudioTab, string> = {
  image: 'Describe the image to generate…',
  video: 'Describe the video to generate…',
  music: 'Describe the music or audio to generate…',
  voice: 'Enter text to convert to speech…',
}

export default function CreativeStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('image')
  const [model, setModel] = useState<string>(GENX_IMAGE_MODELS[0] ?? 'gpt-image-2')
  const [prompt, setPrompt] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const models = modelsByTab[activeTab]

  function handleTabChange(tab: StudioTab) {
    setActiveTab(tab)
    setModel(modelsByTab[tab][0] ?? 'gpt-image-2')
    setResultUrl('')
    setError('')
  }

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    setResultUrl('')
    setError('')
    try {
      const response = await fetch('/api/admin/media/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          type: activeTab === 'voice' ? 'audio' : activeTab === 'music' ? 'audio' : activeTab,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Generation failed')
      setResultUrl(String(data.url ?? data.result_url ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Creative Studio</p>
        <h1 className="mt-3 text-3xl font-black text-white">Creative Studio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Generate images, video, music, and voice using the full GenX media model catalog.
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

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={placeholderByTab[activeTab]}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600"
            />
          </label>

          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>

          {error && (
            <p className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>
          )}

          {resultUrl && activeTab === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resultUrl} alt="Generated" className="max-w-full rounded-lg border border-white/10" />
          )}
          {resultUrl && activeTab !== 'image' && (
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-cyan-400 underline"
            >
              View result →
            </a>
          )}
        </div>
      </section>
    </div>
  )
}
