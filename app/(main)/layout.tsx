import { MainShell } from '@/components/redesign/MainShell'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainShell>{children}</MainShell>
}
