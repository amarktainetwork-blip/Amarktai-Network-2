import { Send } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function PublishingPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Publishing" title="Publishing Status" description="Publishing is blocked until approval is granted. Only approved assets can be published." />
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3">
        <p className="text-sm font-bold text-amber-300">Publishing requires approval.</p>
        <p className="mt-1 text-xs text-amber-200/70">Go to Approvals to review and approve assets before they can be published.</p>
      </div>
      <SectionCard>
        <EmptyState icon={<Send className="h-10 w-10" />} title="No published items" description="Approved items scheduled for publishing appear here." />
      </SectionCard>
    </div>
  )
}
