import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--paper)' }}>
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--ink)',
              color: 'var(--paper)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              boxShadow: 'inset 0 0 0 2px var(--pulp)',
            }}
          >
            B
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em' }}>
            Bookcase
          </div>
        </Link>

        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>{children}</div>
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, var(--pulp-soft), var(--paper-2))',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderLeft: '1px solid var(--border)',
        }}
      >
        <div className="eyebrow" style={{ color: 'var(--pulp-deep)', marginBottom: 14 }}>
          Bookcase
        </div>
        <h2 className="display-md" style={{ marginBottom: 16 }}>
          Read with
          <br />
          <i style={{ color: 'var(--pulp)' }}>other people.</i>
        </h2>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 420 }}>
          Track books, post reviews, join clubs, and keep your reading history in one place.
        </p>
      </div>
    </div>
  )
}
