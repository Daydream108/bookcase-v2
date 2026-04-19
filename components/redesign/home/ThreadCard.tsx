import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'
import { Icon } from '@/components/redesign/Icon'

export type Thread = {
  bookId: string
  title: string
  preview: string
  time: string
  hasSpoiler?: boolean
  chapter?: string
  replies: number
  upvotes: number
  participants: string[]
}

export function ThreadCard({ thread }: { thread: Thread }) {
  const book = books.find((b) => b.id === thread.bookId)!
  return (
    <div className="card" style={{ padding: 20, background: 'var(--paper)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Cover book={book} size={32} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pulp)', fontWeight: 600 }}>
            r/{book.title.toLowerCase().replace(/\s+/g, '')}
          </span>
          <span> · {thread.time}</span>
        </div>
      </div>
      <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>{thread.title}</h3>
      {thread.hasSpoiler && (
        <div style={{ marginBottom: 8 }}>
          <span className="spoiler-tag">⚠ SPOILERS UP TO CH {thread.chapter}</span>
        </div>
      )}
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 16 }}>{thread.preview}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-3)' }}>
          <div style={{ display: 'flex' }}>
            {thread.participants.map((uid, i) => {
              const u = users.find((x) => x.id === uid)!
              return (
                <div key={uid} style={{ marginLeft: i === 0 ? 0 : -6, border: '2px solid var(--paper)', borderRadius: 99 }}>
                  <Avatar user={u} size={22} />
                </div>
              )
            })}
          </div>
          <span>
            <b style={{ color: 'var(--ink-2)' }}>{thread.replies}</b> replies ·{' '}
            <b style={{ color: 'var(--ink-2)' }}>{thread.upvotes}</b> ↑
          </span>
        </div>
        <button className="btn btn-outline btn-sm">Open thread <Icon name="arrow" size={12} /></button>
      </div>
    </div>
  )
}
