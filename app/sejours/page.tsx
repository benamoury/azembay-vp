import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { SejoursClient } from './sejours-client'

export default async function SejoursPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: sejours }, { data: lots }, { data: weekends }, { data: factures }] = await Promise.all([
    admin.from('sejours')
      .select('*, prospect:prospects(nom,prenom,email,telephone,apporteur_id), lot_assigne:lots(reference,type,adultes_max,enfants_max), weekend:weekends_actives(date_vendredi,date_samedi,statut)')
      .order('created_at', { ascending: false }),
    admin.from('lots').select('id,reference,type,statut,adultes_max,enfants_max').order('reference'),
    admin.from('weekends_actives').select('*').in('statut', ['ouvert', 'validation', 'confirme']).gte('date_samedi', new Date().toISOString().split('T')[0]).order('date_vendredi'),
    admin.from('factures').select('id,sejour_id,numero_facture,montant_ttc,statut').order('created_at', { ascending: false }),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <SejoursClient
        sejours={sejours || []}
        lots={lots || []}
        weekends={weekends || []}
        factures={factures || []}
        managerId={user.id}
      />
    </AppLayout>
  )
}
