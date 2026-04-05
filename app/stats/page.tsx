import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { StatsClient } from './stats-client'

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'direction') redirect('/dashboard')

  const admin = createAdminClient()

  const [
    { data: lots },
    { data: prospects },
    { data: ventes },
    { data: apporteurs },
    { data: sejours },
    { data: factures },
    { data: weekends },
  ] = await Promise.all([
    admin.from('lots').select('*').order('reference'),
    admin.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom)').order('created_at', { ascending: false }),
    admin.from('ventes').select('*, lot:lots(reference,type,prix_individuel), apporteur:profiles!apporteur_id(nom,prenom)').order('created_at', { ascending: false }),
    admin.from('profiles').select('*').eq('role', 'apporteur'),
    admin.from('sejours').select('*, prospect:prospects(apporteur_id)').not('statut', 'eq', 'annule'),
    admin.from('factures').select('montant_ttc,statut,date_emission'),
    admin.from('weekends_actives').select('id,date_vendredi,date_samedi,statut,nb_sejours_confirmes,seuil_guests').order('date_vendredi'),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <StatsClient
        lots={lots || []}
        prospects={prospects || []}
        ventes={ventes || []}
        apporteurs={apporteurs || []}
        sejours={sejours || []}
        factures={factures || []}
        weekends={weekends || []}
      />
    </AppLayout>
  )
}
