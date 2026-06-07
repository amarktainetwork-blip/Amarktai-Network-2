import { NextRequest } from 'next/server'
import { POST as chatPOST } from '../chat/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type StreamPayload = Record<string, unknown>

function encodeSse(payload: StreamPayload | '[DONE]') {
  if (payload === '[DONE]') return `data: [DONE]\n\n`
  return `data: ${JSON.stringify(payload)}\n\n`
}

function extractOutput(payload: Record<string, unknown>) {
  return String(
    payload.output ??
      payload.message ??
      payload.response ??
      payload.text ??
      payload.content ??
      '',
  )
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: StreamPayload | '[DONE]') => {
        controller.enqueue(encoder.encode(encodeSse(payload)))
      }

      try {
        send({
          status: 'Routing',
          message: 'Routing through AI Brain assistant chat execution.',
        })

        const chatResponse = await chatPOST(req)

        let payload: Record<string, unknown>
        try {
          payload = (await chatResponse.json()) as Record<string, unknown>
        } catch {
          payload = {
            success: false,
            error: `Assistant chat route returned non-JSON response with HTTP ${chatResponse.status}.`,
          }
        }

        if (!chatResponse.ok || payload.success === false) {
          send({
            status: 'Error',
            success: false,
            error:
              payload.error ??
              `Assistant chat route failed with HTTP ${chatResponse.status}.`,
            blocker: payload.blocker ?? null,
            provider: payload.provider ?? null,
            model: payload.model ?? null,
            route: payload.route ?? null,
          })
          send('[DONE]')
          controller.close()
          return
        }

        const output = extractOutput(payload)

        send({
          status: 'Answer',
          type: 'message',
          success: true,
          provider: payload.provider ?? null,
          model: payload.model ?? null,
          capability: payload.capability ?? 'chat',
          route: payload.route ?? null,

          // Multiple keys are intentional because existing dashboard parsers
          // may read text, delta, content, message, or output.
          text: output,
          delta: output,
          content: output,
          message: output,
          output,
        })

        send({
          status: 'Done',
          success: true,
          provider: payload.provider ?? null,
          model: payload.model ?? null,
        })

        send('[DONE]')
        controller.close()
      } catch (err) {
        send({
          status: 'Error',
          success: false,
          error:
            err instanceof Error
              ? err.message
              : 'Assistant stream route failed.',
        })
        send('[DONE]')
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
