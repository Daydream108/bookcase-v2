export default function SettingsPage() {
  const sections = [
    { title: 'Profile', desc: 'The identity readers meet when they land on your shelf.' },
    { title: 'Privacy & spoilers', desc: 'Who sees your shelf, and how much.' },
    { title: 'Notifications', desc: 'Threads, replies, author drops, badge unlocks.' },
    { title: 'Account', desc: 'Email, username, session, sign out.' },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 40px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Reader settings</div>
      <h1 className="display-lg" style={{ marginBottom: 30 }}>Make it yours.</h1>

      {sections.map((s, i) => (
        <div key={i} className="card" style={{ padding: 24, marginBottom: 14 }}>
          <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>{s.title}</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>{s.desc}</p>
          {i === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input defaultValue="Brett" placeholder="display name" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
              <input defaultValue="Brooklyn, NY" placeholder="location" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
              <textarea
                defaultValue="book twin with nobody yet. currently spiraling about the secret history."
                rows={3}
                style={{ gridColumn: '1 / -1', padding: 10, border: '1px solid var(--border)', borderRadius: 10, resize: 'none', fontFamily: 'inherit' }}
              />
              <button className="btn btn-pulp btn-sm" style={{ justifySelf: 'start' }}>Save changes</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
