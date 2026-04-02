'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailSejourConfirme } from '@/lib/email/resend'

export async function confirmerSejour(sejourId: string, lotId: string) {
  const admin = createAdminClient()

  const { data: sejour, error } = await admin
    .from('sejours')
    .update({ statut: 'confirme', lot_assigne_id: lotId })
    .eq('id', sejourId)
    .select('*, prospect:prospects(nom,prenom,email,apporteur_id)')
    .single()

  if (error) return { success: false, error: error.message }

  // Update prospect status
  if (sejour?.prospect_id) {
    await admin.from('prospects').update({ statut: 'sejour_confirme' }).eq('id', sejour.prospect_id)
  }

  // Update weekend nb_guests
  if (sejour?.date_arrivee) {
    const { data: weekend } = await admin
      .from('weekends_actives')
      .select('id,nb_guests_confirmes')
      .lte('date_vendredi', sejour.date_arrivee)
      .gte('date_samedi', sejour.date_arrivee)
      .single()

    if (weekend) {
      await admin
        .from('weekends_actives')
        .update({ nb_guests_confirmes: (weekend.nb_guests_confirmes || 0) + 1 })
        .eq('id', weekend.id)
    }
  }

  // Send email notification
  const prospect = sejour?.prospect as { nom: string; prenom: string; email: string; apporteur_id: string } | undefined
  if (prospect) {
    const emailData = buildEmailSejourConfirme({
      prospect: { nom: prospect.nom, prenom: prospect.prenom },
      sejour: {
        date_arrivee: sejour.date_arrivee,
        date_depart: sejour.date_depart,
        nb_adultes: sejour.nb_adultes,
        nb_enfants: sejour.nb_enfants,
      },
    })

    // Send to prospect and apporteur
    await sendEmail({ to: prospect.email, ...emailData })

    if (prospect.apporteur_id) {
      const { data: apporteur } = await admin.from('profiles').select('email').eq('id', prospect.apporteur_id).single()
      if (apporteur) {
        await sendEmail({ to: apporteur.email, ...emailData })
      }
    }
  }

  return { success: true }
}

export async function toggleWeekend(weekendId: string, actif: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('weekends_actives')
    .update({ actif })
    .eq('id', weekendId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
