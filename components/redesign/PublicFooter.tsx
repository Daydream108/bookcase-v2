import Link from 'next/link'

export function PublicFooter({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: compact ? '24px 24px 32px' : '40px 24px',
        background: 'color-mix(in oklab, var(--paper) 92%, white)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) repeat(3, minmax(160px, 0.6fr))',
          gap: 20,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
            Bookcase
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 420 }}>
            Social reading for people who want one place for shelves, reviews, threads, clubs, and a real reading streak.
          </div>
        </div>

        <FooterGroup
          title="Product"
          links={[
            { href: '/search', label: 'Search' },
            { href: '/explore', label: 'Explore' },
            { href: '/clubs', label: 'Clubs' },
            { href: '/roadmap', label: 'Roadmap' },
          ]}
        />
        <FooterGroup
          title="Account"
          links={[
            { href: '/signup', label: 'Create account' },
            { href: '/login', label: 'Sign in' },
            { href: '/import', label: 'Import Goodreads' },
            { href: '/settings', label: 'Settings' },
          ]}
        />
        <FooterGroup
          title="Legal"
          links={[
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
            { href: '/safety', label: 'Safety tools' },
          ]}
        />
      </div>
    </footer>
  )
}

function FooterGroup({
  title,
  links,
}: {
  title: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="link-u" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
