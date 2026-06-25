import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
      <span className="text-slate-600">{icon ?? <Inbox className="h-8 w-8" />}</span>
      <p className="font-black text-slate-300">{title}</p>
      {description && <p className="max-w-xs text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
