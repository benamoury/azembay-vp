'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function creerVente(data: {
  prospect_id: string
  lot_id: string
  formulaire_id?: string
  apporteur_id: string
  prix_notarie: number
  date_acte_notarie?: string
  commission_apporteur?: number
  commission_manager?: number
}) {
  const admin = createAdminClient()

  const commission_apporteur = data.commission_apporteur ?? data.prix_notarie * 0.02
  const commission_manager = data.commission_manager ?? data.prix_notarie * 0.01

  const { data: vente, error } = await admin
    .from('ventes')
    .insert({
      ...data,
      commission_apporteur,
      commission_manager,
      statut: 'en_cours',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Mark lot as vendu
  await admin.from('lots').update({ statut: 'vendu' }).eq('id', data.lot_id)

  // Update prospect status
  await admin.from('prospects').update({ statut: 'vendu' }).eq('id', data.prospect_id)

  return { success: true, vente }
}

export async function signerActeNotarie(venteId: string, dateActe: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('ventes')
    .update({ statut: 'acte_signe', date_acte_notarie: dateActe })
    .eq('id', venteId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
