import { BookOpen } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'
import Link from 'next/link'

export default function BrandMemoryPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Brand Memory" title="Brand Memory" description="Persistent brand identity, guidelines, and voice extracted from your website." />
      <SectionCard>
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="Brand Memory"
          description="Run the Marketing Workflow to extract and store your brand identity automatically."
          action={
            <Link href="/admin/dashboard/marketing" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/20">
              Go to Marketing
            </Link>
          }
        />
      </SectionCard>
    </div>
  )
}
