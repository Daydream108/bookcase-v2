'use client'

import { useState } from 'react'

const FIVE_STARS = '★★★★★'

export function StarDisplay({
  value,
  size = 14,
  filledColor = 'var(--pulp)',
  emptyColor = 'var(--ink-4)',
}: {
  value: number
  size?: number
  filledColor?: string
  emptyColor?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: 1,
      }}
    >
      <span style={{ color: emptyColor }}>{FIVE_STARS}</span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          color: filledColor,
          width: `${pct}%`,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {FIVE_STARS}
      </span>
    </span>
  )
}

export function HalfStarInput({
  value,
  onChange,
  size = 28,
  filledColor = 'var(--pulp)',
  emptyColor = 'var(--ink-4)',
  allowClear = true,
}: {
  value: number
  onChange: (next: number) => void
  size?: number
  filledColor?: string
  emptyColor?: string
  allowClear?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHover(null)}
      style={{ display: 'inline-flex', gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const leftValue = star - 0.5
        const rightValue = star
        const leftFilled = shown >= leftValue
        const rightFilled = shown >= rightValue
        return (
          <span
            key={star}
            style={{
              position: 'relative',
              display: 'inline-block',
              width: size,
              height: size,
              fontSize: size,
              lineHeight: 1,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                color: emptyColor,
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              &#9733;
            </span>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '50%',
                overflow: 'hidden',
                color: leftFilled ? filledColor : emptyColor,
                pointerEvents: 'none',
              }}
            >
              &#9733;
            </span>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                overflow: 'hidden',
                color: rightFilled ? filledColor : emptyColor,
                pointerEvents: 'none',
                textAlign: 'right',
              }}
            >
              <span style={{ display: 'inline-block', transform: 'translateX(-50%)' }}>
                &#9733;
              </span>
            </span>

            <button
              type="button"
              aria-label={`${leftValue} stars`}
              onMouseEnter={() => setHover(leftValue)}
              onClick={() => onChange(allowClear && value === leftValue ? 0 : leftValue)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '50%',
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                zIndex: 1,
              }}
            />
            <button
              type="button"
              aria-label={`${rightValue} stars`}
              onMouseEnter={() => setHover(rightValue)}
              onClick={() => onChange(allowClear && value === rightValue ? 0 : rightValue)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                zIndex: 1,
              }}
            />
          </span>
        )
      })}
    </div>
  )
}
