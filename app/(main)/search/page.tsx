'use client'

import Link from 'next/link'
import { useState } from 'react'
import { books } from '@/lib/redesign-data'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'

export default function SearchPage() {
  const [q, setQ] = useState('')

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Search</div>
      <h1 className="display-lg" style={{ marginBottom: 24 }}>
        Find<br />
        <i style={{ color: 'var(--pulp)' }}>anything.</i>
      </h1>

      <div style={{ position: 'relative', marginBottom: 30 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="books, authors, moods, readers, threads…"
          style={{ width: '100%', padding: '18px 20px 18px 52px', fontSize: 17, border: '1px solid var(--border-2)', borderRadius: 99, background: 'var(--paper)' }}
        />
        <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
          <Icon name="search" size={20} />
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 14 }}>Trending searches</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
        {['dark academia', 'rocky (hail mary)', 'unreliable narrators', 'short lit fiction', 'sci-fi that cries', 'babel rf kuang', 'donna tartt', 'booktok 2026'].map((t) => (
          <button key={t} className="chip" onClick={() => setQ(t)} style={{ cursor: 'pointer' }}>
            🔍 {t}
          </button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 14 }}>Recent books in catalog</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {books.slice(0, 10).map((b) => (
          <Link key={b.id} href={`/book/${b.id}`} style={{ textAlign: 'left', padding: 0 }}>
            <Cover book={b} size="100%" style={{ width: '100%', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{b.author}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
