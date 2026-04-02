import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { MesProspectsClient } from './mes-prospects-client'

export default async function MesProspectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'apporteur') redirect('/dashboard')

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*, lot_cible:lots(*)')
    .eq('apporteur_id', user.id)
    .order('created_at', { ascending: false })

  const { data: ventes } = await supabase
    .from('ventes')
    .select('*, lot:lots(reference)')
    .eq('apporteur_id', user.id)

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <MesProspectsClient prospects={prospects || []} ventes={ventes || []} />
    </AppLayout>
  )
}
