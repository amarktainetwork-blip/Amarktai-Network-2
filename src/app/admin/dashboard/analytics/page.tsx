import { TrendingUp } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Analytics" title="Campaign Analytics" description="Performance metrics for published campaigns." />
      <SectionCard>
        <EmptyState icon={<TrendingUp className="h-10 w-10" />} title="No analytics yet" description="Analytics appear after campaigns are published and data is collected." />
      </SectionCard>
    </div>
  )
}
