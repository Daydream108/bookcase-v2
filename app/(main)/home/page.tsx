'use client'

import { useState } from 'react'
import Link from 'next/link'
import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { FeedTabs } from '@/components/redesign/home/FeedTabs'
import { ReviewCard, type Review } from '@/components/redesign/home/ReviewCard'
import { ActivityRow, type Activity } from '@/components/redesign/home/ActivityRow'
import { ThreadCard, type Thread } from '@/components/redesign/home/ThreadCard'

export default function HomePage() {
  const [tab, setTab] = useState('following')
  const brett = users.find((u) => u.id === 'brett')!

  const reviews: Review[] = [
    {
      userId: 'ava', bookId: 'sb', rating: 5, time: '2h',
      bodyPre: 'finally finished. ',
      spoiler: 'the bacchanal scene wrecked me. when richard realizes what they actually did to bunny—',
      bodyPost: ' dark academia is back, baby. i will think about this book every single october.',
      tags: ['Dark Academia', 'Re-reading', 'Obsessive'],
      reactions: [{ emoji: '🕯️', count: 142, initial: true }, { emoji: '💔', count: 88 }, { emoji: '📚', count: 56 }],
      replies: 23,
    },
    {
      userId: 'maya', bookId: 'hm', rating: 4.5, time: '5h',
      bodyPre: 'crying in the weir fandom corner. rocky is my son. this is hard sci-fi with an actual heart. the ending made me close the book and stare at the wall for 20 minutes.',
      tags: ['Sci-Fi', 'Cried', 'Unputdownable'],
      reactions: [{ emoji: '🪐', count: 201, initial: true }, { emoji: '😭', count: 94 }, { emoji: '🔥', count: 38 }],
      replies: 41,
    },
  ]

  const activity: Activity[] = [
    { userId: 'leo', action: 'started', bookId: 'tb', time: '12m' },
    { userId: 'sam', action: 'finished', bookId: 'pr', time: '1h', note: 'i think i live in the house now' },
    { userId: 'jules', action: 'logged', bookId: 'bb', time: '3h', note: '80 pages on the train commute' },
    { userId: 'ava', action: 'shelved', bookId: 'tm', time: '5h' },
    { userId: 'maya', action: 'followed', targetUser: 'jules', time: '8h' },
    { userId: 'leo', action: 'started', bookId: 'kl', time: '1d' },
  ]

  const threads: Thread[] = [
    { bookId: 'sb', title: 'Was Bunny actually likable? A case for the defense.', preview: "hear me out. we only see him through richard's (unreliable, drunk, in love with henry) narration...", time: '4h', hasSpoiler: true, chapter: '8', replies: 324, upvotes: 892, participants: ['ava', 'jules', 'sam', 'leo'] },
    { bookId: 'hm', title: "Theory: Rocky's species evolved because of [REDACTED]", preview: 'pulling this together from chapters 18-22. the astrophage trajectory from 40 Eridani suggests...', time: '6h', hasSpoiler: true, chapter: '22', replies: 187, upvotes: 542, participants: ['maya', 'leo', 'jules'] },
  ]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40 }}>
      <main>
        <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, var(--paper), var(--pulp-soft))', border: '1px solid var(--pulp)', borderRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--pulp-deep)' }}>🔥 14-day streak · keep it alive</div>
              <h1 className="display-md" style={{ marginTop: 8 }}>Good morning, Brett.</h1>
              <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
                78 pages this month · 3 of 24 books ·{' '}
                <Link href="/streak" className="link-u" style={{ color: 'var(--pulp-deep)', fontWeight: 600 }}>
                  Log today&apos;s session →
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>14</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>day streak</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>78</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>pages · april</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 48, lineHeight: 1, color: 'var(--pulp)' }}>L7</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>reader lvl</div>
              </div>
            </div>
          </div>
        </div>

        <FeedTabs tab={tab} setTab={setTab} />

        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar user={brett} size={36} />
          <input placeholder="what are you reading? drop a hot take, start a thread…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }} />
          <button className="btn btn-ghost btn-sm"><Icon name="book" size={14} /> Book</button>
          <button className="btn btn-ghost btn-sm"><Icon name="star" size={14} /> Rate</button>
          <button className="btn btn-pulp btn-sm">Post</button>
        </div>

        <div className="eyebrow" style={{ marginBottom: 12 }}>🔥 Threads on fire</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {threads.map((t, i) => (
            <ThreadCard key={i} thread={t} />
          ))}
        </div>

        <div className="eyebrow" style={{ marginBottom: 12 }}>From people you follow</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {reviews.map((r, i) => (
            <ReviewCard key={i} review={r} />
          ))}
        </div>

        <div className="eyebrow" style={{ marginBottom: 12 }}>Latest shelf activity</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activity.map((a, i) => (
            <ActivityRow key={i} activity={a} />
          ))}
        </div>
      </main>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="eyebrow">🔥 Trending this week</div>
            <Link href="/explore" className="link-u" style={{ fontSize: 12, color: 'var(--pulp)', fontWeight: 600 }}>
              See all
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['sb', 'hm', 'bb', 'pr'].map((id, i) => {
              const b = books.find((x) => x.id === id)!
              const readers = 100 + ((i + 1) * 73) % 400
              return (
                <Link key={id} href={`/book/${id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 0 }}>
                  <div className="mono" style={{ fontSize: 18, color: 'var(--ink-4)', width: 22, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</div>
                  <Cover book={b} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{b.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--pulp)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>★ {b.rating} · +{readers} readers</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-4)' }}>📡 Taste twin found</div>
          <h3 className="serif" style={{ fontSize: 26, marginTop: 8, marginBottom: 8 }}>You + @mayamoss share 7 favorites.</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['hm', 'pr', 'bb', 'sb', 'cr'].map((id) => {
              const b = books.find((x) => x.id === id)!
              return <Cover key={id} book={b} size={38} />
            })}
          </div>
          <button className="btn btn-pulp btn-sm" style={{ width: '100%', justifyContent: 'center' }}>Follow @mayamoss</button>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>✍️ Authors · new drops</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'R.F. Kuang', handle: 'rfkuang', update: 'posted a draft excerpt', time: '3h', color: 'oklch(58% 0.15 10)' },
              { name: 'Emily St. John Mandel', handle: 'esjmandel', update: 'announced new novel', time: '1d', color: 'oklch(54% 0.12 240)' },
              { name: 'Andy Weir', handle: 'andyweir', update: 'AMA scheduled May 4', time: '2d', color: 'oklch(62% 0.14 85)' },
            ].map((a) => (
              <div key={a.handle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ width: 36, height: 36, background: a.color, fontSize: 14, position: 'relative' }}>
                  {a.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 99, background: 'var(--moss)', border: '2px solid var(--paper)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>
                    {a.name} <span style={{ color: 'var(--moss)', fontSize: 11 }}>✓ author</span>
                  </div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{a.update} · {a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
