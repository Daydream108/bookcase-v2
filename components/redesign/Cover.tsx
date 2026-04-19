'use client'

import { useState, CSSProperties } from 'react'
import type { Book } from '@/lib/redesign-data'

export function Cover({
  book,
  size = 100,
  style,
  className = '',
}: {
  book: Book
  size?: number | string
  style?: CSSProperties
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const isSmall = typeof size === 'number' && size < 80

  return (
    <div
      className={'cover ' + className}
      style={{ width: size, ...style, background: err ? book.color : undefined }}
    >
      {!err && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover}
          alt={book.title}
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity .3s' }}
        />
      )}
      {err && (
        <div
          style={{
            padding: isSmall ? 6 : 10,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            color: 'white',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isSmall ? 11 : 14,
              lineHeight: 1.1,
              fontWeight: 400,
            }}
          >
            {book.title}
          </div>
          <div
            style={{
              fontSize: isSmall ? 8 : 10,
              opacity: 0.7,
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {book.author}
          </div>
        </div>
      )}
    </div>
  )
}
