import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { DocumentsClient } from './documents-client'

export default async function DocumentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['direction', 'manager'].includes(profile.role)) redirect('/dashboard')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <DocumentsClient documents={documents || []} uploaderId={user.id} role={profile.role} />
    </AppLayout>
  )
}
