import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 24px',
        background: 'var(--paper)',
      }}
    >
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink-3)',
            marginBottom: 18,
          }}
        >
          404
        </div>
        <h1 className="display-lg" style={{ marginBottom: 16 }}>
          This page does not exist.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 28 }}>
          The link may be broken or the URL may have a typo.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/home" className="btn btn-pulp">
            Back to home
          </Link>
          <Link href="/search" className="btn btn-outline">
            Search books
          </Link>
          <Link href="/explore" className="btn btn-ghost">
            Explore
          </Link>
        </div>
      </div>
    </div>
  )
}
