import { Calendar } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function SchedulerPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Scheduler" title="Post Scheduler" description="Schedule posts and publishing runs across platforms." />
      <SectionCard>
        <EmptyState icon={<Calendar className="h-10 w-10" />} title="Scheduler" description="Publishing schedules for approved campaign items appear here." />
      </SectionCard>
    </div>
  )
}
