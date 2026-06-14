import { NextRequest } from 'next/server'
import {
  GET as getPlayground,
  POST as postPlayground,
} from '@/app/api/admin/playground/route'

/** Compatibility path. Command Center execution is owned by /api/admin/playground. */
export async function GET(request: NextRequest) {
  return getPlayground(request)
}

export async function POST(request: NextRequest) {
  return postPlayground(request)
}
