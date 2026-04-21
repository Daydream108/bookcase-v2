'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  searchBooks,
  searchBookPosts,
  searchClubsByName,
  searchProfiles,
  searchTags,
  toUiBook,
  toUiUser,
  type DbBookPost,
  type DbBookWithAuthors,
  type DbClub,
  type DbProfile,
  type DbTag,
} from '@/lib/db'

type Tab = 'all' | 'books' | 'tags' | 'readers' | 'clubs' | 'threads'

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), [])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [books, setBooks] = useState<DbBookWithAuthors[]>([])
  const [tags, setTags] = useState<DbTag[]>([])
  const [readers, setReaders] = useState<DbProfile[]>([])
  const [clubs, setClubs] = useState<DbClub[]>([])
  const [threads, setThreads] = useState<DbBookPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const timeout = setTimeout(async () => {
      const [bookRows, tagRows, readerRows, clubRows, threadRows] = await Promise.all([
        searchBooks(supabase, q, 24),
        q ? searchTags(supabase, q, 12) : Promise.resolve([]),
        q ? searchProfiles(supabase, q, 12) : Promise.resolve([]),
        q ? searchClubsByName(supabase, q, 12) : Promise.resolve([]),
        q ? searchBookPosts(supabase, q, 10) : Promise.resolve([]),
      ])

      if (cancelled) return
      setBooks(bookRows)
      setTags(tagRows)
      setReaders(readerRows)
      setClubs(clubRows)
      setThreads(threadRows)
      setLoading(false)
    }, q ? 180 : 0)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [q, supabase])

  const counts = {
    books: books.length,
    tags: tags.length,
    readers: readers.length,
    clubs: clubs.length,
    threads: threads.length,
  }
  const total =
    counts.books + counts.tags + counts.readers + counts.clubs + counts.threads

  const showBooks = tab === 'all' || tab === 'books'
  const showTags = tab === 'all' || tab === 'tags'
  const showReaders = tab === 'all' || tab === 'readers'
  const showClubs = tab === 'all' || tab === 'clubs'
  const showThreads = tab === 'all' || tab === 'threads'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 40px' }}>
      <div
        className="card"
        style={{
          padding: 28,
          marginBottom: 24,
          background: 'linear-gradient(135deg, var(--paper), var(--pulp-soft))',
          border: '1px solid var(--pulp)',
          borderRadius: 28,
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--pulp-deep)' }}>
          Search
        </div>
        <h1 className="display-lg" style={{ marginBottom: 10 }}>
          Find
          <br />
          <i style={{ color: 'var(--pulp)' }}>anything.</i>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 20 }}>
          Search books, authors, moods, readers, clubs, and live threads without leaving the shelf.
        </p>

        <div style={{ position: 'relative' }}>
          <input
            autoFocus
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="books, authors, moods, readers, threads..."
            style={{
              width: '100%',
              padding: '18px 20px 18px 52px',
              fontSize: 17,
              border: '1px solid var(--border-2)',
              borderRadius: 99,
              background: 'var(--paper)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-3)',
            }}
          >
            <Icon name="search" size={20} />
          </div>
        </div>
      </div>

      {q && (
        <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'all' as const, label: 'All', n: total },
            { id: 'books' as const, label: 'Books', n: counts.books },
            { id: 'tags' as const, label: 'Vibes', n: counts.tags },
            { id: 'readers' as const, label: 'Readers', n: counts.readers },
            { id: 'clubs' as const, label: 'Clubs', n: counts.clubs },
            { id: 'threads' as const, label: 'Threads', n: counts.threads },
          ].map((item) => (
            <button
              key={item.id}
              className={'tab' + (tab === item.id ? ' active' : '')}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              <span
                className="mono"
                style={{ fontSize: 11, marginLeft: 4, color: 'var(--ink-4)' }}
              >
                {item.n}
              </span>
            </button>
          ))}
        </div>
      )}

      {!q && (
        <>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Trending searches
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
            {[
              'dark academia',
              'hail mary',
              'unreliable narrators',
              'lyrical fantasy',
              'sci-fi',
              'babel',
              'donna tartt',
              'club picks',
            ].map((term) => (
              <button
                key={term}
                className="chip"
                onClick={() => setQ(term)}
                style={{ cursor: 'pointer' }}
              >
                Search {term}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && q && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          Searching...
        </div>
      )}

      {!loading && q && total === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          Nothing found. Try a different query.
        </div>
      )}

      {showBooks && books.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {q ? `Books (${books.length})` : 'Recent books in catalog'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 16,
            }}
          >
            {books.map((book) => {
              const uiBook = toUiBook(book)
              return (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  style={{ textAlign: 'left', padding: 0, textDecoration: 'none', color: 'inherit' }}
                >
                  <Cover book={uiBook} size="100%" style={{ width: '100%', marginBottom: 8 }} />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{uiBook.author}</div>
                  {book.genres.length > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--pulp)',
                        marginTop: 4,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {book.genres[0].name}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {showTags && tags.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Vibes and tags ({tags.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {tags.map((tag) => (
              <button
                key={tag.id}
                className="chip"
                onClick={() => setQ(tag.name)}
                style={{
                  cursor: 'pointer',
                  paddingInline: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--pulp)', fontWeight: 600 }}>#{tag.name}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                  {tag.category}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showReaders && readers.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Readers ({readers.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {readers.map((profile) => {
              const uiUser = toUiUser(profile)
              return (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username ?? profile.id}`}
                  className="card"
                  style={{
                    padding: 14,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Avatar user={uiUser} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {uiUser.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>@{uiUser.handle}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {showClubs && clubs.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Clubs ({clubs.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className="card"
                style={{ padding: 16, textDecoration: 'none', color: 'inherit' }}
              >
                <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {club.name}
                </div>
                {club.description && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>
                    {club.description}
                  </p>
                )}
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>
                  {club.member_count ?? 0} members
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showThreads && threads.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Threads ({threads.length})
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {threads.map((thread) => {
              const uiUser = toUiUser(thread.profile)
              return (
                <Link
                  key={thread.id}
                  href={`/book/${thread.book_id}`}
                  className="card"
                  style={{
                    padding: 18,
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <Avatar user={uiUser} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      {thread.post_type} - @{uiUser.handle}
                      {thread.book ? ` - ${thread.book.title}` : ''}
                    </div>
                    <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>
                      {thread.title}
                    </div>
                    {thread.body && (
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-2)',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          marginBottom: 10,
                        }}
                      >
                        {thread.body}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: 14,
                        flexWrap: 'wrap',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                      }}
                    >
                      <span>Upvotes {thread.upvotes}</span>
                      <span>Comments {thread.comment_count ?? 0}</span>
                      <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
