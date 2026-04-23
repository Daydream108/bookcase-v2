'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/redesign/Avatar'
import { StateCard } from '@/components/redesign/StateCard'
import { createClient } from '@/lib/supabase/client'
import {
  grantModeratorRole,
  getCurrentProfile,
  isModerator,
  listBlockedUsers,
  listContentReports,
  listModerators,
  revokeModeratorRole,
  searchProfiles,
  toUiUser,
  toggleBlockUser,
  updateContentReportStatus,
  type DbBlockedUser,
  type DbContentReport,
  type DbContentReportRow,
  type DbModeratorUser,
  type DbProfile,
} from '@/lib/db'

export default function SafetyPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<DbProfile | null>(null)
  const [myReports, setMyReports] = useState<DbContentReportRow[]>([])
  const [blockedUsers, setBlockedUsers] = useState<DbBlockedUser[]>([])
  const [moderator, setModerator] = useState(false)
  const [moderators, setModerators] = useState<DbModeratorUser[]>([])
  const [moderationStatus, setModerationStatus] = useState<DbContentReport['status'] | 'all'>('open')
  const [moderationQueue, setModerationQueue] = useState<DbContentReportRow[]>([])
  const [reportTargets, setReportTargets] = useState<Record<string, string>>({})
  const [moderatorSearch, setModeratorSearch] = useState('')
  const [moderatorResults, setModeratorResults] = useState<DbProfile[]>([])
  const [searchingModerators, setSearchingModerators] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [workingReportId, setWorkingReportId] = useState<string | null>(null)
  const [workingBlockId, setWorkingBlockId] = useState<string | null>(null)
  const [workingModeratorId, setWorkingModeratorId] = useState<string | null>(null)

  const loadAll = async () => {
    const profile = await getCurrentProfile(supabase)
    setMe(profile)

    if (!profile) {
      setMyReports([])
      setBlockedUsers([])
      setModerationQueue([])
      setModerators([])
      setReportTargets({})
      setModeratorResults([])
      setModerator(false)
      setLoading(false)
      return
    }

    const canModerate = await isModerator(supabase)
    const [reports, blocks, moderation, moderatorRows] = await Promise.all([
      listContentReports(supabase, { scope: 'mine', status: 'all', limit: 50 }),
      listBlockedUsers(supabase),
      canModerate
        ? listContentReports(supabase, {
            scope: 'moderation',
            status: moderationStatus,
            limit: 60,
          })
        : Promise.resolve([]),
      canModerate ? listModerators(supabase) : Promise.resolve([]),
    ])

    setModerator(canModerate)
    setMyReports(reports)
    setBlockedUsers(blocks)
    setModerationQueue(moderation)
    setModerators(moderatorRows)
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, moderationStatus])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const nextTargets = await buildReportTargets(supabase, [...myReports, ...moderationQueue])
      if (!cancelled) setReportTargets(nextTargets)
    })()

    return () => {
      cancelled = true
    }
  }, [moderationQueue, myReports, supabase])

  useEffect(() => {
    if (!moderator || !moderatorSearch.trim()) {
      setModeratorResults([])
      setSearchingModerators(false)
      return
    }

    let cancelled = false
    setSearchingModerators(true)

    const timeout = window.setTimeout(async () => {
      try {
        const foundProfiles = await searchProfiles(supabase, moderatorSearch, 8)
        if (cancelled) return
        const existingModeratorIds = new Set(moderators.map((entry) => entry.user_id))
        setModeratorResults(
          foundProfiles.filter((profile) => !existingModeratorIds.has(profile.id))
        )
      } finally {
        if (!cancelled) setSearchingModerators(false)
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [moderator, moderatorSearch, moderators, supabase])

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

  const addModerator = async (profile: DbProfile) => {
    setWorkingModeratorId(profile.id)
    try {
      await grantModeratorRole(supabase, profile.id)
      await loadAll()
      setModeratorSearch('')
      setModeratorResults([])
      setNotice(`${profile.display_name ?? profile.username ?? 'Reader'} can now moderate`)
    } catch (error) {
      setNotice((error as Error).message || 'Could not grant moderator access')
    } finally {
      setWorkingModeratorId(null)
      window.setTimeout(() => setNotice(''), 2400)
    }
  }

  const removeModerator = async (entry: DbModeratorUser) => {
    setWorkingModeratorId(entry.user_id)
    try {
      await revokeModeratorRole(supabase, entry.user_id)
      await loadAll()
      setNotice(`${entry.profile?.display_name ?? entry.profile?.username ?? 'Reader'} removed`)
    } catch (error) {
      setNotice((error as Error).message || 'Could not remove moderator access')
    } finally {
      setWorkingModeratorId(null)
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
          Safety tools
          <br />
          <i style={{ color: 'var(--pulp)' }}>for Bookcase.</i>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 680 }}>
          Review reports, manage blocked readers, and handle the moderation queue.
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
          <StateCard
            icon="shield"
            title="No reports filed"
            body="If something crosses the line on Bookcase, your submitted reports will show up here."
            compact
          />
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
                {reportTargets[report.id] && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <Link href={reportTargets[report.id]} className="btn btn-outline btn-sm">
                      Open content
                    </Link>
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
          <StateCard
            icon="user"
            title="No blocked readers"
            body="Readers you block will show up here so you can review or undo that decision."
            compact
          />
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
        <>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <div className="eyebrow">Moderator access</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {moderators.length} moderators
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.5 }}>
              Add or remove moderators from this page. The first moderator still has to be added in SQL.
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                value={moderatorSearch}
                onChange={(event) => setModeratorSearch(event.target.value)}
                placeholder="Search readers to grant moderator access"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 14,
                  border: '1px solid var(--border-2)',
                  borderRadius: 16,
                  background: 'var(--paper)',
                }}
              />
            </div>

            {moderatorSearch.trim() && (
              <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                {searchingModerators ? (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Searching readers...</div>
                ) : moderatorResults.length === 0 ? (
                  <StateCard
                    icon="search"
                    title="No reader matches"
                    body="Try a different username or display name. Existing moderators are excluded from these results."
                    compact
                  />
                ) : (
                  moderatorResults.map((profile) => {
                    const uiUser = toUiUser(profile)
                    return (
                      <div
                        key={profile.id}
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
                        <Avatar user={uiUser} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{uiUser.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>@{uiUser.handle}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-pulp btn-sm"
                          disabled={workingModeratorId === profile.id}
                          onClick={() => addModerator(profile)}
                        >
                          {workingModeratorId === profile.id ? 'Granting...' : 'Grant access'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {moderators.length === 0 ? (
              <StateCard
                icon="shield"
                title="No moderators found"
                body="The first moderator still needs to be added in SQL before in-app moderator management can take over."
                compact
              />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {moderators.map((entry) => {
                  const uiUser = toUiUser(entry.profile)
                  const isLastModerator = moderators.length === 1 && entry.user_id === me?.id
                  return (
                    <div
                      key={entry.user_id}
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
                      <Avatar user={uiUser} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {uiUser.name}
                          {entry.user_id === me?.id ? ' (you)' : ''}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          @{uiUser.handle} - added {new Date(entry.added_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={workingModeratorId === entry.user_id || isLastModerator}
                        onClick={() => removeModerator(entry)}
                      >
                        {isLastModerator
                          ? 'Keep one moderator'
                          : workingModeratorId === entry.user_id
                            ? 'Removing...'
                            : 'Remove access'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
                      {reportTargets[report.id] && (
                        <Link href={reportTargets[report.id]} className="btn btn-outline btn-sm">
                          Open content
                        </Link>
                      )}
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
        </>
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

async function buildReportTargets(
  supabase: ReturnType<typeof createClient>,
  reports: DbContentReportRow[]
) {
  if (!reports.length) return {}

  const reviewIds = reports
    .filter((report) => report.entity_type === 'review')
    .map((report) => report.entity_id)
  const postIds = reports
    .filter((report) => report.entity_type === 'book_post')
    .map((report) => report.entity_id)
  const commentIds = reports
    .filter((report) => report.entity_type === 'book_post_comment')
    .map((report) => report.entity_id)

  const [{ data: reviews }, { data: comments }] = await Promise.all([
    reviewIds.length
      ? supabase.from('reviews').select('id, book_id').in('id', reviewIds)
      : Promise.resolve({ data: [] as Array<{ id: string; book_id: string }> }),
    commentIds.length
      ? supabase.from('book_post_comments').select('id, post_id').in('id', commentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; post_id: string }> }),
  ])

  const postIdSet = new Set(postIds)
  for (const comment of comments ?? []) {
    if (comment.post_id) postIdSet.add(comment.post_id)
  }

  const { data: posts } = postIdSet.size
    ? await supabase.from('book_posts').select('id, book_id').in('id', [...postIdSet])
    : { data: [] as Array<{ id: string; book_id: string }> }

  const reviewTargetById = new Map(
    (reviews ?? []).map((review) => [review.id, `/book/${review.book_id}#review-${review.id}`])
  )
  const postBookIdById = new Map((posts ?? []).map((post) => [post.id, post.book_id]))

  const nextTargets: Record<string, string> = {}
  for (const report of reports) {
    if (report.entity_type === 'review') {
      nextTargets[report.id] = reviewTargetById.get(report.entity_id) ?? ''
      continue
    }

    if (report.entity_type === 'book_post') {
      const bookId = postBookIdById.get(report.entity_id)
      nextTargets[report.id] = bookId ? `/book/${bookId}#thread-${report.entity_id}` : ''
      continue
    }

    if (report.entity_type === 'book_post_comment') {
      const comment = (comments ?? []).find((row) => row.id === report.entity_id)
      const bookId = comment ? postBookIdById.get(comment.post_id) : null
      nextTargets[report.id] = bookId ? `/book/${bookId}#comment-${report.entity_id}` : ''
      continue
    }

    if (report.entity_type === 'club') {
      nextTargets[report.id] = `/clubs/${report.entity_id}`
    }
  }

  return nextTargets
}
