'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  deleteNotifications,
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

type NotificationFilter = 'all' | 'unread' | 'social' | 'discussions' | 'clubs' | 'updates'

const filterLabels: Record<NotificationFilter, string> = {
  all: 'All',
  unread: 'Unread',
  social: 'Social',
  discussions: 'Discussions',
  clubs: 'Clubs',
  updates: 'Updates',
}

const NOTIFICATION_FILTER_STORAGE_KEY = 'bookcase:notification-filter'

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [items, setItems] = useState<DbNotification[]>([])
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    const data = await listNotifications(supabase, 50)
    setItems(data)
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const profile = await getCurrentProfile(supabase)
      if (cancelled) return
      setMe(profile)
      if (profile) await refresh()
      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!items.length) {
        if (!cancelled) setTargets({})
        return
      }

      const reviewIds = items
        .filter((item) => item.entity_type === 'review' && item.entity_id)
        .map((item) => item.entity_id as string)
      const postIds = items
        .filter((item) => item.entity_type === 'book_post' && item.entity_id)
        .map((item) => item.entity_id as string)
      const commentIds = items
        .filter((item) => item.entity_type === 'comment' && item.entity_id)
        .map((item) => item.entity_id as string)

      const [{ data: reviews }, { data: comments }] = await Promise.all([
        reviewIds.length
          ? supabase.from('reviews').select('id, book_id').in('id', reviewIds)
          : Promise.resolve({ data: [] as Array<{ id: string; book_id: string }> }),
        commentIds.length
          ? supabase.from('book_post_comments').select('id, post_id').in('id', commentIds)
          : Promise.resolve({ data: [] as Array<{ id: string; post_id: string }> }),
      ])

      const postIdSet = new Set(postIds)
      for (const comment of comments ?? []) {
        if (comment.post_id) postIdSet.add(comment.post_id)
      }

      const { data: posts } = postIdSet.size
        ? await supabase.from('book_posts').select('id, book_id').in('id', [...postIdSet])
        : { data: [] as Array<{ id: string; book_id: string }> }

      if (cancelled) return

      const reviewTargetById = new Map(
        (reviews ?? []).map((row) => [row.id, `/book/${row.book_id}#review-${row.id}`])
      )
      const postBookIdById = new Map((posts ?? []).map((row) => [row.id, row.book_id]))

      const nextTargets: Record<string, string> = {}
      for (const item of items) {
        if (item.type === 'follow' && item.actor) {
          nextTargets[item.id] = `/profile/${item.actor.username ?? item.actor.id}`
          continue
        }

        if (item.entity_type === 'review' && item.entity_id) {
          nextTargets[item.id] = reviewTargetById.get(item.entity_id) ?? ''
          continue
        }

        if (item.entity_type === 'book_post' && item.entity_id) {
          const bookId = postBookIdById.get(item.entity_id)
          nextTargets[item.id] = bookId ? `/book/${bookId}#thread-${item.entity_id}` : ''
          continue
        }

        if (item.entity_type === 'comment' && item.entity_id) {
          const comment = (comments ?? []).find((row) => row.id === item.entity_id)
          const bookId = comment ? postBookIdById.get(comment.post_id) : null
          nextTargets[item.id] = bookId ? `/book/${bookId}#comment-${item.entity_id}` : ''
          continue
        }

        if (item.entity_type === 'club' && item.entity_id) {
          nextTargets[item.id] = `/clubs/${item.entity_id}`
          continue
        }

        if (item.entity_type === 'roadmap_feature') {
          nextTargets[item.id] = '/roadmap'
        }
      }

      setTargets(nextTargets)
    })()

    return () => {
      cancelled = true
    }
  }, [items, supabase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedFilter = window.localStorage.getItem(NOTIFICATION_FILTER_STORAGE_KEY)
    if (!savedFilter) return
    if (
      ['all', 'unread', 'social', 'discussions', 'clubs', 'updates'].includes(savedFilter)
    ) {
      setFilter(savedFilter as NotificationFilter)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(NOTIFICATION_FILTER_STORAGE_KEY, filter)
  }, [filter])

  const markOneRead = async (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    )
    await markNotificationsRead(supabase, [id])
  }

  if (!loading && !me) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 className="display-md">Sign in to see notifications</h1>
        <Link href="/login" className="btn btn-pulp" style={{ marginTop: 16 }}>
          Sign in
        </Link>
      </div>
    )
  }

  const unreadCount = items.filter((item) => !item.is_read).length
  const visibleItems = items.filter((item) => matchesFilter(item, filter))
  const unreadVisibleIds = visibleItems
    .filter((item) => !item.is_read)
    .map((item) => item.id)
  const clearableVisibleIds = visibleItems
    .filter((item) => item.is_read)
    .map((item) => item.id)
  const filterCounts = {
    all: items.length,
    unread: items.filter((item) => !item.is_read).length,
    social: items.filter((item) => matchesFilter(item, 'social')).length,
    discussions: items.filter((item) => matchesFilter(item, 'discussions')).length,
    clubs: items.filter((item) => matchesFilter(item, 'clubs')).length,
    updates: items.filter((item) => matchesFilter(item, 'updates')).length,
  } satisfies Record<NotificationFilter, number>

  const markVisibleRead = async () => {
    if (!unreadVisibleIds.length) return

    setItems((current) =>
      current.map((item) =>
        unreadVisibleIds.includes(item.id) ? { ...item, is_read: true } : item
      )
    )
    setNotice(
      `${filter === 'all' ? 'All unread notifications' : 'Visible notifications'} marked read`
    )

    try {
      await markNotificationsRead(supabase, unreadVisibleIds)
    } catch (error) {
      setNotice((error as Error).message || 'Could not mark notifications read.')
      await refresh()
    }
  }

  const clearVisibleRead = async () => {
    if (!clearableVisibleIds.length) return

    const previousItems = items
    setItems((current) => current.filter((item) => !clearableVisibleIds.includes(item.id)))
    setNotice(
      `${filter === 'all' ? 'Read notifications' : 'Visible read notifications'} cleared`
    )

    try {
      await deleteNotifications(supabase, clearableVisibleIds)
    } catch (error) {
      setItems(previousItems)
      setNotice((error as Error).message || 'Could not clear notifications.')
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Notifications
          </div>
          <h1 className="display-lg">
            Activity from
            <br />
            <i style={{ color: 'var(--pulp)' }}>your readers.</i>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadVisibleIds.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markVisibleRead}>
              {filter === 'all' ? 'Mark all read' : 'Mark visible read'} ({unreadVisibleIds.length})
            </button>
          )}
          {clearableVisibleIds.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearVisibleRead}>
              {filter === 'all' ? 'Clear read' : 'Clear visible'} ({clearableVisibleIds.length})
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="card" style={{ padding: 14, marginBottom: 18, color: 'var(--ink-2)' }}>
          {notice}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="tabs" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            {(['all', 'unread', 'social', 'discussions', 'clubs', 'updates'] as NotificationFilter[]).map(
              (item) => (
                <button
                  key={item}
                  className={'tab' + (filter === item ? ' active' : '')}
                  onClick={() => setFilter(item)}
                >
                  {filterLabels[item]}
                  <span
                    className="mono"
                    style={{ fontSize: 11, marginLeft: 4, color: 'var(--ink-4)' }}
                  >
                    {filterCounts[item]}
                  </span>
                </button>
              )
            )}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
            Filter saved on this device.
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Loading...</div>
      ) : visibleItems.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          <Icon name="bell" size={28} />
          <div style={{ marginTop: 12, fontSize: 14 }}>You&apos;re all caught up.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            {items.length
              ? 'Nothing matches this filter right now.'
              : 'Notifications show up when readers follow, like, or reply to you.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {visibleItems.map((item, index) => {
            const actor = toUiUser(item.actor ?? null)
            const href = targets[item.id]

            const row = (
              <div
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  borderBottom:
                    index < visibleItems.length - 1 ? '1px solid var(--border)' : 'none',
                  background: !item.is_read ? 'var(--pulp-soft)' : 'transparent',
                  position: 'relative',
                  color: 'inherit',
                  textDecoration: 'none',
                  cursor: href ? 'pointer' : 'default',
                }}
              >
                {!item.is_read && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 6,
                      top: 26,
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: 'var(--pulp)',
                    }}
                  />
                )}
                {item.actor ? (
                  <Avatar user={actor} size={40} />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      background: 'var(--pulp-soft)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--pulp)',
                    }}
                  >
                    <Icon name="bell" size={18} />
                  </div>
                )}
                <div style={{ flex: 1, fontSize: 14 }}>
                  <div>
                    {item.actor && <b>{actor.name} </b>}
                    <span>{typeLabel[item.type] ?? item.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                {href && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-4)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Open
                  </div>
                )}
              </div>
            )

            if (!href) {
              return <div key={item.id}>{row}</div>
            }

            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => {
                  if (!item.is_read) void markOneRead(item.id)
                }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {row}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function matchesFilter(item: DbNotification, filter: NotificationFilter) {
  switch (filter) {
    case 'unread':
      return !item.is_read
    case 'social':
      return item.type === 'follow' || item.type === 'like'
    case 'discussions':
      return (
        item.type === 'comment' ||
        item.type === 'upvote' ||
        item.type === 'review_on_book' ||
        item.type === 'list_mention'
      )
    case 'clubs':
      return item.type === 'club_invite'
    case 'updates':
      return item.type === 'roadmap_status'
    default:
      return true
  }
}
