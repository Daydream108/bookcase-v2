'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { PostComposer } from '@/components/redesign/home/PostComposer'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  getOnboardingState,
  getReadingGoal,
  getStreak,
  listPopularBooks,
  listRecentActivity,
  listRecentBookPosts,
  toUiBook,
  toUiUser,
  type DbActivityEvent,
  type DbBookCard,
  type DbBookPost,
  type DbOnboardingState,
  type DbProfile,
  type DbReadingGoal,
} from '@/lib/db'

function getDismissedOnboardingKey(userId: string) {
  return `bookcase:onboarding-dismissed:${userId}`
}

function getHiddenOnboardingStepsKey(userId: string) {
  return `bookcase:onboarding-hidden-steps:${userId}`
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [posts, setPosts] = useState<DbBookPost[]>([])
  const [activity, setActivity] = useState<DbActivityEvent[]>([])
  const [trending, setTrending] = useState<DbBookCard[]>([])
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [goal, setGoal] = useState<DbReadingGoal | null>(null)
  const [onboarding, setOnboarding] = useState<DbOnboardingState | null>(null)
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false)
  const [hiddenOnboardingSteps, setHiddenOnboardingSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const [nextPosts, nextActivity, popularBooks] = await Promise.all([
      listRecentBookPosts(supabase, 12),
      listRecentActivity(supabase, 20),
      listPopularBooks(supabase, 4),
    ])
    setPosts(nextPosts)
    setActivity(nextActivity)
    setTrending(popularBooks)
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return

      setMe(profile)
      if (profile) {
        const [nextStreak, nextGoal, nextOnboarding] = await Promise.all([
          getStreak(supabase, profile.id),
          getReadingGoal(supabase),
          getOnboardingState(supabase),
        ])
        if (cancelled) return
        setStreak({
          current: nextStreak.current_streak ?? 0,
          longest: nextStreak.longest_streak ?? 0,
        })
        setGoal(nextGoal)
        setOnboarding(nextOnboarding)
      }

      await refresh()
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    if (!me) {
      setDismissedOnboarding(false)
      setHiddenOnboardingSteps([])
      return
    }

    try {
      const dismissed = window.localStorage.getItem(getDismissedOnboardingKey(me.id)) === '1'
      const rawHiddenSteps = window.localStorage.getItem(getHiddenOnboardingStepsKey(me.id))
      const parsedHiddenSteps = rawHiddenSteps ? (JSON.parse(rawHiddenSteps) as string[]) : []
      setDismissedOnboarding(dismissed)
      setHiddenOnboardingSteps(Array.isArray(parsedHiddenSteps) ? parsedHiddenSteps : [])
    } catch {
      setDismissedOnboarding(false)
      setHiddenOnboardingSteps([])
    }
  }, [me])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const hideOnboardingStep = (label: string) => {
    if (!me) return
    setHiddenOnboardingSteps((current) => {
      if (current.includes(label)) return current
      const next = [...current, label]
      try {
        window.localStorage.setItem(getHiddenOnboardingStepsKey(me.id), JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const dismissOnboarding = () => {
    if (!me) return
    setDismissedOnboarding(true)
    try {
      window.localStorage.setItem(getDismissedOnboardingKey(me.id), '1')
    } catch {}
  }

  const displayName = me?.display_name ?? me?.username ?? 'reader'
  const onboardingSteps = buildOnboardingSteps(me, onboarding)
  const visibleOnboardingSteps = onboardingSteps.filter(
    (step) => !hiddenOnboardingSteps.includes(step.label)
  )

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '32px 40px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 340px',
        gap: 40,
      }}
    >
      <main>
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 24,
            background: 'linear-gradient(135deg, var(--paper), var(--pulp-soft))',
            border: '1px solid var(--pulp)',
            borderRadius: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--pulp-deep)' }}>
                {streak.current > 0 ? `${streak.current}-day streak / log today` : 'Start your streak today'}
              </div>
              <h1 className="display-md" style={{ marginTop: 8 }}>
                {greeting}, {displayName}.
              </h1>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
                <Link href="/streak" className="link-u" style={{ color: 'var(--pulp-deep)', fontWeight: 600 }}>
                  Log today's session
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>{streak.current}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>day streak</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>{streak.longest}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>longest</div>
              </div>
            </div>
          </div>
        </div>

        {me && visibleOnboardingSteps.length > 0 && !dismissedOnboarding && (
          <div
            className="card"
            style={{
              padding: 20,
              marginBottom: 20,
              borderColor: 'color-mix(in oklab, var(--moss) 35%, var(--border))',
              background: 'linear-gradient(140deg, color-mix(in oklab, var(--moss) 10%, var(--paper)), var(--paper))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--moss)', marginBottom: 6 }}>
                  Get started
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  Set up your library, profile, and feed.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {visibleOnboardingSteps.filter((step) => step.done).length}/{visibleOnboardingSteps.length} done
                </div>
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="link-u"
                  style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                >
                  Hide checklist
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {visibleOnboardingSteps.map((step) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {step.done ? 'Done' : 'Next'} / {step.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                      {step.description}
                    </div>
                  </div>
                  {step.done ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span className="chip" style={{ color: 'var(--moss)', borderColor: 'color-mix(in oklab, var(--moss) 30%, var(--border))' }}>
                        Complete
                      </span>
                      <button
                        type="button"
                        onClick={() => hideOnboardingStep(step.label)}
                        className="link-u"
                        style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <Link href={step.href} className="btn btn-outline btn-sm">
                      {step.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {me && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Reading goal</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  {goal
                    ? `${goal.books_completed}/${goal.book_goal} books, ${goal.pages_completed}/${goal.page_goal} pages, ${goal.minutes_completed}/${goal.minute_goal} minutes`
                    : 'Set a yearly goal for books, pages, or minutes.'}
                </div>
              </div>
              <Link href="/streak" className="btn btn-outline btn-sm">
                {goal ? 'Edit goal' : 'Set goal'}
              </Link>
            </div>

            {goal ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <GoalBar label="Books" value={goal.books_completed} target={goal.book_goal} />
                <GoalBar label="Pages" value={goal.pages_completed} target={goal.page_goal} />
                <GoalBar label="Minutes" value={goal.minutes_completed} target={goal.minute_goal} />
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Goals help make your progress easy to read.
              </div>
            )}
          </div>
        )}

        <PostComposer me={me} onPosted={refresh} />

        <div className="eyebrow" style={{ marginBottom: 12 }}>Latest posts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {loading ? (
            <div className="card" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading...</div>
          ) : posts.length === 0 ? (
            <div className="card" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>
              {me
                ? 'Your feed is quiet. Rate a book, follow someone, or start a post.'
                : 'Nothing yet. Sign in and start the first post.'}
            </div>
          ) : (
            posts.map((post) => {
              const user = toUiUser(post.profile)
              const book = toUiBook(post.book ?? null)
              return (
                <Link
                  key={post.id}
                  href={`/book/${post.book_id}`}
                  className="card"
                  style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
                >
                  {post.book && <Cover book={book} size={56} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Avatar user={user} size={18} />
                      <b style={{ color: 'var(--ink-2)' }}>@{user.handle}</b>
                      {post.book && <span>/ on <i>{post.book.title}</i></span>}
                      <span>/ {timeAgo(post.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{post.title}</div>
                    {post.body && (
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {post.body}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>Score {post.upvotes}</span>
                      <span>Replies {post.comment_count ?? 0}</span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        <div className="eyebrow" style={{ marginBottom: 12 }}>Recent activity</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activity.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
              {me
                ? 'No activity yet. Log a session, write a review, or follow someone.'
                : 'No activity yet.'}
            </div>
          ) : (
            activity.map((event) => {
              const user = toUiUser(event.profile)
              return (
                <div key={event.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                  <Avatar user={user} size={28} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <b>{user.name}</b>{' '}
                    <span style={{ color: 'var(--ink-3)' }}>{describeEvent(event)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{timeAgo(event.created_at)}</span>
                </div>
              )
            })
          )}
        </div>
      </main>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="eyebrow">Popular books</div>
            <Link href="/explore" className="link-u" style={{ fontSize: 12, color: 'var(--pulp)', fontWeight: 600 }}>
              See all
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {trending.map((book, index) => {
              const uiBook = toUiBook(book, book.stats)
              return (
                <Link key={book.id} href={`/book/${book.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 0 }}>
                  <div className="mono" style={{ fontSize: 18, color: 'var(--ink-4)', width: 22, fontWeight: 600 }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <Cover book={uiBook} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{uiBook.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--pulp)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {book.stats.avg_rating ? book.stats.avg_rating.toFixed(1) : '-'} / {book.stats.rating_count} ratings
                    </div>
                  </div>
                </Link>
              )
            })}
            {!trending.length && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No popular books yet.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

function buildOnboardingSteps(me: DbProfile | null, onboarding: DbOnboardingState | null) {
  if (!me || !onboarding) return []

  return [
    {
      label: 'Add books',
      description: 'Import Goodreads or save a few books.',
      href: onboarding.hasBooks ? '/search' : '/import',
      cta: onboarding.hasBooks ? 'Add more' : 'Import books',
      done: onboarding.hasBooks,
    },
    {
      label: 'Pin favorites',
      description: 'Add favorites to the top row of your profile.',
      href: `/profile/${me.username ?? ''}`,
      cta: 'Open profile',
      done: onboarding.favoritesCount > 0,
    },
    {
      label: 'Follow a reader',
      description: 'Follow people to fill your feed.',
      href: '/search',
      cta: 'Find readers',
      done: onboarding.followingCount > 0,
    },
    {
      label: 'Join a club',
      description: 'Join a group reading the same book.',
      href: '/clubs',
      cta: 'Browse clubs',
      done: onboarding.clubsCount > 0,
    },
    {
      label: 'Log a session',
      description: 'Log a session to start your streak.',
      href: '/streak',
      cta: 'Open tracker',
      done: onboarding.sessionsCount > 0,
    },
    {
      label: 'Write a review',
      description: 'Rate a book and post a short review.',
      href: '/search',
      cta: 'Pick a book',
      done: onboarding.reviewsCount > 0,
    },
  ]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString()
}

function describeEvent(event: DbActivityEvent): string {
  const bookTitle = event.book?.title ? ` ${event.book.title}` : ''
  const targetName =
    typeof event.metadata?.target_name === 'string' ? event.metadata.target_name : 'someone'
  const badgeTitle = typeof event.metadata?.title === 'string' ? event.metadata.title : 'a badge'

  switch (event.event_type) {
    case 'started_reading':
      return `started reading${bookTitle}`
    case 'finished_reading':
      return `finished${bookTitle}`
    case 'book_logged':
      return `logged${bookTitle}`
    case 'book_reviewed':
      return `reviewed${bookTitle}`
    case 'list_created':
      return 'created a list'
    case 'followed_user':
      return `followed ${targetName}`
    case 'badge_unlocked':
      return `unlocked ${badgeTitle}`
    default:
      return event.event_type.replace(/_/g, ' ')
  }
}

function GoalBar({
  label,
  value,
  target,
}: {
  label: string
  value: number
  target: number
}) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--ink-3)' }}>
          {value} / {target}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--paper-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--pulp), oklch(76% 0.16 72))',
          }}
        />
      </div>
    </div>
  )
}
