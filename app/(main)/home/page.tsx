'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { PostComposer } from '@/components/redesign/home/PostComposer'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
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
  type DbProfile,
  type DbReadingGoal,
} from '@/lib/db'

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [posts, setPosts] = useState<DbBookPost[]>([])
  const [activity, setActivity] = useState<DbActivityEvent[]>([])
  const [trending, setTrending] = useState<DbBookCard[]>([])
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [goal, setGoal] = useState<DbReadingGoal | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const [p, a, tr] = await Promise.all([
      listRecentBookPosts(supabase, 12),
      listRecentActivity(supabase, 20),
      listPopularBooks(supabase, 4),
    ])
    setPosts(p)
    setActivity(a)
    setTrending(tr)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(profile)
      if (profile) {
        const [s, g] = await Promise.all([
          getStreak(supabase, profile.id),
          getReadingGoal(supabase),
        ])
        if (cancelled) return
        setStreak({ current: s.current_streak ?? 0, longest: s.longest_streak ?? 0 })
        setGoal(g)
      }
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName = me?.display_name ?? me?.username ?? 'reader'

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40 }}>
      <main>
        <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, var(--paper), var(--pulp-soft))', border: '1px solid var(--pulp)', borderRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--pulp-deep)' }}>
                🔥 {streak.current}-day streak {streak.current > 0 ? '· keep it alive' : '· start one today'}
              </div>
              <h1 className="display-md" style={{ marginTop: 8 }}>
                {greeting}, {displayName}.
              </h1>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
                <Link href="/streak" className="link-u" style={{ color: 'var(--pulp-deep)', fontWeight: 600 }}>
                  Log today&apos;s session →
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

        {me && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>This year&apos;s reading goal</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  {goal
                    ? `${goal.books_completed}/${goal.book_goal} books, ${goal.pages_completed}/${goal.page_goal} pages, ${goal.minutes_completed}/${goal.minute_goal} minutes`
                    : 'Set a goal so your progress has something to chase.'}
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
                Your streak is live. Add a yearly goal to track the bigger arc too.
              </div>
            )}
          </div>
        )}

        <PostComposer me={me} onPosted={refresh} />

        <div className="eyebrow" style={{ marginBottom: 12 }}>🧵 Latest threads</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {loading ? (
            <div className="card" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div className="card" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>
              Nothing yet. Be the first to post — use the composer above.
            </div>
          ) : (
            posts.map((p) => {
              const u = toUiUser(p.profile)
              const b = toUiBook(p.book ?? null)
              return (
                <Link
                  key={p.id}
                  href={`/book/${p.book_id}`}
                  className="card"
                  style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
                >
                  {p.book && <Cover book={b} size={56} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Avatar user={u} size={18} />
                      <b style={{ color: 'var(--ink-2)' }}>@{u.handle}</b>
                      {p.book && <span>· on <i>{p.book.title}</i></span>}
                      <span>· {timeAgo(p.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                    {p.body && (
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.body}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>↑ {p.upvotes}</span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        <div className="eyebrow" style={{ marginBottom: 12 }}>📚 Latest shelf activity</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activity.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>No activity yet.</div>
          ) : (
            activity.map((a) => {
              const u = toUiUser(a.profile)
              return (
                <div key={a.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                  <Avatar user={u} size={28} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <b>{u.name}</b>{' '}
                    <span style={{ color: 'var(--ink-3)' }}>
                      {describeEvent(a)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{timeAgo(a.created_at)}</span>
                </div>
              )
            })
          )}
        </div>
      </main>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="eyebrow">🔥 Popular</div>
            <Link href="/explore" className="link-u" style={{ fontSize: 12, color: 'var(--pulp)', fontWeight: 600 }}>
              See all
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {trending.map((b, i) => {
              const ui = toUiBook(b, b.stats)
              return (
                <Link key={b.id} href={`/book/${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 0 }}>
                  <div className="mono" style={{ fontSize: 18, color: 'var(--ink-4)', width: 22, fontWeight: 600 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <Cover book={ui} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ui.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--pulp)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {b.stats.avg_rating ? `★ ${b.stats.avg_rating.toFixed(1)}` : '★ —'} · {b.stats.rating_count} ratings
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

function describeEvent(a: DbActivityEvent): string {
  const bookTitle = a.book?.title ? ` ${a.book.title}` : ''
  const targetName =
    typeof a.metadata?.target_name === 'string' ? a.metadata.target_name : 'someone'
  const badgeTitle = typeof a.metadata?.title === 'string' ? a.metadata.title : 'a badge'
  switch (a.event_type) {
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
      return a.event_type.replace(/_/g, ' ')
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
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
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
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--pulp), oklch(76% 0.16 72))',
          }}
        />
      </div>
    </div>
  )
}
