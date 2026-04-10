'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildEmailNouveauProspect,
  buildEmailProspectQualifie,
  buildEmailProspectValide,
  buildEmailVoucher,
} from '@/lib/email/resend'
import type { ProspectStatut } from '@/lib/types'

export async function soumettreProspect(data: {
  apporteur_id: string
  nom: string
  prenom: string
  email: string
  telephone?: string
  ville?: string
  pays?: string
  nationalite?: string
  profil?: string
  localisation?: string
  budget_estime?: number
  capacite_financiere?: string
  reference_personnelle?: string
  valeur_ajoutee?: string
  lot_cible_id?: string
  notes?: string
  source?: 'public' | 'acquereur' | 'source_remuneree'
  source_remuneree_id?: string
}) {
  const supabase = createAdminClient()

  const { data: prospect, error } = await supabase
    .from('prospects')
    .insert({ ...data, statut: 'soumis' })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Notifier les managers uniquement (pas la Direction — E1)
  const { data: managers } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'manager')

  // Récupérer le nom de l'apporteur
  const { data: apporteurProfile } = await supabase
    .from('profiles')
    .select('nom, prenom')
    .eq('id', data.apporteur_id)
    .single()

  const apporteur_nom = apporteurProfile
    ? `${apporteurProfile.prenom} ${apporteurProfile.nom}`
    : undefined

  if (managers) {
    const emailData = buildEmailNouveauProspect({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      apporteur_nom,
      prospect_id: prospect.id,
    })
    for (const m of managers) {
      await sendEmail({ to: m.email, ...emailData })
    }
  }

  return { success: true, prospect }
}

// ─── Étape 2 : Manager qualifie (note obligatoire en base requise) ─────────────

export async function qualifierProspect(prospectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // Vérifier qu'au moins une note existe pour ce prospect
  const { count } = await admin
    .from('client_notes')
    .select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospectId)

  if (!count || count === 0) {
    return { success: false, error: 'Une note de qualification est obligatoire avant de qualifier ce prospect.' }
  }

  // Récupérer les notes et infos du prospect
  const { data: prospect } = await admin
    .from('prospects')
    .select('*, apporteur:profiles!apporteur_id(nom,prenom,email)')
    .eq('id', prospectId)
    .single()

  if (!prospect) return { success: false, error: 'Prospect non trouvé' }

  const { data: notes } = await admin
    .from('client_notes')
    .select('contenu, created_at')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(5)

  const notesText = notes?.map(n => n.contenu).join('\n---\n') ?? ''

  // Mettre à jour le statut
  const { error } = await admin
    .from('prospects')
    .update({ statut: 'qualifie' })
    .eq('id', prospectId)

  if (error) return { success: false, error: error.message }

  // Récupérer le profil du manager pour le nom
  const { data: managerProfile } = await admin
    .from('profiles')
    .select('nom, prenom')
    .eq('id', user.id)
    .single()

  const apporteur = prospect.apporteur as { nom: string; prenom: string; email: string } | null
  const apporteur_nom = apporteur ? `${apporteur.prenom} ${apporteur.nom}` : 'Apporteur'

  // E2 → Direction
  const { data: directions } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'direction')

  const emailData = buildEmailProspectQualifie({
    prospect: { nom: prospect.nom, prenom: prospect.prenom, email: prospect.email, id: prospect.id },
    apporteur_nom,
    notes: notesText,
  })

  for (const d of directions ?? []) {
    await sendEmail({ to: d.email, ...emailData })
  }

  return { success: true }
}

// ─── Étape 3 : Direction approuve ──────────────────────────────────────────────

