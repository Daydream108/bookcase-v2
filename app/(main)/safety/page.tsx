'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { createClient } from '@/lib/supabase/client'
import {
  getCurrentProfile,
  isModerator,
  listBlockedUsers,
  listContentReports,
  toUiUser,
  toggleBlockUser,
  updateContentReportStatus,
  type DbBlockedUser,
  type DbContentReport,
  type DbContentReportRow,
  type DbProfile,
} from '@/lib/db'

export default function SafetyPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [myReports, setMyReports] = useState<DbContentReportRow[]>([])
  const [blockedUsers, setBlockedUsers] = useState<DbBlockedUser[]>([])
  const [moderator, setModerator] = useState(false)
  const [moderationStatus, setModerationStatus] = useState<DbContentReport['status'] | 'all'>('open')
  const [moderationQueue, setModerationQueue] = useState<DbContentReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [workingReportId, setWorkingReportId] = useState<string | null>(null)
  const [workingBlockId, setWorkingBlockId] = useState<string | null>(null)

  const loadAll = async () => {
    const profile = await getCurrentProfile(supabase)
    setMe(profile)

    if (!profile) {
      setMyReports([])
      setBlockedUsers([])
      setModerationQueue([])
      setModerator(false)
      setLoading(false)
      return
    }

    const canModerate = await isModerator(supabase)
    const [reports, blocks, moderation] = await Promise.all([
      listContentReports(supabase, { scope: 'mine', status: 'all', limit: 50 }),
      listBlockedUsers(supabase),
      canModerate
        ? listContentReports(supabase, {
            scope: 'moderation',
            status: moderationStatus,
            limit: 60,
          })
        : Promise.resolve([]),
    ])

    setModerator(canModerate)
    setMyReports(reports)
    setBlockedUsers(blocks)
    setModerationQueue(moderation)
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, moderationStatus])

  const unblockUser = async (user: DbBlockedUser) => {
    if (!user.profile) return
    setWorkingBlockId(user.blocked_user_id)
    try {
      await toggleBlockUser(supabase, user.blocked_user_id)
      await loadAll()
      setNotice('Reader unblocked')
    } catch (error) {
      setNotice((error as Error).message || 'Could not unblock reader')
    } finally {
      setWorkingBlockId(null)
      window.setTimeout(() => setNotice(''), 2400)
    }
  }

  const setReportStatus = async (
    reportId: string,
    status: DbContentReport['status']
  ) => {
    setWorkingReportId(reportId)
    try {
      await updateContentReportStatus(supabase, reportId, status)
      await loadAll()
      setNotice(`Report marked ${status}`)
    } catch (error) {
      setNotice((error as Error).message || 'Could not update report')
    } finally {
      setWorkingReportId(null)
      window.setTimeout(() => setNotice(''), 2400)
    }
  }

  if (!me && !loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 40px' }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Safety
          </div>
          <h1 className="display-md" style={{ marginBottom: 12 }}>
            Sign in to manage
            <br />
            <i style={{ color: 'var(--pulp)' }}>reports and blocks.</i>
          </h1>
          <Link href="/login" className="btn btn-pulp">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: '32px 24px 40px' }}>
      <div
        className="card"
        style={{
          padding: 28,
          marginBottom: 24,
          background: 'linear-gradient(135deg, var(--paper), color-mix(in oklab, var(--blush, #d16b5d) 10%, var(--paper)))',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Safety
        </div>
        <h1 className="display-lg" style={{ marginBottom: 10 }}>
          Keep the beta
          <br />
          <i style={{ color: 'var(--pulp)' }}>usable and safe.</i>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 680 }}>
          Review your reports, manage blocked readers, and if you have moderator access, work through the current queue without leaving the app.
        </p>
      </div>

      {notice && (
        <div className="card" style={{ padding: 14, marginBottom: 18, color: 'var(--ink-2)' }}>
          {notice}
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="eyebrow">Your reports</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {myReports.length} submitted
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading...</div>
        ) : myReports.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            You have not submitted any reports yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {myReports.map((report) => (
              <div
                key={report.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  background: 'var(--paper)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {labelForEntity(report.entity_type)} - {labelForReason(report.reason_category)}
                  </div>
                  <span className="chip">{report.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
                  Filed {new Date(report.created_at).toLocaleString()}
                </div>
                {report.details && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 8 }}>
                    {report.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: moderator ? 20 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="eyebrow">Blocked readers</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {blockedUsers.length} blocked
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading...</div>
        ) : blockedUsers.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            You are not blocking anyone right now.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {blockedUsers.map((entry) => {
              const uiUser = toUiUser(entry.profile)
              return (
                <div
                  key={entry.blocked_user_id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Avatar user={uiUser} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{uiUser.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      @{uiUser.handle} - blocked {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={workingBlockId === entry.blocked_user_id}
                    onClick={() => unblockUser(entry)}
                  >
                    {workingBlockId === entry.blocked_user_id ? 'Working...' : 'Unblock'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {moderator && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="eyebrow">Moderator queue</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={moderationStatus === status ? 'btn btn-pulp btn-sm' : 'btn btn-outline btn-sm'}
                  onClick={() => setModerationStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {moderationQueue.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              No reports in this queue right now.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {moderationQueue.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {labelForEntity(report.entity_type)} - {labelForReason(report.reason_category)}
                    </div>
                    <span className="chip">{report.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
                    Reporter @{report.reporter?.username ?? report.reporter?.display_name ?? 'reader'}
                    {report.target_user
                      ? ` - Target @${report.target_user.username ?? report.target_user.display_name ?? 'reader'}`
                      : ''}
                  </div>
                  {report.details && (
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 8 }}>
                      {report.details}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {(['reviewing', 'resolved', 'dismissed'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={workingReportId === report.id || report.status === status}
                        onClick={() => setReportStatus(report.id, status)}
                      >
                        {workingReportId === report.id && report.status !== status
                          ? 'Saving...'
                          : `Mark ${status}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function labelForEntity(entityType: DbContentReport['entity_type']) {
  switch (entityType) {
    case 'book_post':
      return 'Thread'
    case 'book_post_comment':
      return 'Comment'
    case 'club':
      return 'Club'
    default:
      return 'Review'
  }
}

function labelForReason(reason: DbContentReport['reason_category']) {
  switch (reason) {
    case 'self_harm':
      return 'Self-harm'
    case 'sexual_content':
      return 'Sexual content'
    default:
      return reason.replace(/_/g, ' ')
  }
}
