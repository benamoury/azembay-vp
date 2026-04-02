import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { CalendrierClient } from './calendrier-client'

export default async function CalendrierPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'apporteur') redirect('/dashboard')

  const [{ data: weekends }, { data: sejours }] = await Promise.all([
    supabase.from('weekends_actives').select('*').eq('actif', true).order('date_vendredi'),
    supabase.from('sejours')
      .select('*, prospect:prospects(nom,prenom)')
      .eq('prospect_id', user.id) // prospects liés à cet apporteur via join
      .order('date_arrivee'),
  ])

  // Fetch sejours for this apporteur's prospects
  const { data: mesProspects } = await supabase.from('prospects').select('id').eq('apporteur_id', user.id)
  const prospectIds = (mesProspects || []).map(p => p.id)
  const { data: mesSejours } = prospectIds.length > 0
    ? await supabase.from('sejours').select('*, prospect:prospects(nom,prenom)').in('prospect_id', prospectIds).order('date_arrivee')
    : { data: [] }

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <CalendrierClient weekends={weekends || []} sejours={mesSejours || []} apporteurId={user.id} />
    </AppLayout>
  )
}
