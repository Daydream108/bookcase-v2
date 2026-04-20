'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { users } from '@/lib/redesign-data'
import { Avatar } from '@/components/redesign/Avatar'
import { Icon } from '@/components/redesign/Icon'

const items = [
  { href: '/home', icon: 'home', label: 'Home' },
  { href: '/search', icon: 'search', label: 'Search' },
  { href: '/explore', icon: 'compass', label: 'Explore' },
  { href: '/clubs', icon: 'users', label: 'Clubs' },
  { href: '/streak', icon: 'flame', label: 'Streak' },
  { href: '/notifications', icon: 'bell', label: 'Notifications' },
  { href: '/profile/brett', icon: 'user', label: 'Profile' },
  { href: '/roadmap', icon: 'map', label: 'Roadmap' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
] as const

export function Sidebar({ unread = 3, open = false, onNavigate }: { unread?: number; open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const brett = users.find((u) => u.id === 'brett')!

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

      <button className="btn btn-pulp" style={{ margin: '0 4px 12px', justifyContent: 'center' }}>
        <Icon name="plus" size={14} /> Log a session
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== '/home' && pathname.startsWith(it.href))
          const badge = it.label === 'Notifications' ? unread : null
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
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1 }}>14</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>days 🔥</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '0 6px' }}>
          <Avatar user={brett} size={28} />
          <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Brett</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>@brett</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
