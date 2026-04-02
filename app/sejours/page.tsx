import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { SejoursClient } from './sejours-client'

export default async function SejoursPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const [{ data: sejours }, { data: weekends }, { data: lots }] = await Promise.all([
    supabase.from('sejours')
      .select('*, prospect:prospects(nom,prenom), lot_assigne:lots(reference,type)')
      .order('date_arrivee', { ascending: true }),
    supabase.from('weekends_actives').select('*').order('date_vendredi'),
    supabase.from('lots').select('id,reference,type').eq('statut', 'disponible').order('reference'),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <SejoursClient sejours={sejours || []} weekends={weekends || []} lots={lots || []} managerId={user.id} />
    </AppLayout>
  )
}
