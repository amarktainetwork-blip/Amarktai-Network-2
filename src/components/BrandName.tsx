export default function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={className} aria-label="AmarktAI">
      Amarkt<span className="text-cyan-400">AI</span>
    </span>
  )
}
