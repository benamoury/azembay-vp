'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildEmailSejourConfirme,
  buildEmailNoShow,
  buildEmailAnnulationSejourTardive,
  buildEmailWeekendComplet,
  buildEmailAucuneDisponibilite,
} from '@/lib/email/resend'
import { generateFacturePDF } from '@/lib/pdf/facture'

// â”€â”€â”€ Apporteur: soumettre un sÃ©jour (3 weekends prÃ©fÃ©rÃ©s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function soumettreSejourDemande(data: {
  prospect_id: string
  nb_adultes: number
  nb_enfants_plus_6: number
  nb_enfants_moins_6: number
  preferences_weekends: { rank: number; weekend_id: string }[]
  notes_apporteur?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifiÃ©' }

  const admin = createAdminClient()

  // VÃ©rifier que le prospect appartient Ã  l'apporteur
  const { data: prospect } = await admin
    .from('prospects')
    .select('id, statut, apporteur_id, lot_cible_id')
    .eq('id', data.prospect_id)
    .single()

  if (!prospect || prospect.apporteur_id !== user.id) {
    return { success: false, error: 'Prospect non trouvÃ©' }
  }

  const conditionsOk = ['visite_realisee', 'dossier_envoye', 'formulaire_signe', 'sejour_confirme', 'sejour_realise'].includes(prospect.statut)
  if (!conditionsOk) {
    return { success: false, error: 'Le prospect doit avoir rÃ©alisÃ© sa visite avant de soumettre un sÃ©jour' }
  }

  // VÃ©rifier quota apporteur via profiles (max 6)
  const { data: apporteurProfile } = await admin
    .from('profiles')
    .select('quota_sejours_utilise, quota_sejours_max')
    .eq('id', user.id)
    .single()

  const utilise = apporteurProfile?.quota_sejours_utilise ?? 0
  const max = apporteurProfile?.quota_sejours_max ?? 6

  if (utilise >= max) {
    return { success: false, error: `Quota de ${max} sÃ©jours atteint pour votre compte` }
  }

  // VÃ©rifier qu'il n'y a pas dÃ©jÃ  un sÃ©jour en cours pour ce prospect
  const { data: sejourExistant } = await admin
    .from('sejours')
    .select('id')
    .eq('prospect_id', data.prospect_id)
    .in('statut', ['demande', 'confirme'])
    .maybeSingle()

  if (sejourExistant) {
    return { success: false, error: 'Un sÃ©jour est dÃ©jÃ  en cours pour ce prospect' }
  }

  // BUG FIX #3: date_arrivee et date_depart doivent Ãªtre null (pas '') lors de la crÃ©ation
  // Elles seront renseignÃ©es par le manager lors de la confirmation
  const { data: sejour, error } = await admin
    .from('sejours')
    .insert({
      prospect_id: data.prospect_id,
      apporteur_id: user.id,
      nb_adultes: data.nb_adultes,
      nb_enfants_total: data.nb_enfants_plus_6 + data.nb_enfants_moins_6,
      nb_enfants_plus_6: data.nb_enfants_plus_6,
      nb_enfants_moins_6: data.nb_enfants_moins_6,
      preferences_weekends: data.preferences_weekends,
      date_arrivee: null,
      date_depart: null,
      notes_manager: data.notes_apporteur ?? null,
      statut: 'demande',
      gratuit: true,
      recouvre: false,
      noshow: false,
      facture_envoyee: false,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notifier managers + direction
  const { data: managers } = await admin
    .from('profiles')
    .select('email')
    .in('role', ['direction', 'manager'])

  const { data: prospectInfo } = await admin
    .from('prospects')
    .select('nom, prenom')
    .eq('id', data.prospect_id)
    .single()

  if (managers && prospectInfo) {
    const subject = `Nouvelle demande de sÃ©jour â€” ${prospectInfo.prenom} ${prospectInfo.nom}`
    const weekendsLabel = data.preferences_weekends.map(p => p.weekend_id).join(', ')
    const html = `<p>Nouvelle demande de sÃ©jour soumise pour ${prospectInfo.prenom} ${prospectInfo.nom}.</p>
      <p>PrÃ©fÃ©rences weekends : ${weekendsLabel}</p>
      <p>Participants : ${data.nb_adultes} adulte(s), ${data.nb_enfants_plus_6} enf.&gt;6ans, ${data.nb_enfants_moins_6} enf.â‰¤6ans</p>`
    for (const m of managers) {
      await sendEmail({ to: m.email, subject, html })
    }
  }

  return { success: true, sejourId: sejour.id }
}

// â”€â”€â”€ Manager: soumettre un sÃ©jour pour son propre prospect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Workflow: manager soumet â†’ pair manager valide â†’ direction valide â†’ GH + sÃ©jour

export async function soumettreSejourDemandeManager(data: {
  prospect_id: string
  nb_adultes: number
  nb_enfants_plus_6: number
  nb_enfants_moins_6: number
  preferences_weekends: { rank: number; weekend_id: string }[]
  notes_manager?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifiÃ©' }

  const admin = createAdminClient()

  // VÃ©rifier le rÃ´le manager
  const { data: profile } = await admin
    .from('profiles')
    .select('role, nom, prenom')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'direction'].includes(profile.role)) {
    return { success: false, error: 'AccÃ¨s refusÃ© â€” rÃ´le manager requis' }
  }

  // VÃ©rifier que le prospect existe et appartient Ã  ce manager (via manager_id) ou qu'il est soumis par un apporteur de ce manager
  const { data: prospect } = await admin
    .from('prospects')
    .select('id, statut, apporteur_id, lot_cible_id')
    .eq('id', data.prospect_id)
    .single()

  if (!prospect) return { success: false, error: 'Prospect non trouvÃ©' }

  // Statuts valides pour soumettre un sÃ©jour
  const conditionsOk = ['visite_realisee', 'dossier_envoye', 'formulaire_signe', 'sejour_confirme', 'sejour_realise'].includes(prospect.statut)
  if (!conditionsOk) {
    return { success: false, error: 'Le prospect doit avoir rÃ©alisÃ© sa visite avant de soumettre un sÃ©jour' }
  }

  // VÃ©rifier qu'il n'y a pas dÃ©jÃ  un sÃ©jour en cours
  const { data: sejourExistant } = await admin
    .from('sejours')
    .select('id')
    .eq('prospect_id', data.prospect_id)
    .in('statut', ['demande', 'confirme'])
    .maybeSingle()

  if (sejourExistant) {
    return { success: false, error: 'Un sÃ©jour est dÃ©jÃ  en cours pour ce prospect' }
  }

  // CrÃ©er la demande avec statut spÃ©cial 'demande_manager' pour diffÃ©rencier du workflow apporteur
  const { data: sejour, error } = await admin
    .from('sejours')
    .insert({
      prospect_id: data.prospect_id,
      apporteur_id: prospect.apporteur_id ?? null,
      nb_adultes: data.nb_adultes,
      nb_enfants_total: data.nb_enfants_plus_6 + data.nb_enfants_moins_6,
      nb_enfants_plus_6: data.nb_enfants_plus_6,
      nb_enfants_moins_6: data.nb_enfants_moins_6,
      preferences_weekends: data.preferences_weekends,
      date_arrivee: null,
      date_depart: null,
      notes_manager: data.notes_manager ?? null,
      statut: 'demande',
      source: 'manager',
      gratuit: true,
      recouvre: false,
      noshow: false,
      facture_envoyee: false,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notifier les autres managers (pairs) et la direction pour validation
  const { data: pairs } = await admin
    .from('profiles')
    .select('email, nom, prenom, id')
    .in('role', ['manager', 'direction'])
    .neq('id', user.id) // exclure le manager soumetteur

  const { data: prospectInfo } = await admin
    .from('prospects')
    .select('nom, prenom')
    .eq('id', data.prospect_id)
    .single()

  if (pairs && prospectInfo) {
    const subject = `[Validation requise] Demande de sÃ©jour manager â€” ${prospectInfo.prenom} ${prospectInfo.nom}`
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A3C6E;padding:20px;text-align:center;">
          <h2 style="color:#C8973A;margin:0;">AZEMBAY â€” Demande de sÃ©jour</h2>
        </div>
        <div style="padding:24px;background:#F8FAFC;">
          <p>Le manager <strong>${profile.prenom} ${profile.nom}</strong> a soumis une demande de sÃ©jour test pour :</p>
          <div style="background:white;padding:16px;border-radius:8px;border-left:4px solid #C8973A;margin:16px 0;">
            <p><strong>Prospect :</strong> ${prospectInfo.prenom} ${prospectInfo.nom}</p>
            <p><strong>Participants :</strong> ${data.nb_adultes} adulte(s), ${data.nb_enfants_plus_6} enf.&gt;6ans, ${data.nb_enfants_moins_6} enf.â‰¤6ans</p>
            ${data.notes_manager ? `<p><strong>Notes :</strong> ${data.notes_manager}</p>` : ''}
          </div>
          <p>Cette demande nÃ©cessite votre validation avant de procÃ©der Ã  l'assignation du weekend.</p>
        </div>
      </div>
    `
    for (const pair of pairs) {
      await sendEmail({ to: pair.email, subject, html })
    }
  }

  return { success: true, sejourId: sejour.id }
}

// â”€â”€â”€ Manager: confirmer un sÃ©jour (assign stock_hebergement + weekend) â”€â”€â”€â”€â”€â”€â”€â”€

export async function confirmerSejour(sejourId: string, data: {
  weekend_id: string
  date_arrivee: string
  date_depart: string
}) {
  const admin = createAdminClient()

  // Validation cÃ´tÃ© serveur des dates
  if (!data.date_arrivee || !data.date_depart) {
    return { success: false, error: 'Les dates d\'arrivÃ©e et de dÃ©part sont obligatoires' }
  }

  // S'assurer que le format est YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.date_arrivee) || !dateRegex.test(data.date_depart)) {
    return { success: false, error: 'Format de date invalide â€” attendu : YYYY-MM-DD' }
  }

  // RÃ©cupÃ©rer le sÃ©jour avec prospect
  const { data: sejour, error: sejourErr } = await admin
    .from('sejours')
    .select('*, prospect:prospects(nom,prenom,email,apporteur_id,lot_cible_id)')
    .eq('id', sejourId)
    .single()

  if (sejourErr || !sejour) return { success: false, error: 'SÃ©jour non trouvÃ©' }

  const prospect = sejour.prospect as {
    nom: string; prenom: string; email: string; apporteur_id: string; lot_cible_id?: string
  } | null

  // DÃ©terminer le type de lot du prospect (pour choisir le type d'unitÃ© d'hÃ©bergement)
  let lotType: string | null = null
  if (prospect?.lot_cible_id) {
    const { data: lot } = await admin.from('lots').select('type').eq('id', prospect.lot_cible_id).single()
    lotType = lot?.type ?? null
  }

  // FIFO auto-assignment: stock_hebergement du mÃªme type, disponible
  let stockQuery = admin
    .from('stock_hebergement')
    .select('*')
    .eq('disponible', true)
    .order('created_at', { ascending: true })
    .limit(1)

  if (lotType) {
    stockQuery = stockQuery.eq('type', lotType)
  }

  const { data: unite } = await stockQuery.single()

  if (!unite) {
    // Notifier l'apporteur : aucune disponibilitÃ©
    if (prospect?.apporteur_id) {
      const { data: apporteurProfile } = await admin.from('profiles').select('email').eq('id', prospect.apporteur_id).single()
      if (apporteurProfile && prospect) {
        const emailData = buildEmailAucuneDisponibilite({
          prospect: { nom: prospect.nom, prenom: prospect.prenom, id: sejour.prospect_id },
          type_lot: lotType ?? 'inconnu',
        })
        await sendEmail({ to: apporteurProfile.email, ...emailData })
      }
    }
    return { success: false, error: 'Aucune unitÃ© d\'hÃ©bergement disponible pour ce type de lot' }
  }

  // CrÃ©er le token d'annulation
  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .insert({
      type: 'sejour',
      reference_id: sejourId,
    })
    .select('id, token')
    .single()

  // Mettre Ã  jour le sÃ©jour
  const { error } = await admin
    .from('sejours')
    .update({
      statut: 'confirme',
      stock_hebergement_id: unite.id,
      weekend_id: data.weekend_id,
      date_arrivee: data.date_arrivee,
      date_depart: data.date_depart,
      annulation_token_id: tokenRow?.id ?? null,
    })
    .eq('id', sejourId)

  if (error) return { success: false, error: error.message }

  // Bloquer l'unitÃ© d'hÃ©bergement
  await admin.from('stock_hebergement').update({ disponible: false }).eq('id', unite.id)

  // IncrÃ©menter quota_sejours_utilise de l'apporteur (seulement si prospect soumis par apporteur)
  if (prospect?.apporteur_id) {
    const apporteurId = prospect.apporteur_id
    try {
      await admin.rpc('increment_quota_sejours', { apporteur_id: apporteurId })
    } catch {
      // Fallback si la fonction RPC n'existe pas encore
      const { data: apProfile } = await admin.from('profiles')
        .select('quota_sejours_utilise')
        .eq('id', apporteurId)
        .single()
      if (apProfile) {
        await admin.from('profiles')
          .update({ quota_sejours_utilise: (apProfile.quota_sejours_utilise ?? 0) + 1 })
          .eq('id', apporteurId)
      }
    }
  }

  // Mettre Ã  jour statut du prospect
  await admin.from('prospects').update({ statut: 'sejour_confirme' }).eq('id', sejour.prospect_id)

  // IncrÃ©menter nb_sejours_confirmes du weekend
  const { data: wknd } = await admin
    .from('weekends_actives')
    .select('nb_sejours_confirmes, seuil_guests, date_vendredi, date_dimanche')
    .eq('id', data.weekend_id)
    .single()

  if (wknd) {
    const newCount = (wknd.nb_sejours_confirmes ?? 0) + 1
    const newStatut = newCount >= (wknd.seuil_guests ?? 3) ? 'complet' : 'ouvert'
    await admin
      .from('weekends_actives')
      .update({ nb_sejours_confirmes: newCount, statut: newStatut })
      .eq('id', data.weekend_id)

    // E-INT1: 3 sÃ©jours confirmÃ©s â†’ notifier managers + direction + sÃ©curitÃ©
    if (newStatut === 'complet') {
      const { data: sejoursWeekend } = await admin
        .from('sejours')
        .select('*, prospect:prospects(nom,prenom,lot_cible:lots(type))')
        .eq('weekend_id', data.weekend_id)
        .eq('statut', 'confirme')

      const { data: alertRecipients } = await admin
        .from('profiles')
        .select('email')
        .in('role', ['direction', 'manager', 'securite'])

      if (alertRecipients && sejoursWeekend) {
        const sejoursData = sejoursWeekend.map(s => {
          const pr = s.prospect as { nom: string; prenom: string; lot_cible?: { type: string } } | null
          return {
            nom: pr?.nom ?? '',
            prenom: pr?.prenom ?? '',
            unite_type: pr?.lot_cible?.type,
          }
        })

        const emailData = buildEmailWeekendComplet({
          weekend: {
            date_vendredi: wknd.date_vendredi,
            date_dimanche: wknd.date_dimanche ?? data.date_depart,
          },
          sejours: sejoursData,
        })

        for (const r of alertRecipients) {
          await sendEmail({ to: r.email, ...emailData })
        }
      }
    }
  }

  // E7 â€” Email de confirmation sÃ©jour â†’ client + apporteur
  const lien_annulation = tokenRow?.token
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://azembay.vercel.app'}/annuler/${tokenRow.token}`
    : ''

  if (prospect) {
    const emailData = buildEmailSejourConfirme({
      prospect: { nom: prospect.nom, prenom: prospect.prenom },
      sejour: {
        date_arrivee: data.date_arrivee,
        date_depart: data.date_depart,
        nb_adultes: sejour.nb_adultes,
        nb_enfants_plus_6: sejour.nb_enfants_plus_6 ?? 0,
        nb_enfants_moins_6: sejour.nb_enfants_moins_6 ?? 0,
        unite_reference: unite.reference,
        unite_type: unite.type,
      },
      lien_annulation,
    })

    if (prospect.email) await sendEmail({ to: prospect.email, ...emailData })

    if (prospect.apporteur_id) {
      const { data: apporteurProfile } = await admin.from('profiles').select('email').eq('id', prospect.apporteur_id).single()
      if (apporteurProfile?.email && apporteurProfile.email !== prospect.email) {
        await sendEmail({ to: apporteurProfile.email, ...emailData })
      }
    }

    // Copie sÃ©curitÃ©
    const { data: securite } = await admin.from('profiles').select('email').eq('role', 'securite')
    for (const s of securite ?? []) {
      await sendEmail({ to: s.email, ...emailData })
    }
  }

  return { success: true }
}

// â”€â”€â”€ Direction: valider le weekend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function validerWeekend(weekendId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifiÃ©' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('weekends_actives')
    .update({
      statut: 'valide',
      valide_at: new Date().toISOString(),
      valide_by: user.id,
    })
    .eq('id', weekendId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// â”€â”€â”€ Manager: dÃ©clarer un no-show + gÃ©nÃ©rer facture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function declarerNoShow(sejourId: string, managerId: string) {
  const admin = createAdminClient()

  const { data: sejour, error } = await admin
    .from('sejours')
    .select('*, prospect:prospects(nom,prenom,email,telephone,apporteur_id), stock_hebergement:stock_hebergement(reference,type)')
    .eq('id', sejourId)
    .single()

  if (error || !sejour) return { success: false, error: 'SÃ©jour non trouvÃ©' }

  const MONTANT_NOSHOW_HT = sejour.montant_facturable ?? 5000
  const TVA = 0.20
  const montant_ttc = MONTANT_NOSHOW_HT * (1 + TVA)

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

  // LibÃ©rer l'unitÃ© d'hÃ©bergement
  if (sejour.stock_hebergement_id) {
    await admin.from('stock_hebergement').update({ disponible: true }).eq('id', sejour.stock_hebergement_id)
  }

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
        sejour: { date_arrivee: sejour.date_arrivee ?? '', date_depart: sejour.date_depart ?? '' },
      })

      const emailData = buildEmailNoShow({
        prospect: { nom: prospect.nom, prenom: prospect.prenom },
        date_arrivee: sejour.date_arrivee ?? '',
        date_depart: sejour.date_depart ?? '',
      })

      await sendEmail({
        to: prospect.email,
        ...emailData,
        attachments: [{ filename: `Facture-${facture.numero_facture ?? sejourId.slice(0, 8)}.pdf`, content: pdfBuffer }],
      })

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

// â”€â”€â”€ Manager: confirmer recouvrement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  await admin.from('factures').update({ statut: 'payee' }).eq('sejour_id', sejourId)

  return { success: true }
}

// â”€â”€â”€ Manager: marquer sÃ©jour rÃ©alisÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function marquerSejourRealise(sejourId: string) {
  const admin = createAdminClient()

  const { data: sejour, error } = await admin
    .from('sejours')
    .update({ statut: 'realise' })
    .eq('id', sejourId)
    .select('prospect_id, stock_hebergement_id')
    .single()

  if (error) return { success: false, error: error.message }

  // LibÃ©rer l'unitÃ© d'hÃ©bergement
  if (sejour.stock_hebergement_id) {
    await admin.from('stock_hebergement').update({ disponible: true }).eq('id', sejour.stock_hebergement_id)
  }

  await admin.from('prospects').update({ statut: 'sejour_realise' }).eq('id', sejour.prospect_id)

  return { success: true }
}

