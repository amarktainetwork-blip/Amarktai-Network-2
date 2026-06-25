import { Monitor } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function AvatarsPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="Avatars" title="AI Avatars" description="Configure and generate AI avatar presenters for your content." />
      <SectionCard>
        <EmptyState icon={<Monitor className="h-10 w-10" />} title="No avatars configured" description="Avatar configuration and generation appear here." />
      </SectionCard>
    </div>
  )
}
