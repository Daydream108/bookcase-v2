'use client'

import { useMemo, useState } from 'react'
import { books, users, type User } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'

type InboxItem = {
  type: 'follow' | 'react' | 'reply' | 'thread' | 'author' | 'badge'
  user?: string
  body?: string
  emoji?: string
  snippet?: string
  time: string
  unread?: boolean
}

type PostItem =
  | { kind: 'review'; bookId: string; rating: number; body: string; reacts: number; replies: number; time: string }
  | { kind: 'thread'; bookId: string; title: string; replies: number; upvotes: number; time: string }
  | { kind: 'comment'; bookId: string; onTitle: string; body: string; reacts: number; time: string }

type CommentItem = { onTitle: string; onUser: string; body: string; reacts: number; time: string }

type SavedItem =
  | { kind: 'thread'; bookId: string; title: string; by: string; replies: number; time: string }
  | { kind: 'review'; bookId: string; by: string; rating: number; body: string; reacts: number; time: string }
  | { kind: 'comment'; bookId: string; by: string; onTitle: string; body: string; reacts: number; time: string }

function Pill({ children, color = 'var(--ink-3)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color, fontWeight: 600 }}>
      {children}
    </span>
  )
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<'inbox' | 'posts' | 'comments' | 'saved'>('inbox')

  const inbox: InboxItem[] = [
    { type: 'follow', user: 'maya', time: '12m', unread: true },
    { type: 'react', user: 'jules', body: 'your review of The Secret History', emoji: '🕯️', time: '1h', unread: true },
    { type: 'reply', user: 'leo', body: 'your thread on Piranesi', snippet: 'the house as grief metaphor thing hit different on a reread…', time: '3h', unread: true },
    { type: 'thread', user: 'ava', body: 'started a thread on Babel you were following', time: '5h' },
    { type: 'author', user: 'RF Kuang', body: 'announced a new book', time: '1d' },
    { type: 'badge', body: 'You unlocked 🦉 Night Owl!', time: '2d' },
  ]

  const myPosts: PostItem[] = [
    { kind: 'review', bookId: 'sb', rating: 5, body: 'the bacchanal scene rewired my chemistry. donna tartt cooked and she knew it.', reacts: 142, replies: 23, time: '2d' },
    { kind: 'thread', bookId: 'pr', title: 'the house as grief metaphor, a reread', replies: 87, upvotes: 201, time: '5d' },
    { kind: 'comment', bookId: 'hm', onTitle: "Theory: Rocky's species evolved because of…", body: 'the 40 Eridani thing lines up with the earlier chapters — i think weir plants this on p.118', reacts: 34, time: '1w' },
  ]

  const myComments: CommentItem[] = [
    { onTitle: 'Was Bunny actually likable?', onUser: 'ava', body: "defending bunny is wild but i'm locked in", reacts: 18, time: '4h' },
    { onTitle: 'Babel read-along week 3', onUser: 'jules', body: 'robin getting worse is the whole point', reacts: 42, time: '2d' },
    { onTitle: 'Sci-fi that made you cry', onUser: 'maya', body: 'rocky. every time. no notes.', reacts: 61, time: '3d' },
  ]

  const saved: SavedItem[] = [
    { kind: 'thread', bookId: 'sb', title: 'Richard as an unreliable narrator — evidence thread', by: 'ava', replies: 198, time: '2d' },
    { kind: 'review', bookId: 'bb', by: 'jules', rating: 4, body: 'imperial core narrative BURN. kuang cooked, robin is insufferable, i loved every page.', reacts: 310, time: '3d' },
    { kind: 'comment', bookId: 'pr', by: 'sam', onTitle: 'favorite piranesi passages', body: 'the description of the tides reads like a lullaby for someone grieving a version of themselves', reacts: 94, time: '1w' },
  ]

  const savedCounts = useMemo(() => saved.map(() => Math.floor(Math.random() * 100 + 40)), [])

  const tabs = [
    { id: 'inbox' as const, label: 'Inbox', count: inbox.filter((x) => x.unread).length },
    { id: 'posts' as const, label: 'Your posts', count: myPosts.length },
    { id: 'comments' as const, label: 'Your comments', count: myComments.length },
    { id: 'saved' as const, label: 'Saved', count: saved.length },
  ]

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 28 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Activity hub</div>
          <h1 className="display-lg">
            Your corner<br />
            <i style={{ color: 'var(--pulp)' }}>of the noise.</i>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm">Mark all read</button>
          <button className="btn btn-outline btn-sm"><Icon name="filter" size={13} /> Filter</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count > 0 && (
              <span className="mono" style={{ fontSize: 11, marginLeft: 6, color: tab === t.id ? 'var(--pulp)' : 'var(--ink-4)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <div className="card" style={{ padding: 0 }}>
          {inbox.map((n, i) => {
            const u: User | null = n.user
              ? users.find((x) => x.id === n.user) ?? { id: n.user, name: n.user, handle: n.user.toLowerCase().replace(/\s/g, ''), avatar: null, color: 'var(--moss)' }
              : null
            return (
              <div
                key={i}
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  borderBottom: i < inbox.length - 1 ? '1px solid var(--border)' : 'none',
                  background: n.unread ? 'var(--pulp-soft)' : 'transparent',
                  position: 'relative',
                }}
              >
                {n.unread && <div style={{ position: 'absolute', left: 6, top: 26, width: 6, height: 6, borderRadius: 99, background: 'var(--pulp)' }} />}
                {n.type === 'badge' ? (
                  <div style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--pulp-soft)', display: 'grid', placeItems: 'center', fontSize: 22 }}>🏆</div>
                ) : u ? (
                  <Avatar user={u} size={40} />
                ) : null}
                <div style={{ flex: 1, fontSize: 14 }}>
                  {n.type === 'follow' && u && (<><b>{u.name}</b> started following you</>)}
                  {n.type === 'react' && u && (<><b>{u.name}</b> reacted {n.emoji} to <b>{n.body}</b></>)}
                  {n.type === 'reply' && u && (<><b>{u.name}</b> replied to <b>{n.body}</b></>)}
                  {n.type === 'thread' && u && (<><b>{u.name}</b> {n.body}</>)}
                  {n.type === 'author' && u && (
                    <>
                      <b style={{ color: 'var(--moss)' }}>{u.name}</b>{' '}
                      <span style={{ color: 'var(--moss)', fontSize: 11 }}>✓ author</span> {n.body}
                    </>
                  )}
                  {n.type === 'badge' && <b>{n.body}</b>}
                  {n.snippet && (
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--border-2)', fontStyle: 'italic' }}>
                      &quot;{n.snippet}&quot;
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>{n.time} ago</div>
                </div>
                <button className="btn btn-ghost btn-sm">{n.type === 'follow' ? 'Follow back' : 'View'}</button>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myPosts.map((p, i) => {
            const b = books.find((x) => x.id === p.bookId)!
            return (
              <div key={i} className="card" style={{ padding: 20, display: 'flex', gap: 16 }}>
                <Cover book={b} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Pill color={p.kind === 'review' ? 'var(--pulp)' : p.kind === 'thread' ? 'var(--plum)' : 'var(--moss)'}>
                      {p.kind === 'review' ? '★ review' : p.kind === 'thread' ? '💬 thread' : '↩ comment'}
                    </Pill>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>on <b>{b.title}</b> · {p.time} ago</span>
                  </div>
                  {p.kind === 'review' && (
                    <>
                      <div style={{ color: 'var(--pulp)', fontSize: 14, marginBottom: 6 }}>{'★'.repeat(p.rating)}</div>
                      <p style={{ fontSize: 14, lineHeight: 1.5 }}>{p.body}</p>
                    </>
                  )}
                  {p.kind === 'thread' && <div className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>{p.title}</div>}
                  {p.kind === 'comment' && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>in reply to &quot;{p.onTitle}&quot;</div>
                      <p style={{ fontSize: 14, lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--pulp)' }}>{p.body}</p>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                    {'reacts' in p && <span>❤ {p.reacts}</span>}
                    {'replies' in p && <span>💬 {p.replies}</span>}
                    {'upvotes' in p && <span>↑ {p.upvotes}</span>}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 8px' }}>Edit</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myComments.map((c, i) => {
            const u = users.find((x) => x.id === c.onUser)!
            return (
              <div key={i} className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>
                  you replied to <b>@{u.handle}</b> on &quot;<i>{c.onTitle}</i>&quot; · {c.time} ago
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.5, paddingLeft: 14, borderLeft: '3px solid var(--pulp)' }}>{c.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                  <span>❤ {c.reacts}</span>
                  <button className="btn btn-ghost btn-sm">Go to thread →</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'saved' && (
        <>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>
            Posts, reviews, and comments from other readers you bookmarked. Your private stash.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {saved.map((s, i) => {
              const b = books.find((x) => x.id === s.bookId)!
              const u = users.find((x) => x.id === s.by)!
              return (
                <div key={i} className="card" style={{ padding: 20, display: 'flex', gap: 16 }}>
                  <Cover book={b} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Pill color={s.kind === 'review' ? 'var(--pulp)' : s.kind === 'thread' ? 'var(--plum)' : 'var(--moss)'}>
                        🔖 saved {s.kind}
                      </Pill>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>by <b>@{u.handle}</b> on <b>{b.title}</b> · {s.time}</span>
                    </div>
                    {s.kind === 'review' && (
                      <>
                        <div style={{ color: 'var(--pulp)', fontSize: 14, marginBottom: 6 }}>{'★'.repeat(s.rating)}</div>
                        <p style={{ fontSize: 14, lineHeight: 1.5 }}>{s.body}</p>
                      </>
                    )}
                    {s.kind === 'thread' && <div className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>{s.title}</div>}
                    {s.kind === 'comment' && (
                      <>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>on &quot;{s.onTitle}&quot;</div>
                        <p style={{ fontSize: 14, lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--moss)' }}>{s.body}</p>
                      </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>❤ {'reacts' in s ? s.reacts : savedCounts[i]}</span>
                      {'replies' in s && <span>💬 {s.replies}</span>}
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Unsave</button>
                      <button className="btn btn-outline btn-sm">Open →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
