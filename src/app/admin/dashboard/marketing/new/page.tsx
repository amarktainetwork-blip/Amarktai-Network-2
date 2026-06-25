'use client'

import Link from 'next/link'
import { PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function MarketingNewPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Marketing / New" title="New Campaign" />
      <SectionCard>
        <p className="text-sm text-slate-400">
          Use the{' '}
          <Link href="/admin/dashboard/marketing" className="font-bold text-cyan-400 hover:text-cyan-300">
            Marketing Workflow
          </Link>{' '}
          to create a new campaign.
        </p>
      </SectionCard>
    </div>
  )
}
