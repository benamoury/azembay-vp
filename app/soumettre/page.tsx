import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { SoumettreClient } from './soumettre-client'

export default async function SoumettreProspectPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'apporteur') redirect('/dashboard')

  const { data: lots } = await supabase
    .from('lots')
    .select('id,reference,type,prix_individuel')
    .eq('statut', 'disponible')
    .order('reference')

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <SoumettreClient lots={lots || []} apporteurId={user.id} />
    </AppLayout>
  )
}
