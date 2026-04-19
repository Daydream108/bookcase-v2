'use client'

export function FeedTabs({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const tabs = [
    { id: 'following', label: 'Following', count: 14 },
    { id: 'threads', label: 'Hot threads', count: 8 },
    { id: 'discover', label: 'Discover', count: null as number | null },
    { id: 'authors', label: 'Authors', count: 6 },
  ]
  return (
    <div className="tabs" style={{ marginBottom: 24 }}>
      {tabs.map((t) => (
        <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
          {t.label}
          {t.count && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 6 }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
