import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { VisitesClient } from './visites-client'

export default async function VisitesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: visites } = await admin
    .from('visites')
    .select('*, prospect:prospects(nom,prenom,email,telephone,budget_estime,apporteur_id), jour:jours_disponibles(date,prioritaire)')
    .neq('statut', 'annulee')
    .order('date_visite', { ascending: true })

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <VisitesClient visites={visites || []} userId={user.id} />
    </AppLayout>
  )
}
