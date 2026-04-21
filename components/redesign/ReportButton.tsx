'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createContentReport, type DbContentReport } from '@/lib/db'

const REPORT_REASONS: Array<{
  value: DbContentReport['reason_category']
  label: string
}> = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spoilers', label: 'Unmarked spoilers' },
  { value: 'spam', label: 'Spam' },
  { value: 'hate', label: 'Hate or abuse' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'other', label: 'Other' },
]

export function ReportButton({
  entityType,
  entityId,
  targetUserId,
  compact = false,
}: {
  entityType: DbContentReport['entity_type']
  entityId: string
  targetUserId?: string | null
  compact?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DbContentReport['reason_category']>('harassment')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await createContentReport(supabase, {
        entityType,
        entityId,
        targetUserId: targetUserId ?? null,
        reasonCategory: reason,
        details,
      })
      setDetails('')
      setOpen(false)
      setMessage('Reported. Thanks for flagging it.')
      window.setTimeout(() => setMessage(''), 2600)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send report')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className={compact ? 'btn btn-ghost btn-sm' : 'btn btn-outline btn-sm'}
        onClick={() => {
          setOpen((current) => !current)
          setMessage('')
        }}
      >
        Report
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 40,
            width: 260,
            padding: 14,
            display: 'grid',
            gap: 10,
          }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Report content
          </div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DbContentReport['reason_category'])}
            style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
          >
            {REPORT_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Optional details"
            style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} className="btn btn-pulp btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? 'Sending...' : 'Send report'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>{message}</div>
      )}
    </div>
  )
}
