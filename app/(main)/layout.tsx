import { Sidebar } from '@/components/redesign/Sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: 'var(--paper)' }}>
      <Sidebar />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}
