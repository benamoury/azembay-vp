import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { MonProspectDetailClient } from './mon-prospect-detail-client'

export default async function MonProspectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'apporteur') redirect('/dashboard')

  const admin = createAdminClient()

  const { data: prospect } = await admin
    .from('prospects')
    .select('*, lot_cible:lots(*)')
    .eq('id', params.id)
    .eq('apporteur_id', user.id)
    .single()

  if (!prospect) notFound()

  const [
    { data: visites },
    { data: sejours },
    { data: notes },
    { data: jours },
    { data: visiteCounts },
    { data: weekends },
    { data: prospectLots },
    { data: lotsDisponibles },
    { data: apporteurProfile },
    { data: vouchers },
  ] = await Promise.all([
    admin.from('visites').select('*, jour:jours_disponibles(date,prioritaire)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('sejours').select('*, stock_hebergement:stock_hebergement(reference)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('client_notes').select('*, auteur:profiles!auteur_id(prenom,nom)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('jours_disponibles').select('*').eq('actif', true).gte('date', new Date().toISOString().split('T')[0]).order('date'),
    admin.from('visites').select('jour_id').neq('statut', 'annulee'),
    admin.from('weekends_actives').select('*').eq('actif', true).in('statut', ['ouvert', 'valide']).order('date_vendredi'),
    admin.from('prospect_lots').select('*, lot:lots(*)').eq('prospect_id', params.id),
    admin.from('lots').select('id, reference, type, prix_individuel, prix_bloc, statut').eq('statut', 'disponible').order('reference'),
    admin.from('profiles').select('quota_sejours_utilise, quota_sejours_max').eq('id', user.id).single(),
    admin.from('vouchers').select('*').eq('prospect_id', params.id).order('created_at', { ascending: false }),
  ])

  const countMap: Record<string, number> = {}
  visiteCounts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })
  const joursWithCounts = (jours || []).map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <MonProspectDetailClient
        prospect={prospect}
        visites={visites || []}
        sejours={sejours || []}
        notes={notes || []}
        jours={joursWithCounts}
        weekends={weekends || []}
        prospectLots={prospectLots || []}
        lotsDisponibles={lotsDisponibles || []}
        userId={user.id}
        apporteurNom={`${profile.prenom} ${profile.nom}`}
        quotaUtilise={apporteurProfile?.quota_sejours_utilise ?? 0}
        quotaMax={apporteurProfile?.quota_sejours_max ?? 6}
        vouchers={vouchers || []}
      />
    </AppLayout>
  )
}
