import type { User } from '@/lib/redesign-data'

export function Avatar({
  user,
  size = 32,
  className = '',
}: {
  user: User
  size?: number
  className?: string
}) {
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={'avatar ' + className}
      style={{
        width: size,
        height: size,
        background: user.color || 'var(--pulp)',
        fontSize: size * 0.42,
      }}
    >
      {initials}
    </div>
  )
}
