'use client'

import Link from 'next/link'
import { PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function MarketingAdultPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Marketing / Adult Mode" title="Adult Mode" />
      <SectionCard>
        <p className="text-sm text-slate-400">
          Go to the{' '}
          <Link href="/admin/dashboard/adult-mode" className="font-bold text-cyan-400 hover:text-cyan-300">
            Adult Mode page
          </Link>{' '}
          to configure adult content settings.
        </p>
      </SectionCard>
    </div>
  )
}
