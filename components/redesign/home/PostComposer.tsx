'use client'

import { useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { CatalogBookPickerModal } from '@/components/redesign/CatalogBookPickerModal'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  createBookPost,
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
  const [book, setBook] = useState<DbBookWithAuthors | null>(null)
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
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
      onPosted?.()
    } catch (nextError: unknown) {
      setErr((nextError as Error).message || 'Could not post')
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
            onChange={(event) => setTitle(event.target.value)}
            placeholder={me ? 'what are you reading? drop a hot take...' : 'sign in to post a thread'}
            disabled={!me}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              fontWeight: 500,
            }}
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="(optional) more thoughts..."
            rows={2}
            disabled={!me}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'inherit',
              color: 'var(--ink-2)',
            }}
          />

          {book && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: 'var(--paper-2)',
              }}
            >
              <Cover book={toUiBook(book)} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
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
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{toUiBook(book).author}</div>
              </div>
              <button
                type="button"
                onClick={() => setBook(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-3)',
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          {err && <div style={{ fontSize: 12, color: 'var(--blush, #c0392b)' }}>{err}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!book && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPickerOpen(true)}
                disabled={!me}
              >
                <Icon name="book" size={14} /> Pick book
              </button>
            )}
            <button
              type="submit"
              className="btn btn-pulp btn-sm"
              style={{ marginLeft: 'auto' }}
              disabled={!me || posting}
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <CatalogBookPickerModal
          title="Pick a book for this thread"
          localActionLabel="Use book"
          onSelect={(selectedBook) => {
            setBook(selectedBook)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </form>
  )
}
