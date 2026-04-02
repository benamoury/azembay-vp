import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ProspectDetailClient } from './prospect-detail-client'

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: prospect } = await admin
    .from('prospects')
    .select('*, apporteur:profiles!apporteur_id(id,nom,prenom,email,telephone), lot_cible:lots(*)')
    .eq('id', params.id)
    .single()

  if (!prospect) notFound()

  const [{ data: vouchers }, { data: formulaires }, { data: sejours }, { data: lots }, { data: jours }, { data: visiteCounts }] = await Promise.all([
    admin.from('vouchers').select('*').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('formulaires').select('*, lot:lots(*)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('sejours').select('*, lot_assigne:lots(reference)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    admin.from('lots').select('*').eq('statut', 'disponible').order('reference'),
    admin.from('jours_disponibles').select('*').eq('actif', true).gte('date', new Date().toISOString().split('T')[0]).order('date'),
    admin.from('visites').select('jour_id').neq('statut', 'annulee'),
  ])

  const countMap: Record<string, number> = {}
  visiteCounts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })
  const joursWithCounts = (jours || []).map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))

  const { data: managerProfile } = await admin.from('profiles').select('id,nom,prenom').eq('id', user.id).single()

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <ProspectDetailClient
        prospect={prospect}
        vouchers={vouchers || []}
        formulaires={formulaires || []}
        sejours={sejours || []}
        lots={lots || []}
        jours={joursWithCounts}
        managerId={user.id}
        managerNom={managerProfile ? `${managerProfile.prenom} ${managerProfile.nom}` : ''}
        role={profile.role}
      />
    </AppLayout>
  )
}
