'use client'

import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'
import { Spoiler, VoteBar } from '@/components/redesign/primitives'

export type Review = {
  userId: string
  bookId: string
  rating: number
  time: string
  bodyPre?: string
  spoiler?: string
  bodyPost?: string
  tags?: string[]
  reactions?: { emoji: string; count: number; initial?: boolean }[]
  replies: number
}

export function ReviewCard({ review }: { review: Review }) {
  const book = books.find((b) => b.id === review.bookId)!
  const user = users.find((u) => u.id === review.userId)!
  return (
    <article className="card" style={{ padding: 24, background: 'var(--paper)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Avatar user={user} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14 }}>
            <b>{user.name}</b>
            <span style={{ color: 'var(--ink-3)' }}> rated </span>
            <b>{book.title}</b>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>@{user.handle} · {review.time}</div>
        </div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', color: 'var(--pulp)', fontSize: 16 }}>
          {'★'.repeat(Math.floor(review.rating))}
          {review.rating % 1 ? '½' : ''}
          <span style={{ color: 'var(--ink-4)' }}>{'★'.repeat(5 - Math.ceil(review.rating))}</span>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 20 }}>
        <Cover book={book} size={88} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="serif" style={{ fontSize: 26, lineHeight: 1.1, marginBottom: 4 }}>{book.title}</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
            {book.author.toUpperCase()} · {book.year} · {book.pages}p
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink)' }}>
            {review.bodyPre}
            {review.spoiler && (
              <>
                <span className="spoiler-tag">⚠ SPOILER</span> <Spoiler>{review.spoiler}</Spoiler>{' '}
              </>
            )}
            {review.bodyPost}
          </p>
          {review.tags && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {review.tags.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <VoteBar initialScore={(review.reactions || []).reduce((a, r) => a + (r.count || 0), 0)} />
        <button className="btn btn-ghost btn-sm"><Icon name="message" size={14} /> {review.replies}</button>
        <button className="btn btn-ghost btn-sm"><Icon name="bookmark" size={14} /> Save</button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><Icon name="share" size={14} /> Share</button>
      </footer>
    </article>
  )
}
