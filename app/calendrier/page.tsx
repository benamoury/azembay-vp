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

  const { data: mesProspects } = await admin
    .from('prospects')
    .select('id,nom,prenom,statut')
    .eq('apporteur_id', user.id)
    .in('statut', ['visite_realisee', 'dossier_envoye', 'formulaire_signe', 'sejour_confirme'])
    .order('nom')

  const [{ data: jours }, { data: visiteCounts }, mesSejours, { data: weekends }] = await Promise.all([
    admin.from('jours_disponibles').select('*').eq('actif', true).order('date'),
    admin.from('visites').select('jour_id').neq('statut', 'annulee'),
    mesProspects && mesProspects.length > 0
      ? admin.from('sejours').select('*, prospect:prospects(nom,prenom)').in('prospect_id', mesProspects.map(p => p.id)).order('date_arrivee')
      : Promise.resolve({ data: [] }),
    admin.from('weekends_actives').select('*').eq('actif', true).in('statut', ['ouvert', 'validation']).gte('date_samedi', new Date().toISOString().split('T')[0]).order('date_vendredi'),
  ])

  const countMap: Record<string, number> = {}
  visiteCounts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })
  const joursWithCounts = (jours || []).map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))

  // Quota séjours
  const allProspectIds = (mesProspects || []).map(p => p.id)
  const { data: quotaData } = allProspectIds.length > 0
    ? await admin.from('sejours').select('id').in('prospect_id', allProspectIds).not('statut', 'eq', 'annule')
    : { data: [] }
  const quotaUsed = quotaData?.length ?? 0

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <CalendrierClient
        jours={joursWithCounts}
        sejours={mesSejours.data || []}
        weekends={weekends || []}
        prospects={mesProspects || []}
        apporteurId={user.id}
        quotaUsed={quotaUsed}
      />
    </AppLayout>
  )
}
