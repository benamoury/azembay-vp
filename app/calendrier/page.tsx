import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// SUSPENDU V1 — Fonctionnalité désactivée
// Les visites se planifient depuis /mes-prospects/[id]
// Les weekends séjours se soumettent depuis /mes-prospects/[id]

export default async function CalendrierPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  redirect('/mes-prospects')
}
