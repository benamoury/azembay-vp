'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailSejourConfirme, buildEmailNoShow, buildEmailAlerte } from '@/lib/email/resend'
import { generateFacturePDF } from '@/lib/pdf/facture'

// ─── Apporteur: soumettre un séjour (3 dates ordonnées) ──────────────────────

export async function soumettreSejourDemande(data: {
  prospect_id: string
  nb_adultes: number
  nb_enfants: number
  date_souhaitee_1: string
  date_souhaitee_2: string
  date_souhaitee_3: string
  notes_apporteur?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // Vérifier que le prospect appartient à l'apporteur
  const { data: prospect } = await admin
    .from('prospects')
    .select('id, statut, apporteur_id')
    .eq('id', data.prospect_id)
    .single()

  if (!prospect || prospect.apporteur_id !== user.id) {
    return { success: false, error: 'Prospect non trouvé' }
  }

  // Vérifier les conditions (visite réalisée + formulaire signé directeur)
  const conditionsOk = ['visite_realisee', 'dossier_envoye', 'formulaire_signe', 'sejour_confirme', 'sejour_realise'].includes(prospect.statut)
  if (!conditionsOk) {
    return { success: false, error: 'Le prospect doit avoir réalisé sa visite avant de soumettre un séjour' }
  }

  // Vérifier quota (6 séjours max par apporteur jusqu'en juin 2026)
  const { data: quota } = await admin
    .from('sejours')
    .select('id')
    .in('prospect_id', (await admin.from('prospects').select('id').eq('apporteur_id', user.id)).data?.map(p => p.id) ?? [])
    .not('statut', 'eq', 'annule')

  if ((quota?.length ?? 0) >= 6) {
    return { success: false, error: 'Quota de 6 séjours atteint pour votre compte' }
  }

  // Vérifier qu'il n'y a pas déjà un séjour en cours pour ce prospect
  const { data: sejourExistant } = await admin
    .from('sejours')
    .select('id, statut')
    .eq('prospect_id', data.prospect_id)
    .in('statut', ['demande', 'confirme'])
    .maybeSingle()

  if (sejourExistant) {
    return { success: false, error: 'Un séjour est déjà en cours pour ce prospect' }
  }

  // Créer la demande de séjour
  const { data: sejour, error } = await admin
    .from('sejours')
    .insert({
      prospect_id: data.prospect_id,
      apporteur_id: user.id,
      nb_adultes: data.nb_adultes,
      nb_enfants: data.nb_enfants,
      date_souhaitee_1: data.date_souhaitee_1,
      date_souhaitee_2: data.date_souhaitee_2,
      date_souhaitee_3: data.date_souhaitee_3,
      date_arrivee: data.date_souhaitee_1, // valeur par défaut, le manager choisit
      date_depart: data.date_souhaitee_1,
      notes_manager: data.notes_apporteur,
      statut: 'demande',
      gratuit: true,
      recouvre: false,
      noshow: false,
      facture_envoyee: false,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notifier les managers
  const { data: managers } = await admin
    .from('profiles')
    .select('email')
    .in('role', ['direction', 'manager'])

  const subject = `Nouvelle demande de séjour — ${prospect.statut}`
  const html = `<p>Nouvelle demande de séjour soumise pour le prospect ${data.prospect_id}.</p>
    <p>Dates souhaitées : ${data.date_souhaitee_1}, ${data.date_souhaitee_2}, ${data.date_souhaitee_3}</p>`

  for (const m of managers ?? []) {
    await sendEmail({ to: m.email, subject, html })
  }

  return { success: true, sejourId: sejour.id }
}

// ─── Manager: confirmer un séjour (assigner lot + weekend) ───────────────────

export async function confirmerSejour(sejourId: string, data: {
  lot_id: string
  weekend_id: string
  date_arrivee: string
  date_depart: string
}) {
  const admin = createAdminClient()

  // Récupérer le séjour avec prospect + lot
  const { data: sejour, error: sejourErr } = await admin
    .from('sejours')
    .select('*, prospect:prospects(nom,prenom,email,apporteur_id,telephone)')
    .eq('id', sejourId)
    .single()

  if (sejourErr || !sejour) return { success: false, error: 'Séjour non trouvé' }

  // Vérifier capacité du lot vs participants
  const { data: lot } = await admin
    .from('lots')
    .select('adultes_max, enfants_max, reference, type, statut')
    .eq('id', data.lot_id)
    .single()

  if (!lot) return { success: false, error: 'Lot non trouvé' }
  if (lot.statut !== 'disponible') return { success: false, error: 'Ce lot n\'est plus disponible' }
  if (lot.adultes_max && sejour.nb_adultes > lot.adultes_max) {
    return { success: false, error: `Ce lot accepte max ${lot.adultes_max} adulte(s)` }
  }
  if (lot.enfants_max && sejour.nb_enfants > lot.enfants_max) {
    return { success: false, error: `Ce lot accepte max ${lot.enfants_max} enfant(s)` }
  }

  // Mettre à jour le séjour
  const { error } = await admin
    .from('sejours')
    .update({
      statut: 'confirme',
      lot_assigne_id: data.lot_id,
      weekend_id: data.weekend_id,
      date_arrivee: data.date_arrivee,
      date_depart: data.date_depart,
    })
    .eq('id', sejourId)

  if (error) return { success: false, error: error.message }

  // Bloquer le lot
  await admin.from('lots').update({ statut: 'bloque' }).eq('id', data.lot_id)

  // Mettre à jour statut du prospect
  await admin.from('prospects').update({ statut: 'sejour_confirme' }).eq('id', sejour.prospect_id)

  // Incrémenter nb_sejours_confirmes du weekend
  const { data: wknd } = await admin
    .from('weekends_actives')
    .select('nb_sejours_confirmes, seuil_guests')
    .eq('id', data.weekend_id)
    .single()

  if (wknd) {
    const newCount = (wknd.nb_sejours_confirmes ?? 0) + 1
    const newStatut = newCount >= (wknd.seuil_guests ?? 3) ? 'validation' : 'ouvert'
    await admin
      .from('weekends_actives')
      .update({ nb_sejours_confirmes: newCount, statut: newStatut })
      .eq('id', data.weekend_id)
  }

  // Email de confirmation
  const prospect = sejour.prospect as { nom: string; prenom: string; email: string; apporteur_id: string } | undefined
  if (prospect) {
    const emailData = buildEmailSejourConfirme({
      prospect: { nom: prospect.nom, prenom: prospect.prenom },
      sejour: {
        date_arrivee: data.date_arrivee,
        date_depart: data.date_depart,
        nb_adultes: sejour.nb_adultes,
        nb_enfants: sejour.nb_enfants,
        lot_reference: lot.reference,
      },
    })

    // Client
    await sendEmail({ to: prospect.email, ...emailData })

    // Apporteur
    if (prospect.apporteur_id) {
      const { data: apporteur } = await admin.from('profiles').select('email').eq('id', prospect.apporteur_id).single()
      if (apporteur) await sendEmail({ to: apporteur.email, ...emailData })
    }

    // Sécurité (copie)
    const { data: securite } = await admin.from('profiles').select('email').eq('role', 'securite')
    for (const s of securite ?? []) {
      await sendEmail({ to: s.email, ...emailData })
    }
  }

  return { success: true }
}

// ─── Manager: confirmer le weekend (tous les minimum ont reconfirmé) ──────────

export async function confirmerWeekend(weekendId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('weekends_actives')
    .update({ statut: 'confirme', confirmed_at: new Date().toISOString() })
    .eq('id', weekendId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Manager: déclarer un no-show + générer facture ──────────────────────────

export async function declarerNoShow(sejourId: string, managerId: string) {
  const admin = createAdminClient()

  const { data: sejour, error } = await admin
    .from('sejours')
    .select('*, prospect:prospects(nom,prenom,email,telephone,apporteur_id), lot_assigne:lots(reference,type)')
    .eq('id', sejourId)
    .single()

  if (error || !sejour) return { success: false, error: 'Séjour non trouvé' }

  // Montant no-show (à définir selon le type de lot — valeur par défaut)
  const MONTANT_NOSHOW_HT = sejour.montant_facturable ?? 5000
  const TVA = 0.20
  const montant_ttc = MONTANT_NOSHOW_HT * (1 + TVA)

  // Créer la facture
  const { data: facture, error: factErr } = await admin
    .from('factures')
    .insert({
      sejour_id: sejourId,
      prospect_id: sejour.prospect_id,
      montant_ht: MONTANT_NOSHOW_HT,
      tva_pct: 20,
      montant_ttc,
      statut: 'emise',
      created_by: managerId,
    })
    .select()
    .single()

  if (factErr) return { success: false, error: factErr.message }

  // Mettre à jour le séjour
  await admin
    .from('sejours')
    .update({
      statut: 'no_show',
      noshow: true,
      noshow_declared_by: managerId,
      noshow_declared_at: new Date().toISOString(),
      facture_envoyee: true,
    })
    .eq('id', sejourId)

  // Générer PDF facture et envoyer par email
  const prospect = sejour.prospect as { nom: string; prenom: string; email: string; apporteur_id: string } | undefined
  if (prospect) {
    try {
      const pdfBuffer = await generateFacturePDF({
        facture: {
          numero_facture: facture.numero_facture ?? `FAC-${sejourId.slice(0, 8)}`,
          date_emission: facture.date_emission,
          montant_ht: MONTANT_NOSHOW_HT,
          tva_pct: 20,
          montant_ttc,
        },
        prospect: { nom: prospect.nom, prenom: prospect.prenom },
        sejour: { date_arrivee: sejour.date_arrivee, date_depart: sejour.date_depart },
      })

      const emailData = buildEmailNoShow({
        prospect: { nom: prospect.nom, prenom: prospect.prenom },
        facture: {
          numero: facture.numero_facture ?? '',
          montant_ttc,
          date_emission: facture.date_emission,
        },
      })

      await sendEmail({
        to: prospect.email,
        ...emailData,
        attachments: [{ filename: `Facture-${facture.numero_facture}.pdf`, content: pdfBuffer }],
      })

      // Copie manager
      const { data: managers } = await admin.from('profiles').select('email').in('role', ['direction', 'manager'])
      for (const m of managers ?? []) {
        await sendEmail({ to: m.email, ...emailData })
      }
    } catch (e) {
      console.error('PDF generation error:', e)
    }
  }

  return { success: true, factureId: facture.id }
}

// ─── Manager: confirmer recouvrement ─────────────────────────────────────────

export async function confirmerRecouvrement(sejourId: string, managerId: string) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('sejours')
    .update({
      recouvre: true,
      recouvre_confirme_by: managerId,
      recouvre_confirme_at: new Date().toISOString(),
    })
    .eq('id', sejourId)

  if (error) return { success: false, error: error.message }

  // Mettre à jour la facture statut = payee
  await admin
    .from('factures')
    .update({ statut: 'payee' })
    .eq('sejour_id', sejourId)

  return { success: true }
}

// ─── Manager: marquer séjour réalisé ─────────────────────────────────────────

export async function marquerSejourRealise(sejourId: string) {
  const admin = createAdminClient()

  const { data: sejour, error } = await admin
    .from('sejours')
    .update({ statut: 'realise' })
    .eq('id', sejourId)
    .select('prospect_id, lot_assigne_id')
    .single()

  if (error) return { success: false, error: error.message }

  // Libérer le lot
  if (sejour.lot_assigne_id) {
    await admin.from('lots').update({ statut: 'disponible' }).eq('id', sejour.lot_assigne_id)
  }

  // Mettre à jour statut prospect
  await admin.from('prospects').update({ statut: 'sejour_realise' }).eq('id', sejour.prospect_id)

  return { success: true }
}

// ─── Auto-libération lots (30 jours après no-show non recouvré) ──────────────

export async function checkAndLiberateExpiredLots() {
  const admin = createAdminClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sejoursExpires } = await admin
    .from('sejours')
    .select('id, lot_assigne_id, prospect_id, apporteur_id, prospect:prospects(apporteur_id)')
    .eq('noshow', true)
    .eq('recouvre', false)
    .is('lot_libere_at', null)
    .lt('noshow_declared_at', thirtyDaysAgo)
    .not('lot_assigne_id', 'is', null)

  for (const sejour of sejoursExpires ?? []) {
    if (sejour.lot_assigne_id) {
      await admin.from('lots').update({ statut: 'disponible' }).eq('id', sejour.lot_assigne_id)
      await admin.from('sejours').update({ lot_libere_at: new Date().toISOString() }).eq('id', sejour.id)
    }
  }

  return { success: true, liberes: sejoursExpires?.length ?? 0 }
}

// ─── Envoi alertes J+15/J+23/J+28 ────────────────────────────────────────────

export async function sendAlerteNoShow(sejourId: string, joursDepuisNoShow: number) {
  const admin = createAdminClient()

  const { data: sejour } = await admin
    .from('sejours')
    .select('*, prospect:prospects(nom,prenom,apporteur_id), lot_assigne:lots(reference)')
    .eq('id', sejourId)
    .single()

  if (!sejour) return

  const prospect = sejour.prospect as { nom: string; prenom: string; apporteur_id: string } | undefined
  if (!prospect) return

  const joursRestants = 30 - joursDepuisNoShow

  // Email apporteur
  if (prospect.apporteur_id) {
    const { data: apporteur } = await admin.from('profiles').select('email,prenom,nom').eq('id', prospect.apporteur_id).single()
    if (apporteur) {
      await sendEmail({
        to: apporteur.email,
        ...buildEmailAlerte({
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          joursRestants,
          lot_reference: (sejour.lot_assigne as { reference: string } | null)?.reference ?? '',
        }),
      })
    }
  }

  // Email managers
  const { data: managers } = await admin.from('profiles').select('email').in('role', ['direction', 'manager'])
  for (const m of managers ?? []) {
    await sendEmail({
      to: m.email,
      ...buildEmailAlerte({
        prospect: { nom: prospect.nom, prenom: prospect.prenom },
        joursRestants,
        lot_reference: (sejour.lot_assigne as { reference: string } | null)?.reference ?? '',
      }),
    })
  }
}

// ─── Toggle weekend actif ─────────────────────────────────────────────────────

export async function toggleWeekend(weekendId: string, actif: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('weekends_actives')
    .update({ actif })
    .eq('id', weekendId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Annuler séjour ───────────────────────────────────────────────────────────

export async function annulerSejour(sejourId: string) {
  const admin = createAdminClient()

  const { data: sejour } = await admin
    .from('sejours')
    .select('lot_assigne_id, weekend_id')
    .eq('id', sejourId)
    .single()

  const { error } = await admin
    .from('sejours')
    .update({ statut: 'annule' })
    .eq('id', sejourId)

  if (error) return { success: false, error: error.message }

  // Libérer le lot si assigné
  if (sejour?.lot_assigne_id) {
    await admin.from('lots').update({ statut: 'disponible' }).eq('id', sejour.lot_assigne_id)
  }

  // Décrémenter nb_sejours_confirmes du weekend
  if (sejour?.weekend_id) {
    const { data: wknd } = await admin
      .from('weekends_actives')
      .select('nb_sejours_confirmes')
      .eq('id', sejour.weekend_id)
      .single()

    if (wknd && (wknd.nb_sejours_confirmes ?? 0) > 0) {
      await admin
        .from('weekends_actives')
        .update({ nb_sejours_confirmes: wknd.nb_sejours_confirmes - 1 })
        .eq('id', sejour.weekend_id)
    }
  }

  return { success: true }
}
