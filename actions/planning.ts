'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function creerJourDisponible(data: {
  date: string
  capacite: number
  prioritaire: boolean
  actif: boolean
}) {
  const admin = createAdminClient()
  const { data: jour, error } = await admin
    .from('jours_disponibles')
    .insert(data)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, jour }
}

export async function supprimerJourDisponible(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('jours_disponibles').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function toggleJourActif(id: string, actif: boolean) {
  const admin = createAdminClient()
  const { error } = await admin.from('jours_disponibles').update({ actif }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function creerWeekend(data: {
  date_vendredi: string
  date_samedi: string
  date_dimanche: string
  capacite_max: number
}) {
  const admin = createAdminClient()
  const { data: weekend, error } = await admin
    .from('weekends_actives')
    .insert({ ...data, statut: 'ouvert', nb_sejours_confirmes: 0 })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, weekend }
}

export async function supprimerWeekend(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('weekends_actives').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
