'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [userMenuOpen])

  useEffect(() => {
    setUserMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await getCurrentProfile(supabase)
      if (cancelled) return
      setProfile(p)
      if (p) {
        const [n, s] = await Promise.all([unreadNotificationCount(supabase), getStreak(supabase, p.id)])
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
    { href: '/safety', icon: 'shield', label: 'Safety' },
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
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--ink)',
            color: 'var(--paper)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 400,
            boxShadow: 'inset 0 0 0 2px var(--pulp)',
          }}
        >
          B
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em' }}>
          Bookcase
        </div>
      </div>

      <Link
        href="/streak"
        className="btn btn-pulp"
        style={{ margin: '0 4px 12px', justifyContent: 'center' }}
      >
        <Icon name="plus" size={14} /> Log a session
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          const badge = item.label === 'Notifications' && unread > 0 ? unread : null
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={'nav-item ' + (active ? 'active' : '')}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {badge ? <span className="badge">{badge}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div
          className="card"
          style={{
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 14,
            background: 'var(--paper-2)',
          }}
        >
          <div className="eyebrow" style={{ fontSize: 10 }}>
            Current streak
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1 }}>
              {streakDays}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>days active</div>
          </div>
        </div>
        <div ref={userMenuRef} style={{ position: 'relative', marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px',
              width: '100%',
              border: '1px solid transparent',
              background: userMenuOpen ? 'var(--paper-2)' : 'transparent',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Avatar user={uiUser} size={28} />
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uiUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>@{uiUser.handle}</div>
            </div>
            <Icon name="arrow" size={12} />
          </button>
          {userMenuOpen && (
            <div
              role="menu"
              className="card"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                zIndex: 20,
              }}
            >
              <Link
                href={`/profile/${handle}`}
                onClick={() => setUserMenuOpen(false)}
                role="menuitem"
                style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, textDecoration: 'none', color: 'inherit' }}
              >
                View profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                role="menuitem"
                style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, textDecoration: 'none', color: 'inherit' }}
              >
                Settings
              </Link>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  role="menuitem"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--pulp-deep)',
                    fontWeight: 600,
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
