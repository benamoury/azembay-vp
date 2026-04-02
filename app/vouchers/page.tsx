import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { VouchersClient } from './vouchers-client'

export default async function VouchersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('*, prospect:prospects(nom,prenom,email), apporteur:profiles!apporteur_id(nom,prenom)')
    .order('date_visite', { ascending: false })

  const { data: weekends } = await supabase
    .from('weekends_actives')
    .select('*')
    .eq('actif', true)
    .order('date_vendredi')

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <VouchersClient vouchers={vouchers || []} weekends={weekends || []} />
    </AppLayout>
  )
}
