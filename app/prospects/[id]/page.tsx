import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ProspectDetailClient } from './prospect-detail-client'

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const { data: prospect } = await supabase
    .from('prospects')
    .select('*, apporteur:profiles!apporteur_id(id,nom,prenom,email,telephone), lot_cible:lots(*)')
    .eq('id', params.id)
    .single()

  if (!prospect) notFound()

  const [{ data: vouchers }, { data: formulaires }, { data: sejours }, { data: lots }] = await Promise.all([
    supabase.from('vouchers').select('*').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    supabase.from('formulaires').select('*, lot:lots(*)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    supabase.from('sejours').select('*, lot_assigne:lots(reference)').eq('prospect_id', params.id).order('created_at', { ascending: false }),
    supabase.from('lots').select('*').eq('statut', 'disponible').order('reference'),
  ])

  const { data: managerProfile } = await supabase.from('profiles').select('id,nom,prenom').eq('id', user.id).single()

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <ProspectDetailClient
        prospect={prospect}
        vouchers={vouchers || []}
        formulaires={formulaires || []}
        sejours={sejours || []}
        lots={lots || []}
        managerId={user.id}
        managerNom={managerProfile ? `${managerProfile.prenom} ${managerProfile.nom}` : ''}
        role={profile.role}
      />
    </AppLayout>
  )
}
