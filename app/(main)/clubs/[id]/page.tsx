'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { ReportButton } from '@/components/redesign/ReportButton'
import { StateCard } from '@/components/redesign/StateCard'
import { createClient } from '@/lib/supabase/client'
import {
  addClubPastBook,
  deleteClubPost,
  getClub,
  getCurrentProfile,
  joinClub,
  leaveClub,
  listClubBooks,
  listClubPosts,
  postToClub,
  removeClubBook,
  searchBooks,
  setClubPostPinned,
  toUiBook,
  toUiUser,
  updateClub,
  updateClubPost,
  type DbBookWithAuthors,
  type DbClub,
  type DbClubBook,
  type DbClubPost,
  type DbProfile,
} from '@/lib/db'

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [club, setClub] = useState<DbClub | null>(null)
  const [posts, setPosts] = useState<DbClubPost[]>([])
  const [clubBooks, setClubBooks] = useState<DbClubBook[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [bookFilter, setBookFilter] = useState<string | 'all'>('all')

  const getDraftKey = (postId: string | null) =>
    me ? `bookcase:club-post-draft:${me.id}:${id}:${postId ?? 'new'}` : null

  const clearDraft = (postId: string | null = editingPostId) => {
    const key = getDraftKey(postId)
    if (!key || typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  }

  const load = async () => {
    const [profile, clubRow, postRows, bookRows] = await Promise.all([
      getCurrentProfile(supabase),
      getClub(supabase, id),
      listClubPosts(supabase, id, 40),
      listClubBooks(supabase, id),
    ])
    setMe(profile)
    setClub(clubRow)
    setPosts(postRows)
    setClubBooks(bookRows)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [profile, clubRow, postRows, bookRows] = await Promise.all([
        getCurrentProfile(supabase),
        getClub(supabase, id),
        listClubPosts(supabase, id, 40),
        listClubBooks(supabase, id),
      ])
      if (cancelled) return
      setMe(profile)
      setClub(clubRow)
      setPosts(postRows)
      setClubBooks(bookRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, supabase])

  useEffect(() => {
    const draftKey = getDraftKey(editingPostId)
    if (!draftKey || typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as { title?: string; body?: string }
      setTitle(draft.title ?? '')
      setBody(draft.body ?? '')
    } catch {
      /* ignore bad drafts */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPostId, me?.id, id])

  useEffect(() => {
    const draftKey = getDraftKey(editingPostId)
    if (!draftKey || typeof window === 'undefined') return

    if (!title.trim() && !body.trim()) {
      window.localStorage.removeItem(draftKey)
      return
    }

    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          title,
          body,
        })
      )
    } catch {
      /* ignore local draft failures */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, editingPostId, me?.id, id])

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>
  }

  if (!club) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">Club not found</h1>
        <Link href="/clubs" className="btn btn-outline" style={{ marginTop: 16 }}>
          Back to clubs
        </Link>
      </div>
    )
  }

  const currentBook = club.current_book ? toUiBook(club.current_book) : null
  const isOwner = me?.id === club.owner_id
  const pastBooks = clubBooks.filter((cb) => cb.status === 'past')
  const visiblePosts =
    bookFilter === 'all' ? posts : posts.filter((post) => post.book_id === bookFilter)

  const resetComposer = (options?: { keepMessage?: boolean }) => {
    clearDraft()
    setEditingPostId(null)
    setTitle('')
    setBody('')
    if (!options?.keepMessage) setMessage('')
  }

  const startEditingPost = (post: DbClubPost) => {
    setEditingPostId(post.id)
    const draftKey = getDraftKey(post.id)
    if (draftKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(draftKey)
        if (raw) {
          const draft = JSON.parse(raw) as { title?: string; body?: string }
          setTitle(draft.title ?? post.title)
          setBody(draft.body ?? post.body)
          setMessage('Loaded saved draft for this post')
          return
        }
      } catch {
        /* ignore bad drafts */
      }
    }
    setTitle(post.title)
    setBody(post.body)
    setMessage('Editing post')
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 40px' }}>
      <Link href="/clubs" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        Back to clubs
      </Link>

      <div
        className="card"
        style={{
          padding: 0,
          marginBottom: 24,
          overflow: 'hidden',
          background: currentBook
            ? 'linear-gradient(135deg, var(--pulp-soft) 0%, var(--paper) 60%)'
            : 'linear-gradient(135deg, var(--paper-2), var(--paper))',
        }}
      >
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: currentBook ? 'auto 1fr auto' : '1fr auto', gap: 24, alignItems: 'center' }}>
          {currentBook && club.current_book && (
            <Link href={`/book/${club.current_book.id}`} style={{ display: 'block' }}>
              <Cover book={currentBook} size={120} />
            </Link>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--pulp-deep)' }}>
              {club.is_public ? 'Public club' : 'Private club'} · {club.member_count ?? 0} members
            </div>
            <h1 className="display-lg" style={{ marginBottom: 10 }}>{club.name}</h1>
            {currentBook && club.current_book && (
              <div style={{ marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                  Now reading
                </div>
                <Link href={`/book/${club.current_book.id}`} style={{ fontSize: 18, fontWeight: 700 }}>
                  {club.current_book.title}
                </Link>
                {currentBook.author && (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>by {currentBook.author}</div>
                )}
              </div>
            )}
            {club.description && (
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 720 }}>
                {club.description}
              </p>
            )}
          </div>

          {me && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {isOwner && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowEdit(true)}
                >
                  Edit club
                </button>
              )}
              {me.id !== club.owner_id && (
                <ReportButton
                  entityType="club"
                  entityId={club.id}
                  targetUserId={club.owner_id}
                  compact
                />
              )}
              <button
                className={club.is_member ? 'btn btn-ghost' : 'btn btn-pulp'}
                onClick={async () => {
                  try {
                    if (club.is_member) {
                      await leaveClub(supabase, club.id)
                    } else {
                      await joinClub(supabase, club.id)
                    }
                    await load()
                  } catch (error) {
                    setMessage((error as Error).message || 'Could not update membership')
                  }
                }}
              >
                {club.is_member ? 'Leave club' : 'Join club'}
              </button>
            </div>
          )}
        </div>
        {message && <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '0 28px 18px' }}>{message}</div>}
      </div>

      {pastBooks.length > 0 && (
        <div className="card" style={{ padding: 22, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Bookshelf</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Books this club has read together.</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }} className="mono">{pastBooks.length} read</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 14 }}>
            {pastBooks.map((cb) => {
              if (!cb.book) return null
              const ui = toUiBook(cb.book)
              return (
                <div key={cb.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                  <Link href={`/book/${cb.book.id}`} style={{ display: 'block' }}>
                    <Cover book={ui} size={96} />
                  </Link>
                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, maxWidth: 100, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {cb.book.title}
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!cb.book) return
                        if (!window.confirm(`Remove "${cb.book.title}" from the club bookshelf?`)) return
                        try {
                          await removeClubBook(supabase, club.id, cb.book.id)
                          await load()
                        } catch (error) {
                          setMessage((error as Error).message || 'Could not remove book')
                        }
                      }}
                      style={{ fontSize: 10, color: 'var(--ink-3)', background: 'transparent', border: 0, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(currentBook || pastBooks.length > 0) && posts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            type="button"
            className={'chip' + (bookFilter === 'all' ? ' chip-pulp' : '')}
            onClick={() => setBookFilter('all')}
          >
            All discussions
          </button>
          {currentBook && club.current_book && (
            <button
              type="button"
              className={'chip' + (bookFilter === club.current_book_id ? ' chip-pulp' : '')}
              onClick={() => setBookFilter(club.current_book_id ?? 'all')}
            >
              Current: {club.current_book.title}
            </button>
          )}
          {pastBooks.map((cb) =>
            cb.book ? (
              <button
                key={cb.id}
                type="button"
                className={'chip' + (bookFilter === cb.book.id ? ' chip-pulp' : '')}
                onClick={() => cb.book && setBookFilter(cb.book.id)}
              >
                {cb.book.title}
              </button>
            ) : null
          )}
        </div>
      )}

      {showEdit && isOwner && (
        <ClubEditModal
          club={club}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false)
            await load()
          }}
          supabase={supabase}
        />
      )}

      {isOwner && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 18,
            background: 'color-mix(in oklab, var(--paper) 90%, white)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>Host tools</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 12 }}>
            Use a pinned post for the reading schedule, weekly checkpoints, or the next discussion date.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                clearDraft(null)
                setEditingPostId(null)
                setTitle('Reading schedule')
                setBody(
                  'Week 1: Chapters 1-5\nWeek 2: Chapters 6-10\nDiscussion date:\nAnything readers should know before they start?'
                )
                setMessage('Schedule draft ready to post')
              }}
            >
              Start schedule post
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                clearDraft(null)
                setEditingPostId(null)
                setTitle('')
                setBody('')
                setMessage('New discussion ready')
              }}
            >
              New discussion
            </button>
          </div>
        </div>
      )}

      {me && club.is_member && (
        <div className="card" style={{ padding: 22, marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {editingPostId ? 'Edit club post' : 'Post to the club'}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!title.trim() || !body.trim()) {
                setMessage('Add a title and body first')
                return
              }

              setSubmitting(true)
              try {
                if (editingPostId) {
                  await updateClubPost(supabase, editingPostId, { title, body })
                  setMessage('Post updated')
                } else {
                  await postToClub(supabase, {
                    clubId: club.id,
                    title,
                    body,
                    bookId: club.current_book_id ?? null,
                  })
                  setMessage('Post added')
                }
                resetComposer({ keepMessage: true })
                await load()
              } catch (error) {
                setMessage((error as Error).message || 'Could not post to club')
              } finally {
                setSubmitting(false)
              }
            }}
            style={{ display: 'grid', gap: 10 }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isOwner ? 'Post title or reading schedule headline' : 'Post title'}
              disabled={submitting}
              style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start the conversation and use @username to pull someone in"
              rows={4}
              disabled={submitting}
              style={{
                padding: '11px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Mentions send a notification, and this draft saves on this device until you post or clear it.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-pulp" style={{ justifyContent: 'center' }} disabled={submitting}>
                {submitting ? (editingPostId ? 'Saving...' : 'Publishing...') : editingPostId ? 'Save post' : 'Publish post'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => resetComposer()} disabled={submitting}>
                Clear draft
              </button>
              {editingPostId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingPostId(null)
                    setTitle('')
                    setBody('')
                    setMessage('Edit cancelled')
                  }}
                  disabled={submitting}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {visiblePosts.map((post) => {
          const user = toUiUser(post.profile)
          const isPostOwner = me?.id === post.user_id

          return (
            <div key={post.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar user={user} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    @{user.handle} - {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {post.is_pinned && <span className="chip chip-pulp">Pinned</span>}
                  {isPostOwner && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEditingPost(post)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          try {
                            await setClubPostPinned(supabase, post.id, !post.is_pinned)
                            await load()
                            setMessage(post.is_pinned ? 'Post unpinned' : 'Post pinned to the top')
                          } catch (error) {
                            setMessage((error as Error).message || 'Could not update pin')
                          }
                        }}
                      >
                        {post.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--pulp-deep)' }}
                        onClick={async () => {
                          if (!window.confirm('Delete this club post?')) return
                          try {
                            await deleteClubPost(supabase, post.id)
                            clearDraft(post.id)
                            if (editingPostId === post.id) {
                              setEditingPostId(null)
                              setTitle('')
                              setBody('')
                            }
                            await load()
                            setMessage('Post deleted')
                          } catch (error) {
                            setMessage((error as Error).message || 'Could not delete post')
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 8 }}>
                {post.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{post.body}</div>
            </div>
          )
        })}

        {visiblePosts.length === 0 && (
          <StateCard
            icon="book"
            title={posts.length === 0 ? 'No club posts yet' : 'No posts for this book'}
            body={
              posts.length === 0
                ? club.is_member
                  ? 'Start the first discussion, or post a pinned reading schedule if you run the club.'
                  : 'Join the club to post.'
                : 'Switch filters or be the first to post about this book.'
            }
            compact
          />
        )}
      </div>
    </div>
  )
}

function ClubEditModal({
  club,
  onClose,
  onSaved,
  supabase,
}: {
  club: DbClub
  onClose: () => void
  onSaved: () => Promise<void> | void
  supabase: ReturnType<typeof createClient>
}) {
  const [name, setName] = useState(club.name)
  const [description, setDescription] = useState(club.description ?? '')
  const [isPublic, setIsPublic] = useState(club.is_public)
  const [currentBookId, setCurrentBookId] = useState<string | null>(club.current_book_id)
  const [currentBook, setCurrentBook] = useState<DbBookWithAuthors | null>(club.current_book ?? null)
  const [pickingBook, setPickingBook] = useState(false)
  const [bookQuery, setBookQuery] = useState('')
  const [bookResults, setBookResults] = useState<DbBookWithAuthors[]>([])
  const [searching, setSearching] = useState(false)
  const [pastBookQuery, setPastBookQuery] = useState('')
  const [pastBookResults, setPastBookResults] = useState<DbBookWithAuthors[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pickingBook || !bookQuery.trim()) {
      setBookResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(async () => {
      const results = await searchBooks(supabase, bookQuery, 8)
      if (!cancelled) {
        setBookResults(results)
        setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [bookQuery, pickingBook, supabase])

  useEffect(() => {
    if (!pastBookQuery.trim()) {
      setPastBookResults([])
      return
    }
    let cancelled = false
    const handle = setTimeout(async () => {
      const results = await searchBooks(supabase, pastBookQuery, 8)
      if (!cancelled) setPastBookResults(results)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [pastBookQuery, supabase])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateClub(supabase, club.id, {
        name,
        description: description || null,
        isPublic,
        currentBookId,
      })
      await onSaved()
    } catch (err) {
      setError((err as Error).message || 'Could not save club')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        className="card"
        onClick={(event) => event.stopPropagation()}
        style={{ padding: 28, width: 560, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="display-md">Edit club</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
              Name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public — anyone can find and join
          </label>

          <div style={{ display: 'grid', gap: 8, padding: 14, background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
              Current book
            </div>
            {currentBook ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Cover book={toUiBook(currentBook)} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{currentBook.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{currentBook.authors?.[0]?.name}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setCurrentBook(null)
                    setCurrentBookId(null)
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPickingBook((v) => !v)}
                >
                  {pickingBook ? 'Cancel' : 'Change'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPickingBook((v) => !v)}
              >
                {pickingBook ? 'Cancel' : 'Pick a book'}
              </button>
            )}
            {pickingBook && (
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  autoFocus
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  placeholder="Search title, author, or ISBN"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
                />
                {searching && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Searching...</div>}
                <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {bookResults.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setCurrentBook(book)
                        setCurrentBookId(book.id)
                        setPickingBook(false)
                        setBookQuery('')
                      }}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Cover book={toUiBook(book)} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{book.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {book.authors?.[0]?.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 8, padding: 14, background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
              Add a past book
            </div>
            <input
              value={pastBookQuery}
              onChange={(e) => setPastBookQuery(e.target.value)}
              placeholder="Search to add an old read"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
            />
            <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {pastBookResults.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={async () => {
                    try {
                      await addClubPastBook(supabase, club.id, book.id)
                      setPastBookQuery('')
                      setPastBookResults([])
                      await onSaved()
                    } catch (err) {
                      setError((err as Error).message || 'Could not add book')
                    }
                  }}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Cover book={toUiBook(book)} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{book.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      {book.authors?.[0]?.name}
                    </div>
                  </div>
                  <span className="chip">Add</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--pulp-deep)', background: 'var(--pulp-soft)', border: '1px solid var(--pulp)', padding: 10, borderRadius: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-pulp" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
