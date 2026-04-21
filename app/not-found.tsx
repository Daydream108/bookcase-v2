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
          404 - off the shelf
        </div>
        <h1 className="display-lg" style={{ marginBottom: 16 }}>
          This page isn&apos;t on any of our shelves.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 28 }}>
          The link you followed is broken, the book was removed, or the URL has a typo. Pick a
          direction below and keep reading.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/home" className="btn btn-pulp">
            Back to home
          </Link>
          <Link href="/search" className="btn btn-outline">
            Search books
          </Link>
          <Link href="/explore" className="btn btn-ghost">
            Browse explore
          </Link>
        </div>
      </div>
    </div>
  )
}
