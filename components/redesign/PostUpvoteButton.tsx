'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { togglePostUpvote } from '@/lib/db'

export function PostUpvoteButton({
  postId,
  initialCount,
  initialUpvoted = false,
  size = 'sm',
}: {
  postId: string
  initialCount: number
  initialUpvoted?: boolean
  size?: 'sm' | 'md'
}) {
  const supabase = useMemo(() => createClient(), [])
  const [upvoted, setUpvoted] = useState(initialUpvoted)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    setPending(true)
    const next = !upvoted
    setUpvoted(next)
    setCount((c) => c + (next ? 1 : -1))
    try {
      const result = await togglePostUpvote(supabase, postId)
      if (result !== next) {
        setUpvoted(result)
        setCount((c) => c + (result === next ? 0 : result ? 1 : -1))
      }
    } catch {
      setUpvoted(!next)
      setCount((c) => c + (next ? -1 : 1))
    } finally {
      setPending(false)
    }
  }

  const padding = size === 'md' ? '8px 14px' : '6px 12px'
  const fontSize = size === 'md' ? 13 : 12

  return (
    <button
      onClick={onClick}
      disabled={pending}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        borderRadius: 99,
        border: '1px solid ' + (upvoted ? 'var(--pulp)' : 'var(--border)'),
        background: upvoted ? 'var(--pulp-soft)' : 'var(--paper-2)',
        color: upvoted ? 'var(--pulp)' : 'var(--ink-3)',
        cursor: pending ? 'wait' : 'pointer',
        fontSize,
        fontWeight: 600,
        transition: 'background 120ms',
      }}
    >
      <span style={{ fontSize: fontSize + 1 }}>{upvoted ? '▲' : '△'}</span>
      <span className="mono">{count}</span>
    </button>
  )
}
