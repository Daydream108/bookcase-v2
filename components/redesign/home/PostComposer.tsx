'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  createBookPost,
  searchBooks,
  toUiBook,
  toUiUser,
  type DbBookWithAuthors,
  type DbProfile,
} from '@/lib/db'

export function PostComposer({
  me,
  onPosted,
}: {
  me: DbProfile | null
  onPosted?: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<DbBookWithAuthors[]>([])
  const [book, setBook] = useState<DbBookWithAuthors | null>(null)
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!picking) return
    let cancelled = false
    const t = setTimeout(async () => {
      const data = await searchBooks(supabase, q, 8)
      if (!cancelled) setResults(data)
    }, q ? 180 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [picking, q, supabase])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!me) return setErr('Sign in to post')
    if (!book) return setErr('Pick a book for your post')
    if (!title.trim()) return setErr('Add a title')
    setPosting(true)
    try {
      await createBookPost(supabase, { bookId: book.id, title, body })
      setTitle('')
      setBody('')
      setBook(null)
      setQ('')
      setResults([])
      onPosted?.()
    } catch (e: unknown) {
      setErr((e as Error).message || 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  const ui = toUiUser(me)

  return (
    <form onSubmit={submit} className="card" style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar user={ui} size={36} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={me ? 'what are you reading? drop a hot take…' : 'sign in to post a thread'}
            disabled={!me}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 500 }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="(optional) more thoughts…"
            rows={2}
            disabled={!me}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: 'var(--ink-2)' }}
          />

          {book ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper-2)' }}>
              <Cover book={toUiBook(book)} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{toUiBook(book).author}</div>
              </div>
              <button type="button" onClick={() => setBook(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : picking ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'var(--paper-2)' }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search books…"
                style={{ width: '100%', padding: '6px 8px', border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {results.map((b) => {
                  const ui = toUiBook(b)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setBook(b); setPicking(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                    >
                      <Cover book={ui} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{ui.author}</div>
                      </div>
                    </button>
                  )
                })}
                {!results.length && q && (
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--ink-3)' }}>No matches.</div>
                )}
              </div>
            </div>
          ) : null}

          {err && <div style={{ fontSize: 12, color: 'var(--blush, #c0392b)' }}>{err}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!book && !picking && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)} disabled={!me}>
                <Icon name="book" size={14} /> Pick book
              </button>
            )}
            <button type="submit" className="btn btn-pulp btn-sm" style={{ marginLeft: 'auto' }} disabled={!me || posting}>
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
