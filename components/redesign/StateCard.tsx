import Link from 'next/link'
import { Icon } from '@/components/redesign/Icon'

export function StateCard({
  icon = 'sparkles',
  title,
  body,
  actionLabel,
  actionHref,
  action,
  compact = false,
}: {
  icon?: string
  title: string
  body: string
  actionLabel?: string
  actionHref?: string
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      className="card"
      style={{
        padding: compact ? 24 : 32,
        textAlign: 'center',
        color: 'var(--ink-3)',
        display: 'grid',
        justifyItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: compact ? 42 : 52,
          height: compact ? 42 : 52,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--paper-2)',
          color: 'var(--pulp)',
          border: '1px solid var(--border)',
        }}
      >
        <Icon name={icon} size={compact ? 18 : 22} />
      </div>
      <div style={{ fontSize: compact ? 15 : 17, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 520 }}>{body}</div>
      {action ?? null}
      {!action && actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-outline btn-sm">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
