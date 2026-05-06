'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Play, Send } from 'lucide-react'
import { APPROVED_ASSISTANT_MODELS, providerLabel, type CostMode } from '@/lib/approved-ai-catalog'

type AssistantContext = {
  dashboardSections?: Array<{ label: string }>
  approvedProviders?: Array<{ key: string; displayName: string }>
  workbench?: Record<string, unknown>
  costs?: Record<string, unknown>
  voice?: Array<{ provider: string; label: string; status: string }>
}

export default function AssistantPage() {
  const [modelId, setModelId] = useState('auto')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [voiceId, setVoiceId] = useState('minimax')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [context, setContext] = useState<AssistantContext | null>(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  const selectedModel = useMemo(
    () => APPROVED_ASSISTANT_MODELS.find((model) => model.id === modelId),
    [modelId],
  )

  useEffect(() => {
    fetch('/api/admin/amarktai-assistant/context')
      .then((response) => response.json())
      .then((data) => setContext(data))
      .catch(() => setContext(null))
  }, [])

  async function askAssistant() {
    if (!message.trim()) return
    setLoading('chat')
    setError('')
    try {
      const response = await fetch('/api/admin/amarktai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          providerOverride: selectedModel?.provider ?? 'auto',
          modelOverride: selectedModel?.id,
          costMode,
          metadata: { dashboardContext: context },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error ?? 'Assistant request failed')
      setReply(String(data.output ?? data.message ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant request failed')
    } finally {
      setLoading('')
    }
  }

  async function playTts() {
    if (!reply.trim()) return
    setLoading('tts')
    setError('')
    try {
      const response = await fetch('/api/admin/amarktai-assistant/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply, voiceId, costMode }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error ?? data.status ?? 'Voice playback needs a configured route')
      if (data.audioUrl) new Audio(data.audioUrl).play()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice playback needs a configured route')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Assistant</p>
        <h1 className="mt-3 text-3xl font-black text-white">AmarktAI Assistant</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Ask about dashboard health, settings, model routes, Workbench status, apps, agents, costs, approvals, jobs, artifacts, and system status.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <Field label="Provider/model selector">
            <select
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="auto">Auto approved route</option>
              {APPROVED_ASSISTANT_MODELS.map((model) => (
                <option key={`${model.provider}:${model.id}`} value={model.id}>
                  {providerLabel(model.provider)} - {model.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cost mode selector">
            <select
              value={costMode}
              onChange={(event) => setCostMode(event.target.value as CostMode)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="cheap">cheap</option>
              <option value="balanced">balanced</option>
              <option value="premium">premium</option>
            </select>
          </Field>

          <Field label="Voice selector">
            <select
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {(context?.voice ?? [
                { provider: 'minimax', label: 'MiniMax/Mimo voice', status: 'Needs key/test' },
                { provider: 'openai', label: 'OpenAI TTS', status: 'Needs key/test' },
              ]).map((voice) => (
                <option key={voice.provider} value={voice.provider}>{voice.label} - {voice.status}</option>
              ))}
            </select>
          </Field>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
            Context loaded: {context?.dashboardSections?.length ?? 0} sections, {context?.approvedProviders?.length ?? 0} approved providers, Workbench and cost status.
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <Field label="Message">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={8}
              placeholder="Ask for a Workbench prompt, a routing recommendation, app package setup, or a summary of the current system state."
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600"
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={askAssistant}
              disabled={!message.trim() || Boolean(loading)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === 'chat' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask AmarktAI Assistant
            </button>
            <button
              onClick={playTts}
              disabled={!reply || Boolean(loading)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading === 'tts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Play voice
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <pre className="mt-4 min-h-64 whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm leading-6 text-slate-300">
            {reply || 'Assistant response will appear here.'}
          </pre>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}
