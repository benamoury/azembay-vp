import { Sidebar } from './sidebar'
import { Toaster } from '@/components/ui/toaster'
import type { UserRole } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode
  role: UserRole
  nom: string
  prenom: string
}

export function AppLayout({ children, role, nom, prenom }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar role={role} nom={nom} prenom={prenom} />
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
