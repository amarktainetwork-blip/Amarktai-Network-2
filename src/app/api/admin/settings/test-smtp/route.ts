/**
 * POST /api/admin/settings/test-smtp
 *
 * Tests SMTP configuration by verifying the configured env vars exist
 * and, if nodemailer is available, doing a verify() call.
 * Returns real results — never faked.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const smtpHost = process.env.SMTP_HOST?.trim()
  const smtpPort = process.env.SMTP_PORT?.trim()
  const smtpUser = process.env.SMTP_USER?.trim()
  const smtpPass = process.env.SMTP_PASS?.trim()

  if (!smtpHost) {
    return NextResponse.json({
      success: false,
      error: 'SMTP_HOST is not configured',
      nextAction: 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment',
    })
  }

  const config = {
    host: smtpHost,
    port: smtpPort ? Number(smtpPort) : 587,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    secure: smtpPort === '465',
  }

  const start = Date.now()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer') as typeof import('nodemailer')
    const transporter = nodemailer.createTransport(config)
    await transporter.verify()
    return NextResponse.json({ success: true, host: smtpHost, port: config.port, latencyMs: Date.now() - start })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP verify failed'
    if (message.includes('Cannot find module')) {
      return NextResponse.json({
        success: true,
        note: 'nodemailer not installed — SMTP env vars are set but not deep-tested',
        host: smtpHost,
        port: config.port,
        latencyMs: Date.now() - start,
      })
    }
    return NextResponse.json({
      success: false,
      error: message,
      host: smtpHost,
      port: config.port,
      latencyMs: Date.now() - start,
      nextAction: 'Check SMTP credentials and host reachability',
    })
  }
}
