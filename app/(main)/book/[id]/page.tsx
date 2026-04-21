'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { Spoiler } from '@/components/redesign/primitives'
import { LikeButton } from '@/components/redesign/LikeButton'
import { PostVoteButtons } from '@/components/redesign/PostUpvoteButton'
import { HalfStarInput, StarDisplay } from '@/components/redesign/Stars'
import { createClient } from '@/lib/supabase/client'
import { shareUrl } from '@/lib/share'
import {
  addTag,
  awardProgressBadges,
  createBookPost,
  createComment,
  createReview,
  deleteComment,
  getBookWithStats,
  getCurrentProfile,
  getUserBook,
  listBookPosts,
  listBookTags,
  listLikedReviewIds,
  listPostVotes,
  listPostComments,
  listReviewsForBook,
  listSavedReviewIds,
  logReadingSession,
  removeTag,
  toggleReviewSave,
  toUiBook,
  toUiUser,
  upsertUserBook,
  type DbBookCard,
  type DbBookPost,
  type DbBookPostComment,
  type DbProfile,
  type DbReview,
  type DbTag,
  type DbUserBook,
  type PostVote,
} from '@/lib/db'

type CommentMap = Record<string, DbBookPostComment[]>
type DraftMap = Record<string, string>
type ToggleMap = Record<string, boolean>

