'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cover } from '@/components/redesign/Cover'
import { createClient } from '@/lib/supabase/client'
import {
  importCatalogBook,
  searchBooks,
  toUiBook,
  type DbBookWithAuthors,
} from '@/lib/db'
import {
  catalogFormatLabel,
  catalogFormatTags,
  type OpenLibrarySearchResult,
} from '@/lib/openlibrary'

type CatalogBookPickerModalProps = {
  title: string
  onClose: () => void
  onSelect: (book: DbBookWithAuthors) => Promise<void> | void
  queryPlaceholder?: string
  localActionLabel?: string
}

export function CatalogBookPickerModal({
  title,
  onClose,
  onSelect,
  queryPlaceholder = 'Search by title, author, or series',
  localActionLabel = 'Select',
}: CatalogBookPickerModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState('')
  const [localResults, setLocalResults] = useState<DbBookWithAuthors[]>([])
  const [broaderResults, setBroaderResults] = useState<OpenLibrarySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    const trimmed = query.trim()

    if (!trimmed) {
      setLocalResults([])
      setBroaderResults([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    const handle = window.setTimeout(async () => {
      try {
        const [local, broader] = await Promise.all([
          searchBooks(supabase, trimmed, 20),
          fetchBroaderCatalog(trimmed, 12),
        ])

        if (cancelled) return
        setLocalResults(local)
        setBroaderResults(filterBroaderCatalogResults(broader, local))
      } catch (nextError) {
        if (cancelled) return
        setLocalResults([])
        setBroaderResults([])
        setError((nextError as Error).message || 'Search failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, supabase])

  const selectLocalBook = async (book: DbBookWithAuthors) => {
    setWorkingId(book.id)
    try {
      await onSelect(book)
    } finally {
      setWorkingId(null)
    }
  }

  const importBroaderBook = async (book: OpenLibrarySearchResult) => {
    setWorkingId(book.sourceId)
    try {
      const imported = await importCatalogBook(supabase, {
        title: book.title,
        subtitle: book.subtitle,
        authors: book.authors,
        isbns: book.isbns,
        coverUrl: book.coverUrl,
        publishedYear: book.publishedYear,
        pageCount: book.pageCount,
        languageCode: book.languageCodes[0] ?? null,
        tagNames: catalogFormatTags(book.format),
      })

      await onSelect(imported.book)
    } catch (nextError) {
      setError((nextError as Error).message || 'Could not import that book')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 120,
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="card"
        style={{
          width: 720,
          maxWidth: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Search Bookcase first, then pull from Open Library when a title is missing.
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={queryPlaceholder}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            fontSize: 14,
            marginBottom: 14,
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: 'var(--danger, #c0392b)', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <div style={{ overflowY: 'auto', display: 'grid', gap: 18, flex: 1, paddingRight: 4 }}>
          {!query.trim() && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              Start typing to search your catalog and the wider library.
            </div>
          )}

          {loading && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Searching...</div>}

          {!loading && query.trim() && localResults.length === 0 && broaderResults.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              No matches yet. Try a title, author, series, or ISBN.
            </div>
          )}

          {localResults.length > 0 && (
            <section>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                In Bookcase ({localResults.length})
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {localResults.map((book) => {
                  const uiBook = toUiBook(book)
                  const isWorking = workingId === book.id
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => selectLocalBook(book)}
                      disabled={Boolean(workingId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--paper)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Cover book={uiBook} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {book.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-3)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {uiBook.author}
                          {book.published_year ? ` - ${book.published_year}` : ''}
                        </div>
                      </div>
                      <span className="btn btn-outline btn-sm">
                        {isWorking ? 'Saving...' : localActionLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {broaderResults.length > 0 && (
            <section>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Broader catalog ({broaderResults.length})
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {broaderResults.map((book) => {
                  const isWorking = workingId === book.sourceId
                  const coverBook = {
                    id: book.sourceId,
                    title: book.title,
                    author: book.authors.join(', ') || 'Unknown',
                    cover: book.coverUrl ?? '',
                    rating: 0,
                    ratings: 0,
                    mood: [] as string[],
                    genre: '',
                    pages: book.pageCount ?? 0,
                    year: book.publishedYear ?? 0,
                    color: 'oklch(36% 0.08 40)',
                  }

                  return (
                    <div
                      key={book.sourceId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--paper)',
                      }}
                    >
                      <Cover book={coverBook} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {book.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-3)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {book.authors.join(', ') || 'Unknown author'}
                          {book.publishedYear ? ` - ${book.publishedYear}` : ''}
                        </div>
                        {book.format !== 'book' && (
                          <div
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--pulp)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              marginTop: 4,
                            }}
                          >
                            {catalogFormatLabel(book.format)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-pulp btn-sm"
                        disabled={Boolean(workingId)}
                        onClick={() => importBroaderBook(book)}
                      >
                        {isWorking ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

async function fetchBroaderCatalog(query: string, limit = 12) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })
  const response = await fetch(`/api/catalog/search?${params.toString()}`)

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not search the wider catalog right now.')
  }

  const payload = (await response.json()) as { results?: OpenLibrarySearchResult[] }
  return payload.results ?? []
}

function filterBroaderCatalogResults(
  broaderBooks: OpenLibrarySearchResult[],
  localBooks: DbBookWithAuthors[]
) {
  const localIsbns = new Set(
    localBooks
      .map((book) => normalizeSearchValue(book.isbn))
      .filter(Boolean) as string[]
  )
  const localKeys = new Set(
    localBooks.map((book) =>
      buildSearchBookKey(book.title, book.authors.map((author) => author.name))
    )
  )

  return broaderBooks.filter((book) => {
    const hasMatchingIsbn = book.isbns.some((isbn) => localIsbns.has(normalizeSearchValue(isbn)))
    if (hasMatchingIsbn) return false
    return !localKeys.has(buildSearchBookKey(book.title, book.authors))
  })
}

function buildSearchBookKey(title: string, authors: string[]) {
  return `${normalizeSearchValue(title)}|${authors
    .map(normalizeSearchValue)
    .filter(Boolean)
    .sort()
    .join('|')}`
}

function normalizeSearchValue(value: string | null | undefined) {
  return (
    value
      ?.toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || ''
  )
}
