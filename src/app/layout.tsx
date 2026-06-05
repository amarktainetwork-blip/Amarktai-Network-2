import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AmarktAI Network | Private AI Operations Architecture',
  description:
    'AmarktAI Network is a private AI operations platform for model routing, agent coordination, persistent memory, artifacts, approvals, and governed deployment workflows.',
  keywords: [
    'AI operations architecture',
    'AI orchestration',
    'model routing',
    'agent coordination',
    'AI operating system',
    'deployment governance',
    'AmarktAI Network',
  ],
  authors: [{ name: 'AmarktAI Network' }],
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
