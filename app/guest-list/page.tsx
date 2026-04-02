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

  const [{ data: vouchers }, { data: visites }] = await Promise.all([
    admin
      .from('vouchers')
      .select('*, prospect:prospects(nom,prenom,email,telephone)')
      .eq('date_visite', today)
      .order('heure_visite'),
    admin
      .from('visites')
      .select('*, prospect:prospects(nom,prenom,telephone)')
      .eq('statut', 'confirmee_manager')
      .order('date_visite'),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <GuestListClient
        vouchers={vouchers || []}
        visites={(visites || []) as Parameters<typeof GuestListClient>[0]['visites']}
        today={today}
      />
    </AppLayout>
  )
}