// â”€â”€â”€ Toggle weekend actif â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function toggleWeekend(weekendId: string, actif: boolean) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('weekends_actives')
    .update({ actif })
    .eq('id', weekendId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// â”€â”€â”€ Annuler sÃ©jour (interne) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function annulerSejour(sejourId: string) {
  const admin = createAdminClient()

  const { data: sejour } = await admin
    .from('sejours')
    .select('stock_hebergement_id, weekend_id, date_arrivee, annulation_token_id, prospect_id')
    .eq('id', sejourId)
    .single()

  // VÃ©rifier si annulation tardive (<72h) â€” seulement si date_arrivee est renseignÃ©e
  const isLate = sejour?.date_arrivee
    ? (new Date(sejour.date_arrivee).getTime() - Date.now()) < 72 * 60 * 60 * 1000
    : false

  const { error } = await admin
    .from('sejours')
    .update({ statut: 'annule' })
    .eq('id', sejourId)

  if (error) return { success: false, error: error.message }

  // LibÃ©rer l'unitÃ© d'hÃ©bergement
  if (sejour?.stock_hebergement_id) {
    await admin.from('stock_hebergement').update({ disponible: true }).eq('id', sejour.stock_hebergement_id)
  }

  // Invalider le token
  if (sejour?.annulation_token_id) {
    await admin
      .from('annulation_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', sejour.annulation_token_id)
  }

  // DÃ©crÃ©menter nb_sejours_confirmes du weekend
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

  // Si annulation tardive â†’ email E9 + facture
  if (isLate && sejour?.prospect_id) {
    const { data: prospect } = await admin
      .from('prospects')
      .select('nom, prenom, email')
      .eq('id', sejour.prospect_id)
      .single()

    if (prospect) {
      const MONTANT_HT = 5000
      const TVA = 0.20
      const montant_ttc = MONTANT_HT * (1 + TVA)

      const { data: facture } = await admin
        .from('factures')
        .insert({
          sejour_id: sejourId,
          prospect_id: sejour.prospect_id,
          montant_ht: MONTANT_HT,
          tva_pct: 20,
          montant_ttc,
          statut: 'emise',
        })
        .select()
        .single()

      try {
        const dateArrivee = sejour.date_arrivee ?? ''
        const pdfBuffer = await generateFacturePDF({
          facture: {
            numero_facture: facture?.numero_facture ?? `FAC-${sejourId.slice(0, 8)}`,
            date_emission: facture?.date_emission ?? new Date().toISOString(),
            montant_ht: MONTANT_HT,
            tva_pct: 20,
            montant_ttc,
          },
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          sejour: { date_arrivee: dateArrivee, date_depart: '' },
        })

        const emailData = buildEmailAnnulationSejourTardive({
          prospect: { nom: prospect.nom, prenom: prospect.prenom },
          date_arrivee: dateArrivee,
          date_depart: '',
        })

        if (prospect.email) {
          await sendEmail({
            to: prospect.email,
            ...emailData,
            attachments: [{ filename: `Facture-annulation-${sejourId.slice(0, 8)}.pdf`, content: pdfBuffer }],
          })
        }
      } catch (e) {
        console.error('PDF generation error:', e)
      }
    }
  }

  return { success: true }
}

