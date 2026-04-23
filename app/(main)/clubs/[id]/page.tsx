'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { ReportButton } from '@/components/redesign/ReportButton'
import { StateCard } from '@/components/redesign/StateCard'
import { createClient } from '@/lib/supabase/client'
import {
  deleteClubPost,
  getClub,
  getCurrentProfile,
  joinClub,
  leaveClub,
  listClubPosts,
  postToClub,
  setClubPostPinned,
  toUiBook,
  toUiUser,
  updateClubPost,
  type DbClub,
  type DbClubPost,
  type DbProfile,
} from '@/lib/db'

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [club, setClub] = useState<DbClub | null>(null)
  const [posts, setPosts] = useState<DbClubPost[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const getDraftKey = (postId: string | null) =>
    me ? `bookcase:club-post-draft:${me.id}:${id}:${postId ?? 'new'}` : null

  const clearDraft = (postId: string | null = editingPostId) => {
    const key = getDraftKey(postId)
    if (!key || typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  }

  const load = async () => {
    const [profile, clubRow, postRows] = await Promise.all([
      getCurrentProfile(supabase),
      getClub(supabase, id),
      listClubPosts(supabase, id, 40),
    ])
    setMe(profile)
    setClub(clubRow)
    setPosts(postRows)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [profile, clubRow, postRows] = await Promise.all([
        getCurrentProfile(supabase),
        getClub(supabase, id),
        listClubPosts(supabase, id, 40),
      ])
      if (cancelled) return
      setMe(profile)
      setClub(clubRow)
      setPosts(postRows)
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

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              {club.is_public ? 'Public club' : 'Private club'} - {club.member_count ?? 0} members
            </div>
            <h1 className="display-lg" style={{ marginBottom: 10 }}>{club.name}</h1>
            {club.description && (
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 720 }}>
                {club.description}
              </p>
            )}
          </div>

          {me && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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

        {currentBook && club.current_book && (
          <div
            style={{
              marginTop: 22,
              paddingTop: 22,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <Cover book={currentBook} size={72} />
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--ink-3)',
                  marginBottom: 4,
                }}
              >
                Current read
              </div>
              <Link href={`/book/${club.current_book.id}`} style={{ fontSize: 16, fontWeight: 700 }}>
                {club.current_book.title}
              </Link>
            </div>
          </div>
        )}
        {message && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 14 }}>{message}</div>}
      </div>

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
        {posts.map((post) => {
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

        {posts.length === 0 && (
          <StateCard
            icon="book"
            title="No club posts yet"
            body={
              club.is_member
                ? 'Start the first discussion, or post a pinned reading schedule if you run the club.'
                : 'Join the club to post.'
            }
            compact
          />
        )}
      </div>
    </div>
  )
}
