import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { DirectionDashboard } from '@/components/dashboard/direction-dashboard'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'
import { ApporteurDashboard } from '@/components/dashboard/apporteur-dashboard'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const role = profile.role

  if (role === 'securite') redirect('/guest-list')

  // Fetch data based on role
  let lots: unknown[] = []
  let prospects: unknown[] = []
  let ventes: unknown[] = []
  let vouchers: unknown[] = []
  let liens: unknown[] = []

  const { data: lotsData } = await supabase.from('lots').select('*').order('reference')
  lots = lotsData || []

  if (role === 'direction') {
    const [p, v] = await Promise.all([
      supabase.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom,role), lot_cible:lots(*)').order('created_at', { ascending: false }),
      supabase.from('ventes').select('*, prospect:prospects(nom,prenom), lot:lots(reference)').order('created_at', { ascending: false }),
    ])
    prospects = p.data || []
    ventes = v.data || []
  }

  if (role === 'manager') {
    const [p, vo, l] = await Promise.all([
      supabase.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom,role)').order('created_at', { ascending: false }),
      supabase.from('vouchers').select('*, prospect:prospects(nom,prenom,email)').order('created_at', { ascending: false }),
      supabase.from('liens_securises').select('*, prospect:prospects(nom,prenom), document:documents(nom)').order('created_at', { ascending: false }),
    ])
    prospects = p.data || []
    vouchers = vo.data || []
    liens = l.data || []
  }

  if (role === 'apporteur') {
    const [p, v] = await Promise.all([
      supabase.from('prospects').select('*, lot_cible:lots(*)').eq('apporteur_id', user.id).order('created_at', { ascending: false }),
      supabase.from('ventes').select('*').eq('apporteur_id', user.id),
    ])
    prospects = p.data || []
    ventes = v.data || []
  }

  return (
    <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
      {role === 'direction' && (
        <DirectionDashboard
          lots={lots as never}
          prospects={prospects as never}
          ventes={ventes as never}
        />
      )}
      {role === 'manager' && (
        <ManagerDashboard
          prospects={prospects as never}
          vouchers={vouchers as never}
          liens={liens as never}
        />
      )}
      {role === 'apporteur' && (
        <ApporteurDashboard
          prospects={prospects as never}
          ventes={ventes as never}
          nom={profile.nom}
          prenom={profile.prenom}
        />
      )}
    </AppLayout>
  )
}
