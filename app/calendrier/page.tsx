import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { CalendrierClient } from './calendrier-client'

export default async function CalendrierPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'apporteur') redirect('/dashboard')

  const admin = createAdminClient()

  const { data: mesProspects } = await admin.from('prospects').select('id').eq('apporteur_id', user.id)
  const prospectIds = (mesProspects || []).map(p => p.id)

  const [{ data: jours }, { data: visiteCounts }, mesSejours] = await Promise.all([
    admin.from('jours_disponibles').select('*').eq('actif', true).order('date'),
    admin.from('visites').select('jour_id').neq('statut', 'annulee'),
    prospectIds.length > 0
      ? admin.from('sejours').select('*, prospect:prospects(nom,prenom)').in('prospect_id', prospectIds).order('date_arrivee')
      : Promise.resolve({ data: [] }),
  ])

  const countMap: Record<string, number> = {}
  visiteCounts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })
  const joursWithCounts = (jours || []).map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <CalendrierClient jours={joursWithCounts} sejours={mesSejours.data || []} apporteurId={user.id} />
    </AppLayout>
  )
}