export async function approuverProspect(prospectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  const { data: prospect, error } = await admin
    .from('prospects')
    .update({
      statut: 'valide',
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .select('*, apporteur:profiles!apporteur_id(email,nom,prenom,id)')
    .single()

  if (error) return { success: false, error: error.message }

  // E3 → Apporteur
  if (prospect?.apporteur) {
    const ap = prospect.apporteur as { email: string; nom: string; prenom: string; id: string }
    const emailData = buildEmailProspectValide({
      prospect: { nom: prospect.nom, prenom: prospect.prenom, id: prospect.id },
    })
    await sendEmail({ to: ap.email, ...emailData })
  }

  return { success: true }
}

// Alias legacy conservé pour compatibilité avec pages existantes
export async function validerProspect(prospectId: string) {
  return approuverProspect(prospectId)
}

export async function rejeterProspect(prospectId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({ statut: 'non_concluant' })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function avancerEtapeProspect(prospectId: string, nextStatut: ProspectStatut) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({ statut: nextStatut })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function marquerNonConcluant(prospectId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({ statut: 'non_concluant' })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function emettreLienSecurise(prospectId: string, createdBy: string) {
  const admin = createAdminClient()

  // Find a post-visite document
  const { data: doc } = await admin
    .from('documents')
    .select('id')
    .eq('categorie', 'presentation_post_visite')
    .eq('actif', true)
    .limit(1)
    .single()

  if (!doc) return { success: false, error: 'Aucun document post-visite disponible' }

  const { data: lien, error } = await admin
    .from('liens_securises')
    .insert({
      prospect_id: prospectId,
      document_id: doc.id,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect status
  await admin.from('prospects').update({ statut: 'dossier_envoye' }).eq('id', prospectId)

  return { success: true, lien }
}

export async function creerVoucher(data: {
  prospect_id: string
  apporteur_id: string
  manager_id: string
  date_visite: string
  heure_visite: string
}) {
  const admin = createAdminClient()

  const { data: voucher, error } = await admin
    .from('vouchers')
    .insert(data)
    .select('*, prospect:prospects(nom,prenom,email), apporteur:profiles!apporteur_id(nom,prenom,email,telephone), manager:profiles!manager_id(nom,prenom,email)')
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect to visite_programmee
  await admin.from('prospects').update({ statut: 'visite_programmee' }).eq('id', data.prospect_id)

  // Envoyer email voucher au prospect + apporteur + manager
  if (voucher) {
    const prospect = voucher.prospect as { nom: string; prenom: string; email: string } | null
    const apporteur = (Array.isArray(voucher.apporteur) ? voucher.apporteur[0] : voucher.apporteur) as { nom: string; prenom: string; email: string; telephone?: string } | null
    const manager = (Array.isArray(voucher.manager) ? voucher.manager[0] : voucher.manager) as { nom: string; prenom: string; email: string } | null

    const dateFormatted = new Date(data.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    if (prospect && apporteur && manager) {
      const emailData = buildEmailVoucher({
        prospect: { nom: prospect.nom, prenom: prospect.prenom, email: prospect.email },
        apporteur: { nom: apporteur.nom, prenom: apporteur.prenom, telephone: apporteur.telephone },
        manager: { nom: manager.nom, prenom: manager.prenom },
        date_visite: dateFormatted,
        heure_visite: data.heure_visite,
        numero_voucher: voucher.numero_voucher,
      })

      // Envoyer séparément à chaque destinataire + responsable technique en CC
      const TECH_EMAIL = 'boussors@earth.ma'
      const sends: Promise<any>[] = []
      if (prospect.email) sends.push(sendEmail({ to: prospect.email, cc: TECH_EMAIL, ...emailData }))
      if (apporteur.email && apporteur.email !== prospect.email) sends.push(sendEmail({ to: apporteur.email, cc: TECH_EMAIL, ...emailData }))
      if (manager.email && manager.email !== apporteur.email && manager.email !== prospect.email) sends.push(sendEmail({ to: manager.email, cc: TECH_EMAIL, ...emailData }))
      await Promise.all(sends)
    }
  }

  return { success: true, voucher }
}

export async function creerFormulaire(data: {
  prospect_id: string
  lot_id: string
  lot_ids?: string[]
  type: string
  programme_hotelier?: string
  date_signature?: string
  sejour_test_souhaite?: boolean
}) {
  const admin = createAdminClient()

  // Calculate retractation expiry: 7 working days (Mon-Fri only) after signature
  function addWorkingDays(from: string, days: number): string {
    const d = new Date(from + 'T00:00:00')
    let added = 0
    while (added < days) {
      d.setDate(d.getDate() + 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) added++ // skip Saturday (6) and Sunday (0)
    }
    return d.toISOString().split('T')[0]
  }
  const dateRetractation = data.date_signature
    ? addWorkingDays(data.date_signature, 7)
    : undefined

  const { data: formulaire, error } = await admin
    .from('formulaires')
    .insert({
      ...data,
      lot_ids: data.lot_ids || [data.lot_id],
      statut: 'signe',
      statut_direction: 'en_attente_direction',
      date_retractation_expire: dateRetractation,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect
  await admin.from('prospects').update({ statut: 'formulaire_signe', lot_cible_id: data.lot_id }).eq('id', data.prospect_id)

  // Bloquer tous les lots concernés
  const lotIds = data.lot_ids || [data.lot_id]
  for (const lotId of lotIds) {
    await admin.from('lots').update({ statut: 'bloque' }).eq('id', lotId)
  }

  // Notify direction + manager
  const { data: managers } = await admin.from('profiles').select('email').in('role', ['direction', 'manager'])
  const { data: prospect } = await admin.from('prospects').select('nom,prenom').eq('id', data.prospect_id).single()
  const { data: lot } = await admin.from('lots').select('reference').eq('id', data.lot_id).single()

  if (managers && prospect && lot) {
    for (const m of managers) {
      await sendEmail({
        to: m.email,
        subject: `📝 Formulaire signé — ${prospect.prenom} ${prospect.nom} — Lot ${lot.reference}`,
        html: `<p>Formulaire de réservation signé pour ${prospect.prenom} ${prospect.nom} sur le lot ${lot.reference}.</p>`,
      })
    }
  }

  return { success: true, formulaire }
}

export async function creerSejour(data: {
  prospect_id: string
  date_arrivee: string
  date_depart: string
  nb_adultes: number
  nb_enfants: number
}) {
  const admin = createAdminClient()
  const { data: sejour, error } = await admin
    .from('sejours')
    .insert({ ...data, statut: 'demande', gratuit: true })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, sejour }
}

export async function creerUtilisateur(data: {
  email: string
  nom: string
  prenom: string
  telephone?: string
  role: 'direction' | 'manager' | 'apporteur' | 'securite'
}) {
  const admin = createAdminClient()

  // Create auth user with temp password
  const tempPassword = `Azembay${Math.random().toString(36).slice(2, 8)}2026!`
  const { data: authUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nom: data.nom, prenom: data.prenom, role: data.role },
  })

  if (error) return { success: false, error: error.message }

  // Upsert profile — ne pas dépendre du trigger seul
  await admin.from('profiles').upsert({
    id: authUser.user.id,
    email: data.email,
    nom: data.nom,
    prenom: data.prenom,
    role: data.role,
    telephone: data.telephone || null,
  }, { onConflict: 'id' })

  // Send welcome email
  await sendEmail({
    to: data.email,
    subject: 'Bienvenue sur Azembay — Vente Privée',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A3C6E;padding:24px;text-align:center;">
          <h1 style="color:#C8973A;margin:0;">AZEMBAY</h1>
        </div>
        <div style="padding:32px;background:#F8FAFC;">
          <h2 style="color:#1A3C6E;">Bienvenue, ${data.prenom} !</h2>
          <p>Votre compte a été créé sur la plateforme Azembay RIPT 1.</p>
          <div style="background:white;padding:16px;border-radius:8px;border-left:4px solid #C8973A;margin:20px 0;">
            <p><strong>Email :</strong> ${data.email}</p>
            <p><strong>Mot de passe provisoire :</strong> ${tempPassword}</p>
          </div>
          <p style="color:#ef4444;font-size:12px;">Changez votre mot de passe dès la première connexion.</p>
        </div>
      </div>
    `,
  })

  return { success: true }
}

export async function modifierUtilisateur(userId: string, data: {
  nom: string
  prenom: string
  telephone?: string
  role: 'direction' | 'manager' | 'apporteur' | 'securite'
}) {
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(data).eq('id', userId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function supprimerUtilisateur(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function modifierStatutLot(lotId: string, statut: 'disponible' | 'bloque' | 'vendu') {
  const admin = createAdminClient()
  const { error } = await admin.from('lots').update({ statut }).eq('id', lotId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function modifierPrixLot(lotId: string, data: { prix_individuel?: number; prix_bloc?: number }) {
  const admin = createAdminClient()
  const { error } = await admin.from('lots').update(data).eq('id', lotId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Prospect Lots (multi-lots N-N) ───────────────────────────────────────────

export async function ajouterLotProspect(prospectId: string, lotId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospect_lots')
    .insert({ prospect_id: prospectId, lot_id: lotId })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function retirerLotProspect(prospectId: string, lotId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospect_lots')
    .delete()
    .eq('prospect_id', prospectId)
    .eq('lot_id', lotId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getLotsDuProspect(prospectId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prospect_lots')
    .select('*, lot:lots(*)')
    .eq('prospect_id', prospectId)
  if (error) return []
  return data ?? []
}


// ─── Validation formulaire par Direction ──────────────────────────────────────

export async function validerFormulaireDirection(formulaireId: string, dateValidation: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  const { data: formulaire, error } = await admin
    .from('formulaires')
    .update({
      statut_direction: 'valide_direction',
      valide_par_direction_at: dateValidation,
      valide_par_direction_id: user.id,
    })
    .eq('id', formulaireId)
    .select('*, prospect:prospects(nom,prenom), lot:lots(reference)')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, formulaire }
}

export async function rejeterFormulaireDirection(formulaireId: string) {
  const admin = createAdminClient()

  // Récupérer le formulaire pour débloquer les lots
  const { data: formulaire } = await admin
    .from('formulaires')
    .select('lot_id, lot_ids, prospect_id')
    .eq('id', formulaireId)
    .single()

  if (formulaire) {
    // Débloquer tous les lots
    const lotIds = formulaire.lot_ids || [formulaire.lot_id]
    for (const lotId of lotIds) {
      await admin.from('lots').update({ statut: 'disponible' }).eq('id', lotId)
    }
    // Remettre le prospect en dossier_envoye
    await admin.from('prospects').update({ statut: 'dossier_envoye' }).eq('id', formulaire.prospect_id)
  }

  const { error } = await admin
    .from('formulaires')
    .update({ statut: 'expire', statut_direction: 'rejete_direction' })
    .eq('id', formulaireId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Sources rémunérées ────────────────────────────────────────────────────────

export async function creerSourceRemuneree(data: { nom: string; description?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()
  const { data: source, error } = await admin
    .from('sources_remunerees')
    .insert({ ...data, actif: true, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, source }
}

export async function supprimerSourceRemuneree(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('sources_remunerees').update({ actif: false }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getSourcesRemunerees() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sources_remunerees')
    .select('*')
    .eq('actif', true)
    .order('nom')
  return data || []
}

// ─── Gestion prospects orange (post J+7 sans formulaire) ──────────────────────

export async function mettreEnListeAttente(prospectId: string, data: {
  delai: string // date estimée de signature ex: "2026-10-01"
  notes: string
}) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({
      statut: 'liste_attente',
      liste_attente_delai: data.delai,
      liste_attente_notes: data.notes,
    })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function closerProspect(prospectId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({ statut: 'non_concluant' })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function reactiverProspect(prospectId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('prospects')
    .update({ statut: 'sejour_realise' })
    .eq('id', prospectId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Acquéreurs ───────────────────────────────────────────────────────────────

export async function creerAcquereur(data: { nom: string; prenom: string; email?: string; telephone?: string; description?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }
  const admin = createAdminClient()
  const { data: acquereur, error } = await admin
    .from('acquereurs')
    .insert({ ...data, actif: true, created_by: user.id })
    .select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, acquereur }
}

export async function supprimerAcquereur(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('acquereurs').update({ actif: false }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getAcquereurs() {
  const admin = createAdminClient()
  const { data } = await admin.from('acquereurs').select('*').eq('actif', true).order('nom')
  return data || []
}

// ─── Validation assignation par Direction ─────────────────────────────────────

export async function validerAssignation(prospectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  const { data: prospect, error } = await admin
    .from('prospects')
    .update({
      assignation_validee: true,
      assignation_validee_at: new Date().toISOString(),
      assignation_validee_by: user.id,
      statut: 'soumis',
    })
    .eq('id', prospectId)
    .select('*, apporteur:profiles!apporteur_id(email, nom, prenom)')
    .single()

  if (error) return { success: false, error: error.message }

  // Envoyer email d'assignation à l'apporteur
  if (prospect?.apporteur) {
    const ap = prospect.apporteur as { email: string; nom: string; prenom: string }
    await sendEmail({
      to: ap.email,
      subject: `📋 Nouveau prospect assigné — ${prospect.prenom} ${prospect.nom}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1A3C6E;padding:24px;text-align:center;">
            <h1 style="color:#C8973A;margin:0;letter-spacing:2px;">AZEMBAY</h1>
          </div>
          <div style="padding:32px;background:#F8FAFC;">
            <h2 style="color:#1A3C6E;">Bonjour ${ap.prenom},</h2>
            <p>Un nouveau prospect vous a été assigné et validé par la Direction.</p>
            <div style="background:white;padding:16px;border-radius:8px;border-left:4px solid #C8973A;margin:20px 0;">
              <p><strong>Prospect :</strong> ${prospect.prenom} ${prospect.nom}</p>
              <p><strong>Email :</strong> ${prospect.email}</p>
              ${prospect.telephone ? `<p><strong>Téléphone :</strong> ${prospect.telephone}</p>` : ''}
            </div>
            <p>Connectez-vous sur <a href="https://azembay.vercel.app">azembay.vercel.app</a> pour consulter le dossier.</p>
          </div>
        </div>
      `,
    })
  }

  return { success: true }
}

// ─── Actions post-séjour (orange) ─────────────────────────────────────────────


// ─── Modification prospect (apporteur + manager + direction) ─────────────────

export async function modifierProspect(prospectId: string, data: {
  nom?: string
  prenom?: string
  email?: string
  telephone?: string
  ville?: string
  profil?: string
  budget_estime?: number
  capacite_financiere?: string
  reference_personnelle?: string
  valeur_ajoutee?: string
  notes?: string
  source?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('prospects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', prospectId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Renvoyer voucher ─────────────────────────────────────────────────────────

export async function renvoyerVoucher(voucherId: string) {
  const admin = createAdminClient()

  const { data: voucher, error } = await admin
    .from('vouchers')
    .select('*, prospect:prospects(nom,prenom,email), apporteur:profiles!apporteur_id(nom,prenom,email,telephone), manager:profiles!manager_id(nom,prenom,email)')
    .eq('id', voucherId)
    .single()

  if (error || !voucher) return { success: false, error: error?.message || 'Voucher introuvable' }

  const prospect = voucher.prospect as { nom: string; prenom: string; email: string } | null
  const apporteur = (Array.isArray(voucher.apporteur) ? voucher.apporteur[0] : voucher.apporteur) as { nom: string; prenom: string; email: string; telephone?: string } | null
  const manager = (Array.isArray(voucher.manager) ? voucher.manager[0] : voucher.manager) as { nom: string; prenom: string; email: string } | null

  if (!prospect || !apporteur || !manager) return { success: false, error: 'Données incomplètes' }

  const dateFormatted = new Date(voucher.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const emailData = buildEmailVoucher({
    prospect: { nom: prospect.nom, prenom: prospect.prenom, email: prospect.email },
    apporteur: { nom: apporteur.nom, prenom: apporteur.prenom, telephone: apporteur.telephone },
    manager: { nom: manager.nom, prenom: manager.prenom },
    date_visite: dateFormatted,
    heure_visite: voucher.heure_visite,
    numero_voucher: voucher.numero_voucher,
  })

  const recipients: string[] = []
  if (prospect.email) recipients.push(prospect.email)
  if (apporteur.email) recipients.push(apporteur.email)
  if (manager.email) recipients.push(manager.email)

  // Envoyer séparément à chaque destinataire + responsable technique en CC
  const TECH_EMAIL_R = 'boussors@earth.ma'
  const sendsR: Promise<any>[] = []
  if (prospect.email) sendsR.push(sendEmail({ to: prospect.email, cc: TECH_EMAIL_R, ...emailData }))
  if (apporteur.email && apporteur.email !== prospect.email) sendsR.push(sendEmail({ to: apporteur.email, cc: TECH_EMAIL_R, ...emailData }))
  if (manager.email && manager.email !== apporteur.email && manager.email !== prospect.email) sendsR.push(sendEmail({ to: manager.email, cc: TECH_EMAIL_R, ...emailData }))
  await Promise.all(sendsR)

  return { success: true }
}
