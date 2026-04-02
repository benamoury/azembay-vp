'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function creerLienSecurise(data: {
  prospect_id: string
  document_id: string
  created_by: string
}) {
  const admin = createAdminClient()

  const { data: lien, error } = await admin
    .from('liens_securises')
    .insert(data)
    .select('*, prospect:prospects(nom,prenom), document:documents(nom,categorie)')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, lien }
}
