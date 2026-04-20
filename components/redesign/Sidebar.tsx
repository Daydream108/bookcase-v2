'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { Icon } from '@/components/redesign/Icon'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  getStreak,
  toUiUser,
  unreadNotificationCount,
  type DbProfile,
} from '@/lib/db'

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [unread, setUnread] = useState(0)
  const [streakDays, setStreakDays] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await getCurrentProfile(supabase)
      if (cancelled) return
      setProfile(p)
      if (p) {
        const [n, s] = await Promise.all([
          unreadNotificationCount(supabase),
          getStreak(supabase, p.id),
        ])
        if (cancelled) return
        setUnread(n)
        setStreakDays(s.current_streak ?? 0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, pathname])

  const handle = profile?.username ?? 'me'
  const items = [
    { href: '/home', icon: 'home', label: 'Home' },
    { href: '/search', icon: 'search', label: 'Search' },
    { href: '/explore', icon: 'compass', label: 'Explore' },
    { href: '/clubs', icon: 'users', label: 'Clubs' },
    { href: '/streak', icon: 'flame', label: 'Streak' },
    { href: '/notifications', icon: 'bell', label: 'Notifications' },
    { href: `/profile/${handle}`, icon: 'user', label: 'Profile' },
    { href: '/roadmap', icon: 'map', label: 'Roadmap' },
    { href: '/settings', icon: 'settings', label: 'Settings' },
  ] as const

  const uiUser = toUiUser(profile)

  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px' }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--ink)', color: 'var(--paper)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400,
            boxShadow: 'inset 0 0 0 2px var(--pulp)',
          }}
        >
          B
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em' }}>Bookcase</div>
      </div>

      <Link href="/streak" className="btn btn-pulp" style={{ margin: '0 4px 12px', justifyContent: 'center' }}>
        <Icon name="plus" size={14} /> Log a session
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== '/home' && pathname.startsWith(it.href))
          const badge = it.label === 'Notifications' && unread > 0 ? unread : null
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={'nav-item ' + (active ? 'active' : '')}
            >
              <Icon name={it.icon} size={17} />
              <span>{it.label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--paper-2)' }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Current streak</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1 }}>{streakDays}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>days 🔥</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '0 6px' }}>
          <Avatar user={uiUser} size={28} />
          <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{uiUser.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>@{uiUser.handle}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--ink-3)', padding: 4, borderRadius: 6,
              }}
            >
              <Icon name="arrow" size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
