/**
 * POST /api/admin/amarktai-assistant/chat
 *
 * AmarktAI Assistant conversation endpoint.
 * Implements the same logic as /api/admin/aiva/chat — same backend,
 * AmarktAI Assistant naming. Legacy route /api/admin/aiva/chat remains
 * as a compatible alias.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { executeCapability } from '@/lib/capability-router'
import { prisma } from '@/lib/prisma'

function detectCapability(text: string): string {
  const t = text.toLowerCase()
  if ((/\badult\b|18\+|\bnsfw\b/.test(t)) && !/image|video/.test(t)) return 'adult_text'
  if (/create image|generate image|\bdraw\b/.test(t)) return 'image_generation'
  if (/create video|generate video/.test(t)) return 'video_generation'
  if (/text to speech|\btts\b/.test(t)) return 'tts'
  if (/transcribe|\bstt\b/.test(t)) return 'stt'
  if (/\bscrape\b|crawl website/.test(t)) return 'scrape_website'
  if (/write code|create code|fix code/.test(t)) return 'code'
  return 'chat'
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      message,
      conversationId: existingConvId,
      capability: explicitCapability,
      providerOverride,
      modelOverride,
      saveArtifact,
      files,
      adultMode,
      safeMode,
      appSlug,
      agentId,
      metadata,
    } = body as {
      message: string
      conversationId?: string
      capability?: string
      providerOverride?: string
      modelOverride?: string
      saveArtifact?: boolean
      files?: string[]
      adultMode?: boolean
      safeMode?: boolean
      appSlug?: string
      agentId?: string
      metadata?: Record<string, unknown>
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const capability = explicitCapability || detectCapability(message)

    let conversationId = existingConvId
    try {
      if (conversationId) {
        const existing = await prisma.aivaConversation.findUnique({ where: { id: conversationId } })
        if (!existing) conversationId = undefined
      }
      if (!conversationId) {
        const conv = await prisma.aivaConversation.create({
          data: { title: message.slice(0, 60) || 'New Conversation' },
        })
        conversationId = conv.id
      }
    } catch {
      conversationId = existingConvId ?? `ephemeral-${Date.now()}`
    }

    let userMsgId: string | undefined
    try {
      if (conversationId) {
        const userMsg = await prisma.aivaMessage.create({
          data: { conversationId, role: 'user', content: message, capability },
        })
        userMsgId = userMsg.id
      }
    } catch { /* graceful degradation */ }

    const result = await executeCapability({
      input: message,
      capability,
      files,
      providerOverride,
      modelOverride,
      adultMode: adultMode === true,
      safeMode: safeMode === true,
      saveArtifact,
      traceId: `amarktai-assistant-${Date.now()}`,
      metadata: { ...metadata, appSlug, agentId },
    })

    let assistantMsgId: string | undefined
    try {
      if (conversationId) {
        const assistantMsg = await prisma.aivaMessage.create({
          data: {
            conversationId,
            role: 'assistant',
            content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
            capability: result.capability ?? capability,
            provider: result.provider ?? '',
            model: result.model ?? '',
            outputType: result.outputType ?? 'text',
            artifactId: result.artifactId ?? null,
            fallbackUsed: result.fallbackUsed ?? false,
            warning: result.warning ?? null,
            errorMessage: result.success ? null : (result.error ?? null),
          },
        })
        assistantMsgId = assistantMsg.id
      }
    } catch { /* graceful degradation */ }

    return NextResponse.json({
      conversationId,
      userMessageId: userMsgId,
      messageId: assistantMsgId,
      output: result.output,
      capability: result.capability ?? capability,
      provider: result.provider,
      model: result.model,
      outputType: result.outputType,
      artifactId: result.artifactId,
      fallbackUsed: result.fallbackUsed,
      warning: result.warning,
      error: result.success ? undefined : result.error,
      success: result.success,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
