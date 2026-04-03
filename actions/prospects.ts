'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildEmailNouveauProspect,
  buildEmailProspectQualifie,
  buildEmailProspectValide,
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
    .select('*, prospect:prospects(nom,prenom,email), apporteur:profiles!apporteur_id(nom,prenom,email,telephone)')
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect to visite_programmee
  await admin.from('prospects').update({ statut: 'visite_programmee' }).eq('id', data.prospect_id)

  return { success: true, voucher }
}

export async function creerFormulaire(data: {
  prospect_id: string
  lot_id: string
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
      statut: 'signe',
      date_retractation_expire: dateRetractation,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect
  await admin.from('prospects').update({ statut: 'formulaire_signe', lot_cible_id: data.lot_id }).eq('id', data.prospect_id)

  // Block the lot
  await admin.from('lots').update({ statut: 'bloque' }).eq('id', data.lot_id)

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

  // Profile is auto-created by trigger, but update telephone if provided
  if (data.telephone) {
    await admin.from('profiles').update({ telephone: data.telephone }).eq('id', authUser.user.id)
  }

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
