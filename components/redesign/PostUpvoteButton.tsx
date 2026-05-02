'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setPostVote, togglePostUpvote, type PostVote } from '@/lib/db'

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

  useEffect(() => {
    setUpvoted(initialUpvoted)
    setCount(initialCount)
  }, [initialCount, initialUpvoted])

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
    } catch (err) {
      console.error('upvote failed', err)
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

export function PostVoteButtons({
  postId,
  initialCount,
  initialVote = 0,
  size = 'sm',
}: {
  postId: string
  initialCount: number
  initialVote?: PostVote
  size?: 'sm' | 'md'
}) {
  const supabase = useMemo(() => createClient(), [])
  const [vote, setVote] = useState<PostVote>(initialVote)
  const [score, setScore] = useState(initialCount)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setVote(initialVote)
    setScore(initialCount)
  }, [initialCount, initialVote])

  const apply = async (direction: 1 | -1) => {
    if (pending) return
    const next: PostVote = vote === direction ? 0 : direction
    const prevVote = vote
    const prevScore = score
    setVote(next)
    setScore(score - prevVote + next)
    setPending(true)
    try {
      const result = await setPostVote(supabase, postId, next)
      if (result !== next) {
        setVote(result)
        setScore(prevScore - prevVote + result)
      }
    } catch (err) {
      console.error('vote failed', err)
      setVote(prevVote)
      setScore(prevScore)
    } finally {
      setPending(false)
    }
  }

  const handleClick = (direction: 1 | -1) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void apply(direction)
  }

  const pad = size === 'md' ? '8px 10px' : '6px 9px'
  const glyph = size === 'md' ? 14 : 13
  const countSize = size === 'md' ? 13 : 12

  const cellStyle = (active: boolean, accent: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: pad,
    background: 'transparent',
    border: 'none',
    cursor: pending ? 'wait' : 'pointer',
    color: active ? accent : 'var(--ink-3)',
    fontSize: glyph,
    fontWeight: 700,
    lineHeight: 1,
  })

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        borderRadius: 99,
        border:
          '1px solid ' +
          (vote === 1 ? 'var(--pulp)' : vote === -1 ? 'var(--ink-3)' : 'var(--border)'),
        background: 'var(--paper-2)',
      }}
    >
      <button
        type="button"
        aria-label="Upvote"
        onClick={handleClick(1)}
        disabled={pending}
        style={cellStyle(vote === 1, 'var(--pulp)')}
      >
        {vote === 1 ? '▲' : '△'}
      </button>
      <span
        className="mono"
        style={{
          fontSize: countSize,
          fontWeight: 600,
          minWidth: 18,
          textAlign: 'center',
          color: vote === 1 ? 'var(--pulp)' : vote === -1 ? 'var(--ink)' : 'var(--ink-2)',
        }}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={handleClick(-1)}
        disabled={pending}
        style={cellStyle(vote === -1, 'var(--ink)')}
      >
        {vote === -1 ? '▼' : '▽'}
      </button>
    </div>
  )
}
