import { NextRequest, NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'

/**
 * POST /api/brain/stt - Speech-to-Text endpoint.
 *
 * V1 provider policy: GenX plus proven Groq Whisper fallback.
 * The route never falls back to inactive providers such as Hugging Face.
 */
export async function POST(request: NextRequest) {
  const unavailable = (
    reason: 'provider_not_configured' | 'all_providers_unavailable' | 'invalid_request' | 'transcription_failed',
    error: string,
    status: number,
    provider?: string,
  ) => NextResponse.json(
    {
      error,
      executed: false,
      capability: 'voice_input',
      available: false,
      reason,
      ...(provider ? { provider } : {}),
    },
    { status },
  )

  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return unavailable('invalid_request', 'Content-Type must be multipart/form-data with an audio file', 400)
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof Blob)) {
      return unavailable('invalid_request', 'An audio file is required in the "file" field', 400)
    }

    const requestedModel = formData.get('model') as string | null
    const language = formData.get('language') as string | null
    const requestedProvider = ((formData.get('provider') as string | null) ?? 'auto').trim().toLowerCase()
    if (!['auto', 'genx', 'groq'].includes(requestedProvider)) {
      return unavailable(
        'provider_not_configured',
        `Provider "${requestedProvider}" is not active for V1 STT. Active V1 STT providers are GenX and Groq.`,
        400,
        requestedProvider,
      )
    }

    const { callGenXMedia, GENX_DEFAULT_STT_MODEL } = await import('@/lib/genx-client')
    const genxModel = requestedProvider === 'groq' ? GENX_DEFAULT_STT_MODEL : requestedModel ?? GENX_DEFAULT_STT_MODEL
    const audioBytes = await file.arrayBuffer()
    const audioBase64 = Buffer.from(audioBytes).toString('base64')
    const mimeType = (file as File).type || 'audio/mpeg'
    let genxError = ''

    if (requestedProvider !== 'groq') {
      const genxResult = await callGenXMedia({
        model: genxModel,
        prompt: audioBase64,
        type: 'audio',
        metadata: { task: 'transcribe', mimeType, language: language ?? undefined },
      })

      if (genxResult.success && genxResult.url) {
        return NextResponse.json({
          transcript: genxResult.url,
          model: genxResult.model,
          language,
          provider: 'genx',
          executed: true,
          fallback_used: false,
          capability: 'voice_input',
        })
      }
      genxError = genxResult.error ?? 'GenX STT returned no transcript.'
      if (requestedProvider === 'genx') {
        return unavailable('all_providers_unavailable', `GenX STT returned no transcript: ${genxError}`, 503, 'genx')
      }
    }

    const groqKey = await getVaultApiKey('groq')
    if (groqKey?.trim()) {
      const groqForm = new FormData()
      groqForm.set('file', file, (file as File).name || 'audio.webm')
      groqForm.set('model', requestedModel || 'whisper-large-v3')
      if (language) groqForm.set('language', language)

      const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: groqForm,
      })

      const responseText = await groqResponse.text()
      if (groqResponse.ok) {
        let payload: Record<string, unknown> = {}
        try {
          payload = JSON.parse(responseText) as Record<string, unknown>
        } catch {
          payload = { text: responseText }
        }
        const transcript = typeof payload.text === 'string' ? payload.text : responseText
        if (transcript.trim()) {
          return NextResponse.json({
            transcript,
            model: requestedModel || 'whisper-large-v3',
            language,
            provider: 'groq',
            executed: true,
            fallback_used: requestedProvider !== 'groq',
            capability: 'voice_input',
          })
        }
      }
      const detail = responseText.slice(0, 300)
      return unavailable(
        'all_providers_unavailable',
        `Groq STT returned no transcript${detail ? `: ${detail}` : '.'}`,
        503,
        'groq',
      )
    }

    return unavailable(
      'all_providers_unavailable',
      genxError
        ? `STT is not proven for active V1 providers. GenX returned no transcript (${genxError}) and Groq is not configured; Together STT is not wired yet.`
        : 'STT is not proven for active V1 providers. Groq is not configured; Together STT is not wired yet.',
      503,
      requestedProvider === 'groq' ? 'groq' : 'genx',
    )
  } catch (err) {
    return unavailable('transcription_failed', `Internal server error: ${String(err)}`, 500)
  }
}
