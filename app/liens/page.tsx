import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { LiensClient } from './liens-client'

export default async function LiensPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const [{ data: liens }, { data: prospects }, { data: documents }] = await Promise.all([
    supabase.from('liens_securises')
      .select('*, prospect:prospects(nom,prenom), document:documents(nom,categorie)')
      .order('created_at', { ascending: false }),
    supabase.from('prospects')
      .select('id,nom,prenom,statut')
      .in('statut', ['visite_realisee', 'dossier_envoye', 'formulaire_signe', 'sejour_confirme', 'sejour_realise', 'vendu'])
      .order('nom'),
    supabase.from('documents').select('id,nom,categorie').eq('actif', true).order('nom'),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <LiensClient liens={liens || []} prospects={prospects || []} documents={documents || []} createdBy={user.id} />
    </AppLayout>
  )
}
