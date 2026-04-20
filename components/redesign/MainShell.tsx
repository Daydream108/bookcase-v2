'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/redesign/Sidebar'
import { Icon } from '@/components/redesign/Icon'

export function MainShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      {/* Scrim behind drawer on mobile */}
      <div
        className={'sidebar-scrim' + (open ? ' open' : '')}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div className="main-content" style={{ marginLeft: 240, minHeight: '100vh', background: 'var(--paper)' }}>
        {/* Mobile top bar — only shows ≤ 900px via CSS */}
        <header className="mobile-topbar">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{ padding: 8, borderRadius: 10, display: 'grid', placeItems: 'center' }}
          >
            <Icon name="menu" size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--ink)', color: 'var(--paper)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontSize: 17,
                boxShadow: 'inset 0 0 0 2px var(--pulp)',
              }}
            >
              B
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, letterSpacing: '-0.02em' }}>Bookcase</div>
          </div>
          <div style={{ width: 38 }} />
        </header>

        {children}
      </div>
    </>
  )
}
