'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  searchBooks,
  searchClubsByName,
  searchProfiles,
  toUiBook,
  toUiUser,
  type DbBookWithAuthors,
  type DbClub,
  type DbProfile,
} from '@/lib/db'

type Tab = 'all' | 'books' | 'readers' | 'clubs'

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), [])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [books, setBooks] = useState<DbBookWithAuthors[]>([])
  const [readers, setReaders] = useState<DbProfile[]>([])
  const [clubs, setClubs] = useState<DbClub[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const [b, r, c] = await Promise.all([
        searchBooks(supabase, q, 24),
        q ? searchProfiles(supabase, q, 12) : Promise.resolve([]),
        q ? searchClubsByName(supabase, q, 12) : Promise.resolve([]),
      ])
      if (cancelled) return
      setBooks(b)
      setReaders(r)
      setClubs(c)
      setLoading(false)
    }, q ? 180 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, supabase])

  const counts = { books: books.length, readers: readers.length, clubs: clubs.length }
  const total = counts.books + counts.readers + counts.clubs

  const showBooks = tab === 'all' || tab === 'books'
  const showReaders = tab === 'all' || tab === 'readers'
  const showClubs = tab === 'all' || tab === 'clubs'

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Search</div>
      <h1 className="display-lg" style={{ marginBottom: 24 }}>
        Find<br />
        <i style={{ color: 'var(--pulp)' }}>anything.</i>
      </h1>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="books, authors, readers, clubs…"
          style={{ width: '100%', padding: '18px 20px 18px 52px', fontSize: 17, border: '1px solid var(--border-2)', borderRadius: 99, background: 'var(--paper)' }}
        />
        <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
          <Icon name="search" size={20} />
        </div>
      </div>

      {q && (
        <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all' as const, label: 'All', n: total },
              { id: 'books' as const, label: 'Books', n: counts.books },
              { id: 'readers' as const, label: 'Readers', n: counts.readers },
              { id: 'clubs' as const, label: 'Clubs', n: counts.clubs },
            ]
          ).map((t) => (
            <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              {t.label} <span className="mono" style={{ fontSize: 11, marginLeft: 4, color: 'var(--ink-4)' }}>{t.n}</span>
            </button>
          ))}
        </div>
      )}

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

      {loading && q && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Searching…</div>
      )}

      {!loading && q && total === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          Nothing found. Try a different query.
        </div>
      )}

      {showBooks && books.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {q ? `📚 Books (${books.length})` : 'Recent books in catalog'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {books.map((b) => {
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
        </section>
      )}

      {showReaders && readers.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>👥 Readers ({readers.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {readers.map((p) => {
              const ui = toUiUser(p)
              return (
                <Link key={p.id} href={`/profile/${p.username ?? p.id}`} className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar user={ui} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ui.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>@{ui.handle}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {showClubs && clubs.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>🏛 Clubs ({clubs.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {clubs.map((c) => (
              <Link key={c.id} href={`/clubs/${c.id}`} className="card" style={{ padding: 16 }}>
                <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                {c.description && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>{c.description}</p>
                )}
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>
                  {c.member_count ?? 0} members
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
