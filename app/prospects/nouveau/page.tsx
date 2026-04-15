import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { NouveauProspectManagerClient } from './nouveau-prospect-manager-client'

export default async function NouveauProspectManagerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Accessible uniquement aux managers et à la direction
  if (!profile || !['manager', 'direction'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: lots } = await supabase
    .from('lots')
    .select('id,reference,type,prix_individuel')
    .eq('statut', 'disponible')
    .order('reference')

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <NouveauProspectManagerClient
        lots={lots || []}
        managerId={user.id}
        managerNom={`${profile.prenom} ${profile.nom}`}
        role={profile.role}
      />
    </AppLayout>
  )
}
