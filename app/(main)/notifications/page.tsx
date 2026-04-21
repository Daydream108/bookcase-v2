'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/redesign/Avatar'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  listNotifications,
  markNotificationsRead,
  toUiUser,
  type DbNotification,
  type DbProfile,
} from '@/lib/db'

const typeLabel: Record<string, string> = {
  follow: 'started following you',
  like: 'liked your review',
  comment: 'commented on your post',
  review_on_book: 'reviewed a book',
  list_mention: 'mentioned you in a list',
  club_invite: 'invited you to a club',
  roadmap_status: 'roadmap status changed',
  upvote: 'upvoted your post',
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [items, setItems] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await listNotifications(supabase, 50)
    setItems(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(p)
      if (p) await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const markAll = async () => {
    await markNotificationsRead(supabase)
    await refresh()
  }

  if (!loading && !me) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">Sign in to see notifications</h1>
        <Link href="/login" className="btn btn-pulp" style={{ marginTop: 16 }}>Sign in</Link>
      </div>
    )
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Activity hub</div>
          <h1 className="display-lg">
            Your corner<br />
            <i style={{ color: 'var(--pulp)' }}>of the noise.</i>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAll}>
              Mark all read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          <Icon name="bell" size={28} />
          <div style={{ marginTop: 12, fontSize: 14 }}>You&apos;re all caught up.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Notifications will appear here when other readers follow, like, or reply to you.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {items.map((n, i) => {
            const actor = toUiUser(n.actor ?? null)
            return (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                  background: !n.is_read ? 'var(--pulp-soft)' : 'transparent',
                  position: 'relative',
                }}
              >
                {!n.is_read && (
                  <div style={{ position: 'absolute', left: 6, top: 26, width: 6, height: 6, borderRadius: 99, background: 'var(--pulp)' }} />
                )}
                {n.actor ? (
                  <Avatar user={actor} size={40} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--pulp-soft)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                    🔔
                  </div>
                )}
                <div style={{ flex: 1, fontSize: 14 }}>
                  <div>
                    {n.actor && <b>{actor.name} </b>}
                    <span>{typeLabel[n.type] ?? n.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
