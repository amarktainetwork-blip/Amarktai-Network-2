import { NextRequest, NextResponse } from 'next/server'
import { createArtifact } from '@/lib/artifact-store'
import { getVaultApiKey } from '@/lib/brain'
import { callGenXMedia, GENX_STT_MODELS } from '@/lib/genx-client'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'

export async function POST(request: NextRequest) {
  const unavailable = (error: string, status = 503, provider?: string) =>
    NextResponse.json(
      { error, executed: false, capability: 'voice_input', available: false, provider },
      { status },
    )

  if (!(request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    return unavailable('Content-Type must be multipart/form-data with an audio file.', 400)
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) return unavailable('An audio file is required in the "file" field.', 400)

  const requestedProvider = String(formData.get('provider') ?? 'auto')
  if (requestedProvider !== 'auto' && !isApprovedDirectProvider(requestedProvider)) {
    return unavailable(`Provider "${requestedProvider}" is not approved for direct STT.`, 400, requestedProvider)
  }

  const requestedModel = formData.get('model')?.toString()
  const language = formData.get('language')?.toString()
  const appSlug = formData.get('appSlug')?.toString() || 'media-studio'
  const bytes = Buffer.from(await file.arrayBuffer())
  const mimeType = (file as File).type || 'audio/webm'

  if (requestedProvider === 'auto' || requestedProvider === 'genx') {
    const model = requestedModel ?? GENX_STT_MODELS[0]
    const result = await callGenXMedia({
      model,
      prompt: bytes.toString('base64'),
      type: 'audio',
      metadata: { task: 'transcribe', mimeType, language },
    })
    if (result.success && result.url) {
      return persistTranscript({
        transcript: result.url,
        model: result.model,
        language,
        provider: 'genx',
        appSlug,
        sourceMimeType: mimeType,
        fallbackUsed: false,
      })
    }
    if (requestedProvider === 'genx') return unavailable('GenX STT is not configured or returned no transcript.', 503, 'genx')
  }

  const candidates = requestedProvider === 'auto'
    ? ['groq', 'qwen', 'huggingface'] as const
    : [requestedProvider] as const

  for (const provider of candidates) {
    const key = await getVaultApiKey(provider)
    if (!key) continue

    if (provider === 'groq') {
      const model = requestedModel ?? 'whisper-large-v3'
      const upstream = new FormData()
      upstream.append('file', file, 'audio.webm')
      upstream.append('model', model)
      if (language) upstream.append('language', language)
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: upstream,
      })
      if (response.ok) {
        const result = await response.json() as { text?: string }
        if (result.text) return persistTranscript({ transcript: result.text, model, language, provider, appSlug, sourceMimeType: mimeType })
      }
    }

    if (provider === 'qwen') {
      const model = requestedModel ?? 'qwen-audio-turbo'
      const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'audio_url', audio_url: { url: `data:${mimeType};base64,${bytes.toString('base64')}` } },
              { type: 'text', text: language ? `Transcribe this ${language} audio.` : 'Transcribe this audio accurately.' },
            ],
          }],
        }),
      })
      if (response.ok) {
        const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
        const transcript = result.choices?.[0]?.message?.content
        if (transcript) return persistTranscript({ transcript, model, language, provider, appSlug, sourceMimeType: mimeType })
      }
    }

    if (provider === 'huggingface') {
      const model = requestedModel ?? 'openai/whisper-large-v3'
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': mimeType },
        body: bytes,
      })
      if (response.ok) {
        const result = await response.json() as { text?: string }
        if (result.text) return persistTranscript({ transcript: result.text, model, language, provider, appSlug, sourceMimeType: mimeType })
      }
    }
  }

  return unavailable('No approved STT provider is currently ready.')
}

async function persistTranscript(input: {
  transcript: string
  model: string
  language?: string
  provider: string
  appSlug: string
  sourceMimeType: string
  fallbackUsed?: boolean
}) {
  try {
    const artifact = await createArtifact({
      appSlug: input.appSlug,
      type: 'transcript',
      subType: 'stt',
      capability: 'stt',
      title: 'Speech transcription',
      description: input.transcript.slice(0, 240),
      provider: input.provider,
      model: input.model,
      mimeType: 'text/plain',
      content: Buffer.from(input.transcript, 'utf8'),
      metadata: {
        language: input.language ?? null,
        sourceMimeType: input.sourceMimeType,
      },
    })
    return NextResponse.json({
      transcript: input.transcript,
      model: input.model,
      language: input.language,
      provider: input.provider,
      executed: true,
      fallback_used: input.fallbackUsed ?? false,
      capability: 'voice_input',
      artifactId: artifact.id,
      storageUrl: artifact.storageUrl,
    })
  } catch (error) {
    return NextResponse.json({
      executed: false,
      capability: 'voice_input',
      error: `Transcription completed but artifact persistence failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    }, { status: 503 })
  }
}
