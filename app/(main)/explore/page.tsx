'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Cover } from '@/components/redesign/Cover'
import { StateCard } from '@/components/redesign/StateCard'
import { listPopularBooks, toUiBook, type DbBookCard } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'

const popularGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 176px))',
  gap: '22px 18px',
  justifyContent: 'start',
  alignItems: 'start',
  marginBottom: 40,
}

const genreGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 150px))',
  gap: '18px 14px',
  justifyContent: 'start',
  alignItems: 'start',
}

const popularCardStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: 176,
  textAlign: 'left',
  padding: 0,
}

const genreCardStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: 150,
}

export default function ExplorePage() {
  const supabase = useMemo(() => createClient(), [])
  const [books, setBooks] = useState<DbBookCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setError('')
        const data = await listPopularBooks(supabase, 24)
        if (cancelled) return
        setBooks(data)
      } catch (caughtError) {
        if (cancelled) return
        setBooks([])
        setError(caughtError instanceof Error ? caughtError.message : 'Could not load explore right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const genreBuckets = useMemo(() => {
    const map = new Map<string, DbBookCard[]>()
    for (const book of books) {
      for (const genre of book.genres) {
        if (!map.has(genre.name)) map.set(genre.name, [])
        map.get(genre.name)!.push(book)
      }
    }
    return [...map.entries()].slice(0, 6)
  }, [books])

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Explore
      </div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>
        Find your
        <br />
        <i style={{ color: 'var(--pulp)' }}>next book.</i>
      </h1>
      <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 32, maxWidth: 640 }}>
        Browse books people are rating on Bookcase.
      </p>

      <div className="eyebrow" style={{ marginBottom: 14 }}>
        Popular on Bookcase
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          Loading...
        </div>
      ) : error ? (
        <StateCard
          icon="compass"
          title="Explore is taking a beat"
          body={error}
          actionHref="/search"
          actionLabel="Search instead"
        />
      ) : books.length === 0 ? (
        <StateCard
          icon="book"
          title="Nothing is trending yet"
          body="Import a few books, rate them, and this page will start to feel alive."
          actionHref="/search"
          actionLabel="Find books"
        />
      ) : (
        <div style={popularGridStyle}>
          {books.slice(0, 12).map((book) => {
            const uiBook = toUiBook(book, book.stats)
            return (
              <Link key={book.id} href={`/book/${book.id}`} style={popularCardStyle}>
                <Cover book={uiBook} size="100%" style={{ width: '100%', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {book.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uiBook.author}
                </div>
                {book.stats.avg_rating !== null && (
                  <div style={{ fontSize: 12, color: 'var(--pulp)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {book.stats.avg_rating.toFixed(1)} / {book.stats.rating_count} ratings
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {genreBuckets.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            By genre
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {genreBuckets.map(([genre, list]) => (
              <div key={genre}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 className="display-sm" style={{ fontSize: 22 }}>
                    {genre}
                  </h2>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {list.length} books
                  </span>
                </div>
                <div style={genreGridStyle}>
                  {list.slice(0, 6).map((book) => {
                    const uiBook = toUiBook(book, book.stats)
                    return (
                      <Link key={book.id} href={`/book/${book.id}`} style={genreCardStyle}>
                        <Cover book={uiBook} size="100%" style={{ width: '100%', marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.title}
                        </div>
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
