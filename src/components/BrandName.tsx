export default function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      Amarkt<span data-brand-ai="true" className="text-cyan-400">AI</span> Network
    </span>
  )
}
