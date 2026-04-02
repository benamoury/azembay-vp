import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { YoussClient } from './youss-client'

export default async function YoussPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'securite') redirect('/dashboard')

  const admin = createAdminClient()

  // Charger les prospects selon le rôle
  let prospects: { id: string; nom: string; prenom: string; statut: string; temperature?: number }[] = []

  if (['direction', 'manager'].includes(profile.role)) {
    const { data } = await admin
      .from('prospects')
      .select('id,nom,prenom,statut,temperature')
      .not('statut', 'eq', 'non_concluant')
      .order('updated_at', { ascending: false })
    prospects = data || []
  } else {
    const { data } = await admin
      .from('prospects')
      .select('id,nom,prenom,statut,temperature')
      .eq('apporteur_id', user.id)
      .not('statut', 'eq', 'non_concluant')
      .order('updated_at', { ascending: false })
    prospects = data || []
  }

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <YoussClient prospects={prospects} role={profile.role} />
    </AppLayout>
  )
}
