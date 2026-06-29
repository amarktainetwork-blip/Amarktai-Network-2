export function SectionPanel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5 ${className ?? ''}`}>
      <div className="mb-4">
        <h2 className="text-sm font-black text-white">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}
