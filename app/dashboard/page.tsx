import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { DirectionDashboard } from '@/components/dashboard/direction-dashboard'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'
import { ApporteurDashboard } from '@/components/dashboard/apporteur-dashboard'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const role = profile.role

  if (role === 'securite') redirect('/guest-list')

  const admin = createAdminClient()

  if (role === 'direction') {
    const [{ data: lots }, { data: prospects }, { data: ventes }, { data: sejours }, { data: factures }] = await Promise.all([
      admin.from('lots').select('*').order('reference'),
      admin.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom,role), lot_cible:lots(*)').order('created_at', { ascending: false }),
      admin.from('ventes').select('*, prospect:prospects(nom,prenom), lot:lots(reference)').order('created_at', { ascending: false }),
      admin.from('sejours').select('*, prospect:prospects(nom,prenom,apporteur_id)').order('created_at', { ascending: false }),
      admin.from('factures').select('montant_ttc,statut'),
    ])

    return (
      <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
        <DirectionDashboard
          lots={lots || []}
          prospects={prospects || []}
          ventes={ventes || []}
          sejours={sejours || []}
          factures={factures || []}
        />
      </AppLayout>
    )
  }

  if (role === 'manager') {
    const today = new Date().toISOString().split('T')[0]
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [{ data: prospects }, { data: visitesAujourdhui }, { data: liens }, { data: sejours }, { data: nonQualifies }] = await Promise.all([
      admin.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom,role)').order('created_at', { ascending: false }),
      admin.from('visites').select('*, prospect:prospects(nom,prenom,email,telephone)').eq('date_visite', today).neq('statut', 'annulee').order('heure_visite'),
      admin.from('liens_securises').select('*, prospect:prospects(nom,prenom), document:documents(nom)').order('created_at', { ascending: false }),
      admin.from('sejours').select('*, prospect:prospects(nom,prenom)').in('statut', ['demande', 'confirme', 'no_show']).order('created_at', { ascending: false }),
      admin.from('prospects').select('id,nom,prenom,created_at').eq('statut', 'soumis').lt('created_at', cutoff48h),
    ])

    return (
      <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
        <ManagerDashboard
          prospects={prospects || []}
          visitesAujourdhui={visitesAujourdhui || []}
          liens={liens || []}
          sejours={sejours || []}
          nonQualifies={nonQualifies || []}
        />
      </AppLayout>
    )
  }

  // Apporteur
  const [{ data: prospects }, { data: ventes }, { data: sejours }, { data: visites }, { data: apporteurProfile }, { data: lots }] = await Promise.all([
    supabase.from('prospects').select('*, lot_cible:lots(*)').eq('apporteur_id', user.id).order('created_at', { ascending: false }),
    supabase.from('ventes').select('*').eq('apporteur_id', user.id),
    admin.from('sejours')
      .select('id,statut,date_arrivee,date_depart,prospect:prospects!inner(apporteur_id)')
      .eq('prospects.apporteur_id', user.id)
      .not('statut', 'eq', 'annule'),
    admin.from('visites')
      .select('id,statut,date_visite,prospect:prospects!inner(apporteur_id)')
      .eq('prospects.apporteur_id', user.id),
    admin.from('profiles').select('quota_sejours_utilise,quota_sejours_max').eq('id', user.id).single(),
    admin.from('lots').select('id,reference,type,prix_individuel,prix_bloc,statut').eq('statut', 'disponible').order('reference'),
  ])

  return (
    <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
      <ApporteurDashboard
        prospects={prospects || []}
        ventes={ventes || []}
        sejours={sejours || []}
        visites={visites || []}
        lotsDisponibles={lots || []}
        quotaUsed={apporteurProfile?.quota_sejours_utilise ?? 0}
        quotaMax={apporteurProfile?.quota_sejours_max ?? 6}
        nom={profile.nom}
        prenom={profile.prenom}
      />
    </AppLayout>
  )
}
