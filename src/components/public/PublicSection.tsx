export function SectionWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`px-4 py-16 sm:px-6 lg:px-8 ${className}`}>{children}</section>
}

export function SectionInner({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl ${className}`}>{children}</div>
}

export function SurfaceCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 backdrop-blur-xl ${className}`}>{children}</article>
}
