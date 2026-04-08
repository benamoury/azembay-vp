'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildEmailConfirmationVisite,
  buildEmailAnnulationVisiteClient,
  buildEmailAnnulationVisiteIntern,
} from '@/lib/email/resend'

export async function demanderVisite(data: {
  prospect_id: string
  jour_id: string
  date_visite: string
  heure_visite?: string
  notes_apporteur?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // Vérifier la disponibilité du jour
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

  // Vérifier qu'il n'y a pas déjà une visite pour ce prospect
  const { data: existing } = await admin
    .from('visites')
    .select('id')
    .eq('prospect_id', data.prospect_id)
    .neq('statut', 'annulee')
    .maybeSingle()

  if (existing) return { success: false, error: 'Ce prospect a déjà une visite planifiée' }

  // Récupérer le prospect et son apporteur
  const { data: prospect } = await admin
    .from('prospects')
    .select('nom, prenom, email, apporteur_id, apporteur:profiles!apporteur_id(nom, prenom, email, telephone)')
    .eq('id', data.prospect_id)
    .single()

  if (!prospect) return { success: false, error: 'Prospect non trouvé' }

  // Créer le token d'annulation
  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .insert({
      type: 'visite',
      reference_id: data.prospect_id,
    })
    .select('token')
    .single()

  const annulation_token = tokenRow?.token

  // Créer la visite directement en 'confirmee' (pas de double validation)
  const { data: visite, error } = await admin
    .from('visites')
    .insert({
      ...data,
      apporteur_id: prospect.apporteur_id,
      statut: 'confirmee',
      annulation_token,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Mettre à jour le statut du prospect
  await admin.from('prospects').update({ statut: 'visite_programmee' }).eq('id', data.prospect_id)

  // Envoyer les emails E4 (client) + E5 (apporteur)
  const apRaw = prospect.apporteur
  const ap = (Array.isArray(apRaw) ? apRaw[0] : apRaw) as { nom: string; prenom: string; email: string; telephone?: string } | null | undefined
  const lien_annulation = annulation_token
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://azembay.vercel.app'}/annuler/${annulation_token}`
    : ''

  // Email au prospect (toujours, même sans apporteur)
  if (prospect.email) {
    const emailData = buildEmailConfirmationVisite({
      prospect: { nom: prospect.nom, prenom: prospect.prenom },
      date_visite: data.date_visite,
      apporteur: ap
        ? { nom: ap.nom, prenom: ap.prenom, telephone: ap.telephone }
        : { nom: 'Equipe', prenom: 'Azembay', telephone: undefined },
      lien_annulation,
    })
    await sendEmail({ to: prospect.email, ...emailData })
  }

  // Email a l'apporteur (si existe)
  if (ap?.email) {
    const emailData = buildEmailConfirmationVisite({
      prospect: { nom: prospect.nom, prenom: prospect.prenom },
      date_visite: data.date_visite,
      apporteur: { nom: ap.nom, prenom: ap.prenom, telephone: ap.telephone },
      lien_annulation,
    })
    await sendEmail({ to: ap.email, ...emailData })
  }

  return { success: true, visite }
}

// ─── Annulation visite (interne — par apporteur/manager/direction) ─────────────

export async function annulerVisite(visiteId: string) {
  const admin = createAdminClient()

  const { data: visite } = await admin
    .from('visites')
    .select('prospect_id, date_visite, heure_visite, apporteur_id, annulation_token')
    .eq('id', visiteId)
    .single()

  const { error } = await admin
    .from('visites')
    .update({ statut: 'annulee' })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }

  if (visite) {
    // Remettre le prospect en statut 'valide'
    await admin.from('prospects').update({ statut: 'valide' }).eq('id', visite.prospect_id)

    // Invalider le token d'annulation
    if (visite.annulation_token) {
      await admin
        .from('annulation_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', visite.annulation_token)
    }

    // Récupérer les infos pour les emails
    const { data: prospect } = await admin
      .from('prospects')
      .select('nom, prenom, email')
      .eq('id', visite.prospect_id)
      .single()

    const { data: apporteurProfile } = visite.apporteur_id
      ? await admin.from('profiles').select('nom, prenom, email').eq('id', visite.apporteur_id).single()
      : { data: null }

    if (prospect) {
      // Email interne (apporteur + managers)
      const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')
      const internRecipients: string[] = []
      if (apporteurProfile?.email) internRecipients.push(apporteurProfile.email)
      for (const m of managers ?? []) internRecipients.push(m.email)

      if (internRecipients.length > 0) {
        const internEmail = buildEmailAnnulationVisiteIntern({
          prospect: { nom: prospect.nom, prenom: prospect.prenom, id: visite.prospect_id },
          date_visite: visite.date_visite,
        })
        await sendEmail({ to: internRecipients, ...internEmail })
      }

      // Email client
      if (prospect.email) {
        const clientEmail = buildEmailAnnulationVisiteClient({
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          date_visite: visite.date_visite,
        })
        await sendEmail({ to: prospect.email, ...clientEmail })
      }
    }
  }

  return { success: true }
}

// ─── Annulation visite publique (via token UUID) ───────────────────────────────

export async function annulerVisiteParToken(token: string) {
  const admin = createAdminClient()

  // Vérifier le token
  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .select('*')
    .eq('token', token)
    .eq('type', 'visite')
    .single()

  if (!tokenRow) return { success: false, error: 'Lien invalide ou expiré' }
  if (tokenRow.used_at) return { success: false, error: 'Ce lien a déjà été utilisé' }
  if (new Date(tokenRow.expires_at) < new Date()) return { success: false, error: 'Lien expiré' }

  // Trouver la visite associée
  const { data: visite } = await admin
    .from('visites')
    .select('id, prospect_id, date_visite, heure_visite, apporteur_id')
    .eq('annulation_token', token)
    .neq('statut', 'annulee')
    .single()

  if (!visite) return { success: false, error: 'Aucune visite active trouvée' }

  // Annuler la visite
  await admin.from('visites').update({ statut: 'annulee' }).eq('id', visite.id)
  await admin.from('prospects').update({ statut: 'valide' }).eq('id', visite.prospect_id)
  await admin.from('annulation_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)

  // Notifier en interne
  const { data: prospect } = await admin
    .from('prospects')
    .select('nom, prenom, email')
    .eq('id', visite.prospect_id)
    .single()

  if (prospect) {
    const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')
    const { data: apporteurProfile } = visite.apporteur_id
      ? await admin.from('profiles').select('email').eq('id', visite.apporteur_id).single()
      : { data: null }

    const internRecipients: string[] = []
    if (apporteurProfile?.email) internRecipients.push(apporteurProfile.email)
    for (const m of managers ?? []) internRecipients.push(m.email)

    if (internRecipients.length > 0) {
      const internEmail = buildEmailAnnulationVisiteIntern({
        prospect: { nom: prospect.nom, prenom: prospect.prenom, id: visite.prospect_id },
        date_visite: visite.date_visite,
      })
      await sendEmail({ to: internRecipients, ...internEmail })
    }
  }

  return { success: true }
}

// ─── Check-in sécurité ─────────────────────────────────────────────────────────

export async function validerArriveeClient(visiteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('visites')
    .update({
      arrivee_validee: true,
      arrivee_validee_at: new Date().toISOString(),
    })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function validerPresenceManager(visiteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // Récupérer la visite complète pour l'email
  const { data: visite } = await admin
    .from('visites')
    .select('prospect_id, date_visite, heure_visite, apporteur_id, annulation_token')
    .eq('id', visiteId)
    .single()

  const { error } = await admin
    .from('visites')
    .update({
      presence_manager: true,
      presence_manager_validee_at: new Date().toISOString(),
    })
    .eq('id', visiteId)

  if (error) return { success: false, error: error.message }

  // Envoyer l'email voucher au prospect + apporteur maintenant que le manager confirme
  if (visite) {
    const { data: prospect } = await admin
      .from('prospects')
      .select('nom, prenom, email, apporteur_id, apporteur:profiles!apporteur_id(nom, prenom, email, telephone)')
      .eq('id', visite.prospect_id)
      .single()

    if (prospect) {
      const apRaw = prospect.apporteur
      const ap = (Array.isArray(apRaw) ? apRaw[0] : apRaw) as { nom: string; prenom: string; email: string; telephone?: string } | null | undefined
      const lien_annulation = visite.annulation_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://azembay.vercel.app'}/annuler/${visite.annulation_token}`
        : ''

      const dateFormatted = new Date(visite.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })

      // Email au prospect
      if (prospect.email) {
        const emailData = buildEmailConfirmationVisite({
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          date_visite: dateFormatted,
          apporteur: ap
            ? { nom: ap.nom, prenom: ap.prenom, telephone: ap.telephone }
            : { nom: 'Equipe', prenom: 'Azembay', telephone: undefined },
          lien_annulation,
        })
        await sendEmail({ to: prospect.email, ...emailData })
      }

      // Email à l'apporteur
      if (ap?.email) {
        const emailData = buildEmailConfirmationVisite({
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          date_visite: dateFormatted,
          apporteur: { nom: ap.nom, prenom: ap.prenom, telephone: ap.telephone },
          lien_annulation,
        })
        await sendEmail({ to: ap.email, ...emailData })
      }
    }
  }

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

export async function getJoursDisponibles() {
  const admin = createAdminClient()

  const { data: jours } = await admin
    .from('jours_disponibles')
    .select('*')
    .eq('actif', true)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date')

  if (!jours) return []

  // Compter les visites par jour
  const { data: counts } = await admin
    .from('visites')
    .select('jour_id')
    .neq('statut', 'annulee')

  const countMap: Record<string, number> = {}
  counts?.forEach(v => { countMap[v.jour_id] = (countMap[v.jour_id] ?? 0) + 1 })

  return jours.map(j => ({ ...j, nb_visites: countMap[j.id] ?? 0 }))
}
