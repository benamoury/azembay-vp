'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function marquerVoucherUtilise(voucherId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('vouchers')
    .update({ statut: 'utilise' })
    .eq('id', voucherId)
    .eq('statut', 'emis') // only mark if currently emis
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function annulerVoucher(voucherId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('vouchers')
    .update({ statut: 'annule' })
    .eq('id', voucherId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
