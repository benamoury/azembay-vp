import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ProspectsClient } from './prospects-client'

export default async function ProspectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*, apporteur:profiles!apporteur_id(id,nom,prenom,email), lot_cible:lots(*)')
    .order('created_at', { ascending: false })

  const { data: lots } = await supabase
    .from('lots')
    .select('*')
    .eq('statut', 'disponible')
    .order('reference')

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <ProspectsClient prospects={prospects || []} lots={lots || []} role={profile.role} />
    </AppLayout>
  )
}
