'use client'

import { useEffect, useState } from 'react'
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
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [user.avatar])

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {user.avatar && !imageFailed && (
        <img
          src={user.avatar}
          alt={user.name}
          onError={() => setImageFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      {initials}
    </div>
  )
}
