'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DbBookWithAuthors } from '@/lib/db'

export type ShelfBook = {
  id: string
  title: string
  author: string
  pages: number
  color: string
  publishedYear: number | null
  description: string | null
  genres: string[]
}

export type ShelfKey = 'reading' | 'to_read' | 'read' | 'dnf'

export type ShelfSource = {
  reading: ShelfBook[]
  to_read: ShelfBook[]
  read: ShelfBook[]
  dnf: ShelfBook[]
}

export const SHELF_LABELS: Record<ShelfKey, { label: string; note: string }> = {
  reading: { label: 'Currently reading', note: 'Open on the nightstand right now.' },
  to_read: { label: 'Want to read', note: 'The TBR, slightly aspirational.' },
  read: { label: 'Finished', note: "Dog-eared, done, still thinking about it." },
  dnf: { label: 'Did not finish', note: "Life's too short - back on the stack." },
}

function Spine({
  book,
  hovered,
  selected,
  onClick,
  onEnter,
  onLeave,
}: {
  book: ShelfBook
  hovered: boolean
  selected: boolean
  onClick: () => void
  onEnter: () => void
  onLeave: () => void
}) {
  const width = Math.max(26, Math.min(58, 22 + book.pages / 14))
  const height = 210
  const baseColor = book.color || '#8a5a3a'

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={`${book.title} by ${book.author}`}
      aria-pressed={selected}
      style={{
        width,
        height,
        background: `linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 8%, ${baseColor} 20%, ${baseColor} 80%, rgba(0,0,0,0.15) 92%, rgba(0,0,0,0.3) 100%)`,
        borderRadius: '2px 2px 1px 1px',
        cursor: 'pointer',
        position: 'relative',
        transform: selected ? 'translateY(-28px)' : hovered ? 'translateY(-14px)' : 'translateY(0)',
        transition: 'transform 0.28s cubic-bezier(.2,.8,.2,1), box-shadow 0.28s',
        boxShadow: selected
          ? '0 14px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
          : hovered
          ? '0 8px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        border: '1px solid rgba(0,0,0,0.2)',
        padding: 0,
      }}
    >
      <div style={{ position: 'absolute', top: 16, left: 4, right: 4, height: 1, background: 'rgba(0,0,0,0.25)' }} />
      <div style={{ position: 'absolute', top: 22, left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', bottom: 16, left: 4, right: 4, height: 1, background: 'rgba(0,0,0,0.25)' }} />
      <div style={{ position: 'absolute', bottom: 22, left: 4, right: 4, height: 1, background: 'rgba(255,255,255,0.1)' }} />

      <div
        style={{
          transform: 'rotate(-90deg)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display, serif)',
          fontSize: width > 40 ? 13 : 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'rgba(255,245,230,0.92)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          maxWidth: height - 40,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {book.title}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%) rotate(-90deg)',
          transformOrigin: 'center',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 8,
          color: 'rgba(255,245,230,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          whiteSpace: 'nowrap',
        }}
      >
        {(book.author.split(' ').slice(-1)[0] ?? '').slice(0, 12)}
      </div>
    </button>
  )
}

function ShelfRow({
  label,
  note,
  books,
  shelfIdx,
  hovered,
  selected,
  onSelect,
  onEnter,
  onLeave,
  picker,
  emptyHint,
}: {
  label: string
  note: string
  books: ShelfBook[]
  shelfIdx: number
  hovered: string | null
  selected: string | null
  onSelect: (id: string | null) => void
  onEnter: (id: string) => void
  onLeave: () => void
  picker?: React.ReactNode
  emptyHint?: string
}) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 20px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(255,245,230,0.55)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span style={{ color: 'rgba(255,245,230,0.8)' }}>Section {shelfIdx + 1}</span>
          {' '} - {label} - {books.length}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
          <span
            style={{
              fontStyle: 'italic',
              textTransform: 'none',
              letterSpacing: 0,
              fontFamily: 'var(--font-display, serif)',
              fontSize: 13,
              color: 'rgba(255,245,230,0.45)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {note}
          </span>
          {picker}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 28px', minHeight: 230, minWidth: 'max-content' }}>
            {books.length === 0 ? (
              <div
                style={{
                  width: 280,
                  height: 180,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'rgba(255,245,230,0.35)',
                  fontSize: 12,
                  fontStyle: 'italic',
                  fontFamily: 'var(--font-display, serif)',
                }}
              >
                {emptyHint ?? 'No books on this shelf yet.'}
              </div>
            ) : (
              <>
                {books.map((book) => (
                  <Spine
                    key={book.id}
                    book={book}
                    hovered={hovered === book.id}
                    selected={selected === book.id}
                    onClick={() => onSelect(selected === book.id ? null : book.id)}
                    onEnter={() => onEnter(book.id)}
                    onLeave={onLeave}
                  />
                ))}
                {books.length < 6 && (
                  <div
                    style={{
                      width: 40,
                      height: 180,
                      border: '1px dashed rgba(255,245,230,0.15)',
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'rgba(255,245,230,0.25)',
                      fontSize: 20,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    +
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          style={{
            height: 18,
            background: 'linear-gradient(180deg, #6d4a2e 0%, #5a3a22 40%, #3f2714 100%)',
            borderTop: '1px solid #8a5e3a',
            borderBottom: '1px solid #1e120a',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,220,180,0.15)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(0,0,0,0.08) 40px, rgba(0,0,0,0.08) 41px, transparent 41px, transparent 120px, rgba(255,220,180,0.04) 120px, rgba(255,220,180,0.04) 121px)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function Bookcase({
  ownerName,
  favorites,
  sources,
  editable,
  storageKey,
  defaultRow2 = 'reading',
  defaultRow3 = 'to_read',
}: {
  ownerName: string
  favorites: ShelfBook[]
  sources: ShelfSource
  editable: boolean
  storageKey: string
  defaultRow2?: ShelfKey
  defaultRow3?: ShelfKey
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [row2, setRow2] = useState<ShelfKey>(defaultRow2)
  const [row3, setRow3] = useState<ShelfKey>(defaultRow3)

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
      if (!raw) return
      const parsed = JSON.parse(raw) as { row2?: ShelfKey; row3?: ShelfKey }
      if (parsed.row2) setRow2(parsed.row2)
      if (parsed.row3) setRow3(parsed.row3)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const persist = (next: { row2?: ShelfKey; row3?: ShelfKey }) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ row2: next.row2 ?? row2, row3: next.row3 ?? row3 })
        )
      }
    } catch {
      /* ignore */
    }
  }

  const row2Books = sources[row2]
  const row3Books = sources[row3]

  const totalVolumes = useMemo(
    () => favorites.length + row2Books.length + row3Books.length,
    [favorites.length, row2Books.length, row3Books.length]
  )
  const selectedBook = useMemo(
    () => [...favorites, ...row2Books, ...row3Books].find((book) => book.id === selected) ?? null,
    [favorites, row2Books, row3Books, selected]
  )
  const selectedShelf = useMemo(() => {
    if (!selected) return null
    if (favorites.some((book) => book.id === selected)) return 'Favorites'
    if (row2Books.some((book) => book.id === selected)) return SHELF_LABELS[row2].label
    if (row3Books.some((book) => book.id === selected)) return SHELF_LABELS[row3].label
    return null
  }, [favorites, row2, row2Books, row3, row3Books, selected])

  const ShelfPicker = ({
    value,
    onChange,
    excluded,
  }: {
    value: ShelfKey
    onChange: (k: ShelfKey) => void
    excluded: ShelfKey
  }) => {
    if (!editable) return null
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ShelfKey)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          padding: '4px 8px',
          borderRadius: 6,
          background: 'rgba(255,245,230,0.06)',
          color: 'rgba(255,245,230,0.8)',
          border: '1px solid rgba(255,245,230,0.15)',
          cursor: 'pointer',
        }}
      >
        {(Object.keys(SHELF_LABELS) as ShelfKey[])
          .filter((key) => key !== excluded)
          .map((key) => (
            <option key={key} value={key} style={{ background: '#1a0f08', color: 'rgba(255,245,230,0.9)' }}>
              {SHELF_LABELS[key].label}
            </option>
          ))}
      </select>
    )
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="eyebrow">{ownerName}&apos;s bookcase - {totalVolumes} volumes</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          Hover a spine to pull it out. Tap to inspect.
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, #2a1a10 0%, #1a0f08 100%)',
          padding: '28px 24px 10px',
          borderRadius: 8,
          border: '1px solid #0a0604',
          boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '6px 8px',
            borderRadius: 4,
            background: 'radial-gradient(ellipse at center, #3a2818 0%, #1a0f08 100%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <ShelfRow
            label="Favorites"
            note="The ones I&apos;d hand to a stranger."
            books={favorites}
            shelfIdx={0}
            hovered={hovered}
            selected={selected}
            onSelect={setSelected}
            onEnter={setHovered}
            onLeave={() => setHovered(null)}
            emptyHint={editable ? 'Pin favorites below to fill this shelf.' : 'No favorites pinned.'}
          />
          <ShelfRow
            label={SHELF_LABELS[row2].label}
            note={SHELF_LABELS[row2].note}
            books={row2Books}
            shelfIdx={1}
            hovered={hovered}
            selected={selected}
            onSelect={setSelected}
            onEnter={setHovered}
            onLeave={() => setHovered(null)}
            picker={
              <ShelfPicker
                value={row2}
                excluded={row3}
                onChange={(key) => {
                  setRow2(key)
                  persist({ row2: key })
                }}
              />
            }
          />
          <ShelfRow
            label={SHELF_LABELS[row3].label}
            note={SHELF_LABELS[row3].note}
            books={row3Books}
            shelfIdx={2}
            hovered={hovered}
            selected={selected}
            onSelect={setSelected}
            onEnter={setHovered}
            onLeave={() => setHovered(null)}
            picker={
              <ShelfPicker
                value={row3}
                excluded={row2}
                onChange={(key) => {
                  setRow3(key)
                  persist({ row3: key })
                }}
              />
            }
          />
        </div>

        <div
          style={{
            height: 8,
            margin: '4px -24px -10px',
            background: 'linear-gradient(180deg, #1a0f08 0%, #000 100%)',
            borderTop: '1px solid #0a0604',
          }}
        />
      </div>

      {selectedBook && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 104,
              minWidth: 104,
              aspectRatio: '2 / 3',
              borderRadius: 10,
              background: `linear-gradient(135deg, ${selectedBook.color}, rgba(0,0,0,0.85))`,
              boxShadow: '0 12px 20px rgba(0,0,0,0.16)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: 'rgba(255,245,230,0.96)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display, serif)', fontSize: 18, lineHeight: 1.05 }}>
              {selectedBook.title}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 10,
                opacity: 0.8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {selectedBook.author}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Pulled from the shelf{selectedShelf ? ` - ${selectedShelf}` : ''}
            </div>
            <h3 className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 6 }}>
              {selectedBook.title}
            </h3>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 12 }}>
              {selectedBook.author}
              {selectedBook.publishedYear ? ` - ${selectedBook.publishedYear}` : ''}
              {selectedBook.pages ? ` - ${selectedBook.pages} pages` : ''}
            </div>
            {selectedBook.description && (
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 12 }}>
                {selectedBook.description}
              </p>
            )}
            {selectedBook.genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedBook.genres.slice(0, 4).map((genre) => (
                  <span key={genre} className="chip">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={`/book/${selectedBook.id}`} className="btn btn-pulp btn-sm">
                Open book page
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Put back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function toShelfBook(row: { book: DbBookWithAuthors | null } | null | undefined): ShelfBook | null {
  if (!row?.book) return null
  const book = row.book
  const author = book.authors?.map((entry) => entry.name).join(', ') || 'Unknown'

  return {
    id: book.id,
    title: book.title,
    author,
    pages: book.page_count ?? 280,
    color: spineColor(book.id),
    publishedYear: book.published_year ?? null,
    description: book.description ?? null,
    genres: book.genres?.map((genre) => genre.name) ?? [],
  }
}

function spineColor(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  const palette = [
    '#8a3a2e', '#6d4a2e', '#3a5a3e', '#2e4a6a', '#5a2e4a',
    '#7a5a2e', '#3a3a5a', '#6a3a3a', '#4a6a4e', '#2e4a4a',
    '#8a5a3a', '#5a3a22', '#3f2714', '#5a4a2e', '#7a3a6a',
  ]
  return palette[hash % palette.length]
}
