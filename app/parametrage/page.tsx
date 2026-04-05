import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ParametrageClient } from './parametrage-client'

export default async function ParametragePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'direction') redirect('/dashboard')

  const admin = (await import('@/lib/supabase/server')).createAdminClient()

  const [{ data: utilisateurs }, { data: lots }, { data: documents }, { data: jours }, { data: weekends }] = await Promise.all([
    supabase.from('profiles').select('*').order('nom'),
    supabase.from('lots').select('*').order('reference'),
    supabase.from('documents').select('*').order('created_at', { ascending: false }),
    admin.from('jours_disponibles').select('*').order('date'),
    admin.from('weekends_actives').select('*').order('date_vendredi'),
  ])

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <ParametrageClient
        utilisateurs={utilisateurs || []}
        lots={lots || []}
        documents={documents || []}
        jours={jours || []}
        weekends={weekends || []}
      />
    </AppLayout>
  )
}
