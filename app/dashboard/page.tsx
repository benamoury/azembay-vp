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
      admin.from('sejours').select('*, prospect:prospects(nom,prenom,apporteur_id), lot_assigne:lots(reference)').order('created_at', { ascending: false }),
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
    const [{ data: prospects }, { data: vouchers }, { data: liens }, { data: sejours }] = await Promise.all([
      admin.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom,role)').order('created_at', { ascending: false }),
      admin.from('vouchers').select('*, prospect:prospects(nom,prenom,email)').order('created_at', { ascending: false }),
      admin.from('liens_securises').select('*, prospect:prospects(nom,prenom), document:documents(nom)').order('created_at', { ascending: false }),
      admin.from('sejours').select('*, prospect:prospects(nom,prenom), lot_assigne:lots(reference)').in('statut', ['demande', 'confirme', 'no_show']).order('created_at', { ascending: false }),
    ])

    return (
      <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
        <ManagerDashboard
          prospects={prospects || []}
          vouchers={vouchers || []}
          liens={liens || []}
          sejours={sejours || []}
        />
      </AppLayout>
    )
  }

  // Apporteur
  const [{ data: prospects }, { data: ventes }, { data: sejours }, { data: visites }] = await Promise.all([
    supabase.from('prospects').select('*, lot_cible:lots(*)').eq('apporteur_id', user.id).order('created_at', { ascending: false }),
    supabase.from('ventes').select('*').eq('apporteur_id', user.id),
    admin.from('sejours')
      .select('id,statut,date_arrivee,date_depart,prospect:prospects!inner(apporteur_id)')
      .eq('prospects.apporteur_id', user.id)
      .not('statut', 'eq', 'annule'),
    admin.from('visites')
      .select('id,statut,date_visite,prospect:prospects!inner(apporteur_id)')
      .eq('prospects.apporteur_id', user.id),
  ])

  const quotaUsed = sejours?.filter(s => !['annule'].includes(s.statut)).length ?? 0

  return (
    <AppLayout role={role} nom={profile.nom} prenom={profile.prenom}>
      <ApporteurDashboard
        prospects={prospects || []}
        ventes={ventes || []}
        sejours={sejours || []}
        visites={visites || []}
        quotaUsed={quotaUsed}
        nom={profile.nom}
        prenom={profile.prenom}
      />
    </AppLayout>
  )
}
