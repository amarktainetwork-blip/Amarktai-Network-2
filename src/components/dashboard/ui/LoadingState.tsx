import { Loader2 } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}
