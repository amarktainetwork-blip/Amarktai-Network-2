import { AlertTriangle } from 'lucide-react'

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
      <AlertTriangle className="h-6 w-6 text-red-400" />
      <p className="text-sm font-bold text-red-300">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/15"
        >
          Retry
        </button>
      )}
    </div>
  )
}