const MAX_REPLY_DEPTH = 2

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = useMemo(() => createClient(), [])

  const [book, setBook] = useState<DbBookCard | null>(null)
  const [me, setMe] = useState<DbProfile | null>(null)
  const [userBook, setUserBook] = useState<DbUserBook | null>(null)
  const [reviews, setReviews] = useState<DbReview[]>([])
  const [threads, setThreads] = useState<DbBookPost[]>([])
  const [tags, setTags] = useState<DbTag[]>([])
  const [savedReviewIds, setSavedReviewIds] = useState<string[]>([])
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([])
  const [postVotes, setPostVotes] = useState<Record<string, PostVote>>({})
  const [commentsByPost, setCommentsByPost] = useState<CommentMap>({})
  const [commentDrafts, setCommentDrafts] = useState<DraftMap>({})
  const [replyDrafts, setReplyDrafts] = useState<DraftMap>({})
  const [openComments, setOpenComments] = useState<ToggleMap>({})
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({})
  const [tab, setTab] = useState<'threads' | 'reviews'>('threads')
  const [loading, setLoading] = useState(true)

  const [showReview, setShowReview] = useState(false)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewSpoiler, setReviewSpoiler] = useState(false)

  const [showThread, setShowThread] = useState(false)
  const [threadTitle, setThreadTitle] = useState('')
  const [threadBody, setThreadBody] = useState('')

  const [showLog, setShowLog] = useState(false)
  const [logPages, setLogPages] = useState('')
  const [logMinutes, setLogMinutes] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')

  const [tagInput, setTagInput] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(profile)

      const [bookRow, reviewRows, threadRows, tagRows] = await Promise.all([
        getBookWithStats(supabase, id),
        listReviewsForBook(supabase, id),
        listBookPosts(supabase, id),
        listBookTags(supabase, id),
      ])

      if (cancelled) return
      setBook(bookRow)
      setReviews(reviewRows)
      setThreads(threadRows)
      setTags(tagRows)

      if (profile) {
        const [userBookRow, savedIds, likedIds, votes] = await Promise.all([
          getUserBook(supabase, profile.id, id),
          listSavedReviewIds(supabase, reviewRows.map((review) => review.id)),
          listLikedReviewIds(supabase, reviewRows.map((review) => review.id)),
          listPostVotes(supabase, threadRows.map((thread) => thread.id)),
        ])
        if (cancelled) return
        setUserBook(userBookRow)
        setSavedReviewIds(savedIds)
        setLikedReviewIds(likedIds)
        setPostVotes(votes)
      } else {
        setUserBook(null)
        setSavedReviewIds([])
        setLikedReviewIds([])
        setPostVotes({})
      }

      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [id, supabase])

  const flash = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2400)
  }

  const loadComments = async (postId: string) => {
    const rows = await listPostComments(supabase, postId)
    setCommentsByPost((current) => ({ ...current, [postId]: rows }))
  }

  const refreshThreads = async () => {
    const rows = await listBookPosts(supabase, id)
    setThreads(rows)
    if (me) {
      const votes = await listPostVotes(supabase, rows.map((thread) => thread.id))
      setPostVotes(votes)
    }
  }

  const refreshReviews = async () => {
    const rows = await listReviewsForBook(supabase, id)
    setReviews(rows)
    if (me) {
      const ids = rows.map((review) => review.id)
      const [saved, liked] = await Promise.all([
        listSavedReviewIds(supabase, ids),
        listLikedReviewIds(supabase, ids),
      ])
      setSavedReviewIds(saved)
      setLikedReviewIds(liked)
    }
  }

  const saveShelf = async (status: DbUserBook['status']) => {
    if (!me) return flash('Sign in to save to a shelf')
    const row = await upsertUserBook(supabase, {
      bookId: id,
      status,
      started_at: status === 'reading' ? new Date().toISOString().slice(0, 10) : undefined,
      finished_at: status === 'read' ? new Date().toISOString().slice(0, 10) : undefined,
    })
    setUserBook(row)
    const awarded = await awardProgressBadges(supabase)
    flash(
      formatToast(
        status === 'reading' ? 'Marked as reading' : status === 'read' ? 'Marked as read' : 'Saved',
        awarded
      )
    )
  }

  const saveRating = async (rating: number) => {
    if (!me) return flash('Sign in to rate')
    const row = await upsertUserBook(supabase, {
      bookId: id,
      rating,
      status: userBook?.status ?? 'read',
    })
    setUserBook(row)
    flash(`Rated ${rating} stars`)
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return flash('Sign in to post a review')
    if (!reviewBody.trim() || reviewRating === 0) return flash('Add a rating and some text')

    await createReview(supabase, {
      bookId: id,
      rating: reviewRating,
      body: reviewBody,
      spoiler: reviewSpoiler,
    })

    setReviewBody('')
    setReviewRating(0)
    setReviewSpoiler(false)
    setShowReview(false)
    await refreshReviews()
    const awarded = await awardProgressBadges(supabase)
    flash(formatToast('Review posted', awarded))
  }

  const submitThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return flash('Sign in to start a thread')
    if (!threadTitle.trim()) return flash('Give your thread a title')

    await createBookPost(supabase, {
      bookId: id,
      title: threadTitle,
      body: threadBody,
    })

    setThreadTitle('')
    setThreadBody('')
    setShowThread(false)
    await refreshThreads()
    flash('Thread posted')
  }

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return flash('Sign in to log a session')

    await logReadingSession(supabase, {
      bookId: id,
      pages: logPages ? Number(logPages) : undefined,
      minutes: logMinutes ? Number(logMinutes) : undefined,
      date: logDate,
      notes: logNotes || undefined,
    })

    setLogPages('')
    setLogMinutes('')
    setLogNotes('')
    setShowLog(false)
    const awarded = await awardProgressBadges(supabase)
    flash(formatToast('Session logged', awarded))
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>
  }

  if (!book) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">Book not found</h1>
        <Link href="/search" className="btn btn-outline" style={{ marginTop: 16 }}>
          Back to search
        </Link>
      </div>
    )
  }

  const ui = toUiBook(book, book.stats)
  const authorLine = ui.author || 'Unknown'
  const shelf = userBook?.status ?? 'none'
  const myRating = userBook?.rating ?? 0

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ position: 'relative', padding: '40px 40px 60px', background: 'linear-gradient(180deg, var(--paper-2), var(--paper))', borderBottom: '1px solid var(--border)' }}>
        <Link href="/home" className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex' }}>
          Back
        </Link>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr auto', gap: 40, alignItems: 'start' }}>
          <div>
            <Cover book={ui} size={280} style={{ borderRadius: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-pulp"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => saveShelf(shelf === 'reading' ? 'read' : 'reading')}
              >
                {shelf === 'reading' ? 'Reading' : shelf === 'read' ? 'Read' : 'Start reading'}
              </button>
              <button className="btn btn-outline" onClick={() => saveShelf('to_read')}>
                {shelf === 'to_read' ? 'Saved' : 'Want'}
              </button>
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => setShowLog(true)}
            >
              Log a reading session
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              onClick={async () => {
                const r = await shareUrl({
                  title: book.title,
                  text: `${book.title}${authorLine ? ' — ' + authorLine : ''}`,
                  path: `/book/${id}`,
                })
                flash(r === 'copied' ? 'Link copied' : r === 'shared' ? 'Shared' : 'Could not share')
              }}
            >
              <Icon name="share" size={13} /> Share this book
            </button>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              {ui.genre || 'Book'} {ui.year ? `· ${ui.year}` : ''}
            </div>
            <h1 className="display-xl" style={{ marginBottom: 14 }}>{book.title}</h1>
            <div style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 24 }}>
              by <b style={{ color: 'var(--ink)' }}>{authorLine}</b>
            </div>

            <div style={{ display: 'flex', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
              <Metric value={book.stats.avg_rating ? book.stats.avg_rating.toFixed(1) : '-'} label={`${book.stats.rating_count.toLocaleString()} ratings`} accent />
              {book.page_count && <Metric value={book.page_count} label="pages" />}
              <Metric value={book.stats.read_count} label="readers" />
              <Metric value={threads.length} label="threads" />
            </div>

            {book.description && (
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 720, marginBottom: 20 }}>
                {book.description}
              </p>
            )}

            {book.genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {book.genres.map((genre) => (
                  <span key={genre.id} className="chip chip-pulp">{genre.name}</span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 8 }}>
                Tags
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {tags.map((tag) => (
                  <span key={tag.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    #{tag.name}
                    {me && (
                      <button
                        type="button"
                        onClick={async () => {
                          await removeTag(supabase, id, tag.id)
                          setTags(await listBookTags(supabase, id))
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, lineHeight: 1 }}
                      >
                        x
                      </button>
                    )}
                  </span>
                ))}
                {me && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!tagInput.trim()) return
                      await addTag(supabase, id, tagInput)
                      setTagInput('')
                      setTags(await listBookTags(supabase, id))
                    }}
                    style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}
                  >
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="add a tag"
                      style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 999, fontSize: 12, minWidth: 150 }}
                    />
                    <button type="submit" className="btn btn-outline btn-sm">Add</button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, width: 260, background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-4)', marginBottom: 12 }}>your rating</div>
            <div style={{ marginBottom: 16 }}>
              <HalfStarInput
                value={myRating}
                onChange={saveRating}
                size={28}
                emptyColor="var(--ink-4)"
              />
            </div>
            <button
              className="btn btn-pulp btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              onClick={() => setShowReview(true)}
            >
              Write a review
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', color: 'var(--paper)' }}
              onClick={() => setShowThread(true)}
            >
              Start a thread
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 999,
            zIndex: 200,
            fontSize: 13,
          }}
        >
          {toast}
        </div>
      )}

      {showReview && (
        <Modal onClose={() => setShowReview(false)}>
          <form onSubmit={submitReview}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Write a review</div>
            <h3 className="serif" style={{ fontSize: 26, marginBottom: 14 }}>{book.title}</h3>
            <div style={{ marginBottom: 14 }}>
              <HalfStarInput value={reviewRating} onChange={setReviewRating} size={30} />
            </div>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              rows={5}
              placeholder="What did you think?"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)', marginTop: 10 }}>
              <input type="checkbox" checked={reviewSpoiler} onChange={(e) => setReviewSpoiler(e.target.checked)} />
              Contains spoilers
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-pulp" style={{ flex: 1, justifyContent: 'center' }}>Post review</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowReview(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showThread && (
        <Modal onClose={() => setShowThread(false)}>
          <form onSubmit={submitThread}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Start a thread</div>
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 14 }}>{book.title}</h3>
            <input
              value={threadTitle}
              onChange={(e) => setThreadTitle(e.target.value)}
              placeholder="Thread title"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 15, marginBottom: 10 }}
            />
            <textarea
              value={threadBody}
              onChange={(e) => setThreadBody(e.target.value)}
              rows={5}
              placeholder="What do you want to discuss?"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-pulp" style={{ flex: 1, justifyContent: 'center' }}>Post thread</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowThread(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showLog && (
        <Modal onClose={() => setShowLog(false)}>
          <form onSubmit={submitLog}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Log reading session</div>
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 14 }}>{book.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Pages read</label>
                <input value={logPages} onChange={(e) => setLogPages(e.target.value)} type="number" min={0} style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
              </div>
              <div>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Minutes</label>
                <input value={logMinutes} onChange={(e) => setLogMinutes(e.target.value)} type="number" min={0} style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Date</label>
                <input value={logDate} onChange={(e) => setLogDate(e.target.value)} type="date" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
              </div>
            </div>
            <label className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontWeight: 600 }}>Notes (optional)</label>
            <textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3} placeholder="What hit different?" style={{ width: '100%', padding: '10px 12px', marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-pulp" style={{ flex: 1, justifyContent: 'center' }}>Log session</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowLog(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40 }}>
        <main>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={'tab' + (tab === 'threads' ? ' active' : '')} onClick={() => setTab('threads')}>
              Threads · {threads.length}
            </button>
            <button className={'tab' + (tab === 'reviews' ? ' active' : '')} onClick={() => setTab('reviews')}>
              Reviews · {reviews.length}
            </button>
          </div>

          {tab === 'threads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {threads.map((thread) => {
                const user = toUiUser(thread.profile)
                const comments = commentsByPost[thread.id] ?? []
                const commentsOpen = openComments[thread.id]

                return (
                  <div key={thread.id} id={`thread-${thread.id}`} className="card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar user={user} size={28} />
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        <b style={{ color: 'var(--ink-2)' }}>@{user.handle}</b> · {new Date(thread.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, marginBottom: 6 }}>{thread.title}</div>
                    {thread.body && (
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {thread.body}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <PostVoteButtons
                        postId={thread.id}
                        initialCount={thread.upvotes}
                        initialVote={postVotes[thread.id] ?? 0}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          if (!commentsOpen && !commentsByPost[thread.id]) {
                            await loadComments(thread.id)
                          }
                          setOpenComments((current) => ({ ...current, [thread.id]: !commentsOpen }))
                        }}
                      >
                        <Icon name="message" size={13} /> {thread.comment_count ?? comments.length} {(thread.comment_count ?? comments.length) === 1 ? 'reply' : 'replies'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={async () => {
                          const r = await shareUrl({
                            title: thread.title,
                            path: `/book/${id}#thread-${thread.id}`,
                          })
                          flash(r === 'copied' ? 'Link copied' : r === 'shared' ? 'Shared' : 'Could not share')
                        }}
                      >
                        <Icon name="share" size={13} /> Share
                      </button>
                    </div>

                    {commentsOpen && (
                      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                        {buildCommentTree(comments, MAX_REPLY_DEPTH).map((node) => (
                          <CommentNode
                            key={node.comment.id}
                            node={node}
                            depth={0}
                            maxDepth={MAX_REPLY_DEPTH}
                            threadId={thread.id}
                            me={me}
                            replyingTo={replyingTo[thread.id] ?? null}
                            replyDraft={replyDrafts[thread.id] ?? ''}
                            onChangeReplyDraft={(value) =>
                              setReplyDrafts((current) => ({ ...current, [thread.id]: value }))
                            }
                            onStartReply={(commentId) => {
                              setReplyingTo((current) => ({ ...current, [thread.id]: commentId }))
                              setReplyDrafts((current) => ({ ...current, [thread.id]: '' }))
                            }}
                            onCancelReply={() => {
                              setReplyingTo((current) => ({ ...current, [thread.id]: null }))
                              setReplyDrafts((current) => ({ ...current, [thread.id]: '' }))
                            }}
                            onDelete={async (commentId) => {
                              await deleteComment(supabase, commentId)
                              await loadComments(thread.id)
                              await refreshThreads()
                            }}
                            onSubmitReply={async (parentId) => {
                              const value = (replyDrafts[thread.id] ?? '').trim()
                              if (!value) return
                              await createComment(supabase, {
                                postId: thread.id,
                                body: value,
                                parentId,
                              })
                              setReplyingTo((current) => ({ ...current, [thread.id]: null }))
                              setReplyDrafts((current) => ({ ...current, [thread.id]: '' }))
                              await loadComments(thread.id)
                              await refreshThreads()
                            }}
                          />
                        ))}

                        {me ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault()
                              const value = commentDrafts[thread.id]?.trim()
                              if (!value) return
                              await createComment(supabase, { postId: thread.id, body: value })
                              setCommentDrafts((current) => ({ ...current, [thread.id]: '' }))
                              await loadComments(thread.id)
                              await refreshThreads()
                            }}
                            style={{ display: 'flex', gap: 8 }}
                          >
                            <input
                              value={commentDrafts[thread.id] ?? ''}
                              onChange={(e) => setCommentDrafts((current) => ({ ...current, [thread.id]: e.target.value }))}
                              placeholder="Add a comment"
                              style={{ flex: 1, padding: '10px 12px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 13 }}
                            />
                            <button type="submit" className="btn btn-outline btn-sm">Comment</button>
                          </form>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Sign in to join the thread.</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {threads.length === 0 && (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  No threads yet. Start the conversation.
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map((review) => {
                const user = toUiUser(review.profile)
                const saved = savedReviewIds.includes(review.id)
                return (
                  <div key={review.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar user={user} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          @{user.handle} · {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <StarDisplay value={review.rating} size={14} />
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.55 }}>
                      {review.contains_spoiler ? (
                        <>
                          <span className="spoiler-tag">Spoiler</span> <Spoiler>{review.body ?? ''}</Spoiler>
                        </>
                      ) : (
                        review.body
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                      <LikeButton
                        reviewId={review.id}
                        initialCount={review.liked_count}
                        initialLiked={likedReviewIds.includes(review.id)}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          const nextSaved = await toggleReviewSave(supabase, review.id)
                          setSavedReviewIds((current) =>
                            nextSaved ? [...current, review.id] : current.filter((id) => id !== review.id)
                          )
                        }}
                      >
                        <Icon name="bookmark" size={13} /> {saved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={async () => {
                          const r = await shareUrl({
                            title: `${user.name}'s review of ${book.title}`,
                            path: `/book/${id}#review-${review.id}`,
                          })
                          flash(r === 'copied' ? 'Link copied' : r === 'shared' ? 'Shared' : 'Could not share')
                        }}
                      >
                        <Icon name="share" size={13} /> Share
                      </button>
                    </div>
                  </div>
                )
              })}

              {reviews.length === 0 && (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  Be the first to review this book.
                </div>
              )}
            </div>
          )}
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Quick stats</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.8 }}>
              <div>Ratings: <b>{book.stats.rating_count.toLocaleString()}</b></div>
              <div>Reviews: <b>{book.stats.review_count.toLocaleString()}</b></div>
              <div>Readers: <b>{book.stats.read_count.toLocaleString()}</b></div>
              {book.stats.avg_rating !== null && (
                <div>Avg rating: <b style={{ color: 'var(--pulp)' }}>{book.stats.avg_rating.toFixed(2)}</b></div>
              )}
            </div>
          </div>

          {book.authors.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Author{book.authors.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {book.authors.map((author) => (
                  <div key={author.id} style={{ fontSize: 14, fontWeight: 600 }}>{author.name}</div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function Metric({
  value,
  label,
  accent = false,
}: {
  value: string | number
  label: string
  accent?: boolean
}) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 44, lineHeight: 1, color: accent ? 'var(--pulp)' : 'var(--ink)' }}>
        {value}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </div>
  )
}

function formatToast(base: string, awarded: { title: string }[]) {
  if (!awarded.length) return base
  return `${base} · badge unlocked: ${awarded.map((badge) => badge.title).join(', ')}`
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 28, width: 520, maxWidth: '100%' }}>
        {children}
      </div>
    </div>
  )
}

type CommentTreeNode = {
  comment: DbBookPostComment
  children: CommentTreeNode[]
}

function buildCommentTree(comments: DbBookPostComment[], maxDepth: number): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>()
  for (const comment of comments) {
    byId.set(comment.id, { comment, children: [] })
  }
  const roots: CommentTreeNode[] = []
  const depthOf = (id: string): number => {
    let depth = 0
    let cursor = byId.get(id)
    while (cursor?.comment.parent_id) {
      const parent = byId.get(cursor.comment.parent_id)
      if (!parent) break
      depth += 1
      cursor = parent
      if (depth > 10) break
    }
    return depth
  }
  for (const comment of comments) {
    const node = byId.get(comment.id)!
    const parentId = comment.parent_id
    if (!parentId || !byId.has(parentId)) {
      roots.push(node)
      continue
    }
    const parentDepth = depthOf(parentId)
    if (parentDepth + 1 >= maxDepth) {
      const parent = byId.get(parentId)!
      parent.children.push(node)
    } else {
      byId.get(parentId)!.children.push(node)
    }
  }
  return roots
}

function CommentNode({
  node,
  depth,
  maxDepth,
  threadId,
  me,
  replyingTo,
  replyDraft,
  onChangeReplyDraft,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: {
  node: CommentTreeNode
  depth: number
  maxDepth: number
  threadId: string
  me: DbProfile | null
  replyingTo: string | null
  replyDraft: string
  onChangeReplyDraft: (value: string) => void
  onStartReply: (commentId: string) => void
  onCancelReply: () => void
  onSubmitReply: (parentId: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
}) {
  const commenter = toUiUser(node.comment.profile)
  const canReply = depth < maxDepth - 1
  const isReplying = replyingTo === node.comment.id

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: depth === 0 ? 'var(--paper-2)' : 'var(--paper)',
        border: '1px solid var(--border)',
        marginLeft: depth > 0 ? 16 : 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Avatar user={commenter} size={22} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          <b style={{ color: 'var(--ink)' }}>@{commenter.handle}</b>{' '}·{' '}
          {new Date(node.comment.created_at).toLocaleDateString()}
        </div>
        {me?.id === node.comment.user_id && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => onDelete(node.comment.id)}
          >
            Delete
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {node.comment.contains_spoiler ? (
          <Spoiler>{node.comment.body}</Spoiler>
        ) : (
          node.comment.body
        )}
      </div>

      {me && canReply && !isReplying && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6, padding: '2px 8px', fontSize: 11 }}
          onClick={() => onStartReply(node.comment.id)}
        >
          Reply
        </button>
      )}

      {isReplying && me && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await onSubmitReply(node.comment.id)
          }}
          style={{ display: 'flex', gap: 8, marginTop: 8 }}
        >
          <input
            autoFocus
            value={replyDraft}
            onChange={(e) => onChangeReplyDraft(e.target.value)}
            placeholder={`Reply to @${commenter.handle}`}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Post
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelReply}>
            Cancel
          </button>
        </form>
      )}

      {node.children.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {node.children.map((child) => (
            <CommentNode
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              threadId={threadId}
              me={me}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              onChangeReplyDraft={onChangeReplyDraft}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
