import { NextRequest, NextResponse } from 'next/server'
import {
  executeTool,
  executeToolCalls,
  getAvailableTools,
  getToolsAsOpenAIFunctions,
  type ToolCall,
} from '@/lib/tool-runtime'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'execute') {
      const { toolName, arguments: toolArgs, callId } = body
      if (!toolName) {
        return NextResponse.json({ error: 'toolName required' }, { status: 400 })
      }
      const call: ToolCall = {
        id: callId || `call_${Date.now()}`,
        toolName,
        arguments: toolArgs || {},
      }
      const result = await executeTool(call)
      return NextResponse.json({ success: true, result })
    }

    if (action === 'execute_batch') {
      const { calls } = body
      if (!calls?.length) {
        return NextResponse.json({ error: 'calls array required' }, { status: 400 })
      }
      const results = await executeToolCalls(calls as ToolCall[])
      return NextResponse.json({ success: true, results })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: execute, execute_batch' },
      { status: 400 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tools = getAvailableTools()
    const schemas = getToolsAsOpenAIFunctions()
    return NextResponse.json({ tools, schemas })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list tools'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
