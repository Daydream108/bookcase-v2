import { books, users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Cover } from '@/components/redesign/Cover'

export type Activity = {
  userId: string
  action: 'started' | 'finished' | 'logged' | 'shelved' | 'followed'
  bookId?: string
  targetUser?: string
  time: string
  note?: string
}

const actionText: Record<Activity['action'], string> = {
  started: 'started reading',
  finished: 'finished',
  logged: 'logged a session on',
  shelved: 'added to want-to-read',
  followed: 'started following',
}

export function ActivityRow({ activity }: { activity: Activity }) {
  const user = users.find((u) => u.id === activity.userId)!
  const book = activity.bookId ? books.find((b) => b.id === activity.bookId) : null
  const targetUser = activity.targetUser ? users.find((u) => u.id === activity.targetUser) : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      <Avatar user={user} size={32} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
        <b>{user.name}</b>
        <span style={{ color: 'var(--ink-3)' }}> {actionText[activity.action]} </span>
        {book && <b>{book.title}</b>}
        {targetUser && <b>@{targetUser.handle}</b>}
        <span style={{ color: 'var(--ink-4)', fontSize: 12, marginLeft: 8 }}>· {activity.time}</span>
        {activity.note && (
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontStyle: 'italic' }}>&quot;{activity.note}&quot;</div>
        )}
      </div>
      {book && <Cover book={book} size={44} />}
    </div>
  )
}
