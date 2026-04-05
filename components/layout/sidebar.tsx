'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, ROLE_LABELS } from '@/lib/utils'
import type { UserRole } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, FileText, Link2, Calendar,
  Settings, CheckSquare, BarChart3, Shield, Ticket, Hotel, LogOut, PlusCircle,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, roles: ['direction', 'manager', 'apporteur'] },
  // Direction
  { label: 'Validation', href: '/validation', icon: CheckSquare, roles: ['direction'] },
  { label: 'Statistiques', href: '/stats', icon: BarChart3, roles: ['direction'] },
  { label: 'Paramétrage', href: '/parametrage', icon: Settings, roles: ['direction'] },
  // Manager
  { label: 'Prospects', href: '/prospects', icon: Users, roles: ['direction', 'manager'] },
  { label: 'Vouchers', href: '/vouchers', icon: Ticket, roles: ['direction', 'manager'] },
  { label: 'Documents', href: '/documents', icon: FileText, roles: ['direction', 'manager'] },
  { label: 'Liens sécurisés', href: '/liens', icon: Link2, roles: ['direction', 'manager'] },
  { label: 'Séjours', href: '/sejours', icon: Hotel, roles: ['direction', 'manager'] },
  { label: 'Visites', href: '/visites', icon: Calendar, roles: ['direction', 'manager'] },
  // Apporteur
  { label: 'Mes prospects', href: '/mes-prospects', icon: Users, roles: ['apporteur'] },
  { label: 'Soumettre un prospect', href: '/soumettre', icon: PlusCircle, roles: ['apporteur'] },
  // { label: 'Calendrier visites', href: '/calendrier', icon: Calendar, roles: ['apporteur'] }, // SUSPENDED V1
  // Securite
  { label: 'Guest List du jour', href: '/guest-list', icon: Shield, roles: ['securite'] },
]

interface SidebarProps {
  role: UserRole
  nom: string
  prenom: string
}

export function Sidebar({ role, nom, prenom }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const items = NAV_ITEMS.filter(i => i.roles.includes(role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1A3C6E] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C8973A] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wider">AZEMBAY</div>
            <div className="text-white/40 text-[10px] tracking-wide">RIPT 1 — Off-Market</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-[#C8973A] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {prenom[0]?.toUpperCase()}{nom[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{prenom} {nom}</div>
            <div className="text-[#C8973A] text-xs">{ROLE_LABELS[role]}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-xs w-full px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
