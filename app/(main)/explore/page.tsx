'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Cover } from '@/components/redesign/Cover'
import { createClient } from '@/lib/supabase/client'
import { listPopularBooks, toUiBook, type DbBookCard } from '@/lib/db'

export default function ExplorePage() {
  const supabase = useMemo(() => createClient(), [])
  const [books, setBooks] = useState<DbBookCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await listPopularBooks(supabase, 24)
      if (cancelled) return
      setBooks(data)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const genreBuckets = useMemo(() => {
    const map = new Map<string, DbBookCard[]>()
    for (const b of books) {
      for (const g of b.genres) {
        if (!map.has(g.name)) map.set(g.name, [])
        map.get(g.name)!.push(b)
      }
    }
    return [...map.entries()].slice(0, 6)
  }, [books])

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Discovery desk</div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Find your<br />
        <i style={{ color: 'var(--pulp)' }}>next obsession.</i>
      </h1>
      <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 32, maxWidth: 640 }}>
        Browse the most-rated books, ordered by the readers on Bookcase right now.
      </p>

      <div className="eyebrow" style={{ marginBottom: 14 }}>🔥 Popular on Bookcase</div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
      ) : books.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          No books in the catalog yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 40 }}>
          {books.slice(0, 12).map((b) => {
            const ui = toUiBook(b, b.stats)
            return (
              <Link key={b.id} href={`/book/${b.id}`} style={{ textAlign: 'left', padding: 0 }}>
                <Cover book={ui} size="100%" style={{ width: '100%', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ui.author}
                </div>
                {b.stats.avg_rating !== null && (
                  <div style={{ fontSize: 12, color: 'var(--pulp)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    ★ {b.stats.avg_rating.toFixed(1)} · {b.stats.rating_count}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {genreBuckets.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>📚 By genre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {genreBuckets.map(([genre, list]) => (
              <div key={genre}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 className="display-sm" style={{ fontSize: 22 }}>{genre}</h2>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{list.length} books</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                  {list.slice(0, 6).map((b) => {
                    const ui = toUiBook(b, b.stats)
                    return (
                      <Link key={b.id} href={`/book/${b.id}`}>
                        <Cover book={ui} size="100%" style={{ width: '100%', marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
