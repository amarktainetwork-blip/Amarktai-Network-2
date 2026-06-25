import { Database } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard } from '@/components/dashboard/ui'

export default function RagPage() {
  return (
    <div className="space-y-5">
      <PageHeader label="RAG" title="Retrieval-Augmented Generation" description="Knowledge base powered by HuggingFace embeddings and Qdrant vector store." />
      <SectionCard>
        <EmptyState icon={<Database className="h-10 w-10" />} title="Knowledge Base" description="Documents and website content ingested for RAG retrieval appear here." />
      </SectionCard>
    </div>
  )
}
