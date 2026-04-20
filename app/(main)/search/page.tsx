'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import { searchBooks, toUiBook, type DbBookWithAuthors } from '@/lib/db'

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), [])
  const [q, setQ] = useState('')
  const [results, setResults] = useState<DbBookWithAuthors[]>([])
  const [loading, setLoading] = useState(true)

  // Initial load + debounced search on query change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const data = await searchBooks(supabase, q, 30)
      if (!cancelled) {
        setResults(data)
        setLoading(false)
      }
    }, q ? 180 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, supabase])

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

      {!q && (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Trending searches</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
            {['dark academia', 'hail mary', 'unreliable narrators', 'lit fiction', 'sci-fi', 'babel', 'donna tartt', 'klara'].map((t) => (
              <button key={t} className="chip" onClick={() => setQ(t)} style={{ cursor: 'pointer' }}>
                🔍 {t}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="eyebrow" style={{ marginBottom: 14 }}>
        {q ? (loading ? 'Searching…' : `Results for "${q}"`) : 'Recent books in catalog'}
      </div>

      {!loading && results.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          No books found. Try a different query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {results.map((b) => {
            const ui = toUiBook(b)
            return (
              <Link key={b.id} href={`/book/${b.id}`} style={{ textAlign: 'left', padding: 0 }}>
                <Cover book={ui} size="100%" style={{ width: '100%', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ui.author}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
