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

  const [{ data: visites }, { data: sejours }, { data: notes }, { data: jours }, { data: visiteCounts }] = await Promise.all([
    admin.from('visites').select('*, jour:jours_disponibles(date,prioritaire)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('sejours').select('*, lot_assigne:lots(reference)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('client_notes').select('*, auteur:profiles!auteur_id(prenom,nom)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('jours_disponibles').select('*').eq('actif', true).gte('date', new Date().toISOString().split('T')[0]).order('date'),
    admin.from('visites').select('jour_id').neq('statut', 'annulee'),
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
        userId={user.id}
        apporteurNom={`${profile.prenom} ${profile.nom}`}
      />
    </AppLayout>
  )
}