// â”€â”€â”€ Annulation sÃ©jour publique (via token UUID) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function annulerSejourParToken(token: string) {
  const admin = createAdminClient()

  // VÃ©rifier le token
  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .select('*')
    .eq('token', token)
    .eq('type', 'sejour')
    .single()

  if (!tokenRow) return { success: false, error: 'Lien invalide ou expirÃ©' }
  if (tokenRow.used_at) return { success: false, error: 'Ce lien a dÃ©jÃ  Ã©tÃ© utilisÃ©' }
  if (new Date(tokenRow.expires_at) < new Date()) return { success: false, error: 'Lien expirÃ©' }

  // Trouver le sÃ©jour
  const { data: sejour } = await admin
    .from('sejours')
    .select('id, prospect_id, date_arrivee, date_depart, stock_hebergement_id, weekend_id')
    .eq('annulation_token_id', tokenRow.id)
    .in('statut', ['demande', 'confirme'])
    .single()

  if (!sejour) return { success: false, error: 'Aucun sÃ©jour actif trouvÃ©' }

  // VÃ©rifier si annulation tardive (<72h) â€” seulement si la date est renseignÃ©e
  const isLate = sejour.date_arrivee
    ? (new Date(sejour.date_arrivee).getTime() - Date.now()) < 72 * 60 * 60 * 1000
    : false

  if (isLate) {
    // Retourner flag pour afficher popup confirmation cÃ´tÃ© client
    return { success: false, tardive: true, error: 'Annulation <72h â€” facturation applicable' }
  }

  return annulerSejour(sejour.id)
}

// â”€â”€â”€ Confirmer annulation tardive (aprÃ¨s popup) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function confirmerAnnulationTardive(token: string) {
  const admin = createAdminClient()

  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .select('id')
    .eq('token', token)
    .eq('type', 'sejour')
    .single()

  if (!tokenRow) return { success: false, error: 'Lien invalide' }

  const { data: sejour } = await admin
    .from('sejours')
    .select('id')
    .eq('annulation_token_id', tokenRow.id)
    .in('statut', ['demande', 'confirme'])
    .single()

  if (!sejour) return { success: false, error: 'Aucun sÃ©jour actif trouvÃ©' }

  return annulerSejour(sejour.id)
}


