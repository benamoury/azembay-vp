import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ValidationClient } from './validation-client'

export default async function ValidationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'direction') redirect('/dashboard')

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*, apporteur:profiles!apporteur_id(id,nom,prenom,email,telephone), lot_cible:lots(*)')
    .in('statut', ['qualifie', 'soumis'])
    .order('created_at', { ascending: false })

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <ValidationClient prospects={prospects || []} />
    </AppLayout>
  )
}
