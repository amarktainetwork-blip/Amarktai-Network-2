import Link from 'next/link'

const links = [
  { href: '/', label: 'Platform' },
  { href: '/about', label: 'Aiva' },
  { href: '/apps', label: 'Ecosystem' },
  { href: '/contact', label: 'Request Access' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#020711]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-2xl font-black tracking-[-0.04em] text-white">
              Amarkt<span className="text-blue-400">AI</span> Network
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              A private AI operating ecosystem for apps, agents, memory, media, code, research and approval-gated autonomy.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Footer navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-500 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t border-white/10 pt-5 text-xs text-slate-600">
          © {new Date().getFullYear()} Amarkt<span className="text-blue-400/70">AI</span> Network. Invite-only access.
        </div>
      </div>
    </footer>
  )
}
