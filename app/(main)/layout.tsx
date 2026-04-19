import { Sidebar } from '@/components/redesign/Sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: 240, minHeight: '100vh', background: 'var(--paper)' }}>{children}</div>
    </>
  )
}
