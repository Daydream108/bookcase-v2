'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleLike } from '@/lib/db'

export function LikeButton({
  reviewId,
  initialCount,
  initialLiked = false,
}: {
  reviewId: string
  initialCount: number
  initialLiked?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  const onClick = async () => {
    if (pending) return
    setPending(true)
    const next = !liked
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    try {
      const result = await toggleLike(supabase, reviewId)
      if (result !== next) {
        setLiked(result)
        setCount((c) => c + (result === next ? 0 : result ? 1 : -1))
      }
    } catch {
      setLiked(!next)
      setCount((c) => c + (next ? -1 : 1))
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 99,
        border: '1px solid ' + (liked ? 'var(--pulp)' : 'var(--border)'),
        background: liked ? 'var(--pulp-soft)' : 'var(--paper-2)',
        color: liked ? 'var(--pulp)' : 'var(--ink-3)',
        cursor: pending ? 'wait' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        transition: 'background 120ms',
      }}
    >
      <span style={{ fontSize: 13 }}>{liked ? '▲' : '△'}</span>
      <span className="mono">{count}</span>
    </button>
  )
}
