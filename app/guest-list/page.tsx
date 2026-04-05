import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { GuestListClient } from './guest-list-client'

export default async function GuestListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'securite') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  const { data: visites } = await admin
    .from('visites')
    .select('*, prospect:prospects(nom,prenom,email,telephone), apporteur:profiles!apporteur_id(nom,prenom,telephone)')
    .eq('date_visite', today)
    .neq('statut', 'annulee')
    .order('heure_visite')

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <GuestListClient
        visites={visites || []}
        today={today}
      />
    </AppLayout>
  )
}
