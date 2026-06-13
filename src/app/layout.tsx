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
  title: 'AmarktAI | Universal AI Capability Engine',
  description:
    'AmarktAI turns user intent into governed capability execution, jobs, results, and reusable artifacts.',
  keywords: [
    'AI operations architecture',
    'AI orchestration',
    'AI capabilities',
    'connected apps',
    'AI operating system',
    'deployment governance',
    'AmarktAI',
  ],
  authors: [{ name: 'AmarktAI' }],
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
