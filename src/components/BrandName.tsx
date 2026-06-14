export default function BrandName({
  className = '',
  network = true,
}: {
  className?: string
  network?: boolean
}) {
  return (
    <span className={className} aria-label={network ? 'AmarktAI Network' : 'AmarktAI'}>
      Amarkt<span className="text-cyan-400">AI</span>{network ? ' Network' : ''}
    </span>
  )
}
