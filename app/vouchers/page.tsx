import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { VouchersClient } from './vouchers-client'

export default async function VouchersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: vouchers } = await admin
    .from('vouchers')
    .select('*, prospect:prospects(nom,prenom,email), apporteur:profiles!apporteur_id(nom,prenom)')
    .order('date_visite', { ascending: false })

  const { data: jours } = await admin
    .from('jours_disponibles')
    .select('*')
    .eq('actif', true)
    .order('date')

  // Count visites per jour
  const { data: visiteCounts } = await admin
    .from('visites')
    .select('jour_id')
    .neq('statut', 'annulee')

  const countMap: Record<string, number> = {}
  visiteCounts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })

  const joursWithCounts = (jours || []).map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <VouchersClient vouchers={vouchers || []} jours={joursWithCounts} />
    </AppLayout>
  )
}
