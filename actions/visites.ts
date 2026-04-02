'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function demanderVisite(data: {
  prospect_id: string
  jour_id: string
  date_visite: string
  notes_apporteur?: string
}) {
  const admin = createAdminClient()

  // Check capacity
  const { data: jour } = await admin
    .from('jours_disponibles')
    .select('id, capacite, actif')
    .eq('id', data.jour_id)
    .single()

  if (!jour || !jour.actif) return { success: false, error: 'Date non disponible' }

  const { count } = await admin
    .from('visites')
    .select('id', { count: 'exact', head: true })
    .eq('jour_id', data.jour_id)
    .neq('statut', 'annulee')

  if ((count ?? 0) >= jour.capacite) return { success: false, error: 'Capacité maximale atteinte pour cette date' }

  // Check no existing visit for this prospect
  const { data: existing } = await admin
    .from('visites')
    .select('id')
    .eq('prospect_id', data.prospect_id)
    .neq('statut', 'annulee')
    .maybeSingle()

  if (existing) return { success: false, error: 'Ce prospect a déjà une visite planifiée' }

  const { data: visite, error } = await admin
    .from('visites')
    .insert({ ...data, statut: 'demandee' })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Update prospect statut
  await admin.from('prospects').update({ statut: 'visite_programmee' }).eq('id', data.prospect_id)

  return { success: true, visite }
}

export async function confirmerVisiteManager(visiteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('visites')
    .update({
      statut: 'confirmee_manager',
      confirmed_by: user.id,
      confirmed_manager_at: new Date().toISOString(),
    })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function confirmerVisiteSecurite(visiteId: string, notes_securite?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('visites')
    .update({
      statut: 'confirmee_securite',
      confirmed_securite_by: user.id,
      confirmed_securite_at: new Date().toISOString(),
      notes_securite: notes_securite ?? null,
    })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function marquerVisiteRealisee(visiteId: string) {
  const admin = createAdminClient()

  const { data: visite } = await admin
    .from('visites')
    .select('prospect_id')
    .eq('id', visiteId)
    .single()

  const { error } = await admin
    .from('visites')
    .update({ statut: 'realisee' })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }

  if (visite) {
    await admin.from('prospects').update({ statut: 'visite_realisee' }).eq('id', visite.prospect_id)
  }

  return { success: true }
}

export async function annulerVisite(visiteId: string) {
  const admin = createAdminClient()

  const { data: visite } = await admin
    .from('visites')
    .select('prospect_id')
    .eq('id', visiteId)
    .single()

  const { error } = await admin
    .from('visites')
    .update({ statut: 'annulee' })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }

  if (visite) {
    await admin.from('prospects').update({ statut: 'valide' }).eq('id', visite.prospect_id)
  }

  return { success: true }
}

export async function getJoursDisponibles() {
  const admin = createAdminClient()

  const { data: jours } = await admin
    .from('jours_disponibles')
    .select('*')
    .eq('actif', true)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date')

  if (!jours) return []

  // Count visites per jour
  const { data: counts } = await admin
    .from('visites')
    .select('jour_id')
    .neq('statut', 'annulee')

  const countMap: Record<string, number> = {}
  counts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })

  return jours.map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))
}
