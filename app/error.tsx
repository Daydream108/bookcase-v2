'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('app error boundary caught:', error)
  }, [error])

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
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--pulp)',
            marginBottom: 18,
          }}
        >
          Error
        </div>
        <h1 className="display-lg" style={{ marginBottom: 16 }}>
          Something went wrong.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 22 }}>
          Try again, go home, or search for a book.
        </p>
        {error.digest && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-4)',
              marginBottom: 22,
              letterSpacing: '0.05em',
            }}
          >
            ref: {error.digest}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-pulp" onClick={reset}>
            Try again
          </button>
          <Link href="/home" className="btn btn-outline">
            Back to home
          </Link>
          <Link href="/search" className="btn btn-ghost">
            Search
          </Link>
        </div>
      </div>
    </div>
  )
}
