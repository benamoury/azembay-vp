'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function ajouterNote(data: {
  prospect_id: string
  contenu: string
  temperature?: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  const { data: note, error } = await admin.from('client_notes').insert({
    prospect_id: data.prospect_id,
    auteur_id: user.id,
    contenu: data.contenu,
    temperature: data.temperature,
  }).select('id').single()

  if (error) return { success: false, error: error.message }

  // Récupérer le profil de l'auteur pour l'affichage immédiat
  const { data: profil } = await admin.from('profiles').select('prenom,nom').eq('id', user.id).single()

  // Mettre à jour la température du prospect si fournie
  if (data.temperature) {
    await admin
      .from('prospects')
      .update({ temperature: data.temperature })
      .eq('id', data.prospect_id)
  }

  return { success: true, noteId: note?.id, auteur: profil }
}

export async function supprimerNote(noteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('client_notes')
    .delete()
    .eq('id', noteId)
    .eq('auteur_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
