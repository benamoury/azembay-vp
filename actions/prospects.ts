'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildEmailNouveauProspect,
  buildEmailProspectValide,
  buildEmailVoucherEmis,
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

  // Notify manager(s)
  const { data: managers } = await supabase
    .from('profiles')
    .select('email')
    .in('role', ['manager', 'direction'])

  if (managers) {
    const emailData = buildEmailNouveauProspect({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      budget_estime: data.budget_estime,
    })
    for (const m of managers) {
      await sendEmail({ to: m.email, ...emailData })
    }
  }

  return { success: true, prospect }
}

export async function validerProspect(prospectId: string) {
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
    .select('*, apporteur:profiles!apporteur_id(email,nom,prenom)')
    .single()

  if (error) return { success: false, error: error.message }

  // Notify apporteur
  if (prospect?.apporteur) {
    const ap = prospect.apporteur as { email: string; nom: string; prenom: string }
    const emailData = buildEmailProspectValide({ nom: prospect.nom, prenom: prospect.prenom })
    await sendEmail({ to: ap.email, ...emailData })
  }

  return { success: true }
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
    .select('*, prospect:prospects(nom,prenom), apporteur:profiles!apporteur_id(nom,prenom,email)')
    .single()

  if (error) return { success: false, error: error.message }

  // Advance prospect to visite_programmee
  await admin.from('prospects').update({ statut: 'visite_programmee' }).eq('id', data.prospect_id)

  // Update weekends nb_guests_confirmes
  await admin.rpc('increment_guests', { visite_date: data.date_visite }).maybeSingle()

  // Send email to apporteur with voucher info
  const ap = voucher.apporteur as { email: string; nom: string; prenom: string }
  const prospect = voucher.prospect as { nom: string; prenom: string }

  if (ap?.email) {
    const emailData = buildEmailVoucherEmis({
      prospect,
      voucher: {
        numero_voucher: voucher.numero_voucher,
        date_visite: data.date_visite,
        heure_visite: data.heure_visite,
      },
      apporteur: ap,
    })
    await sendEmail({ to: ap.email, ...emailData })
  }

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

  // Calculate retractation expiry (10 days after signature)
  const dateRetractation = data.date_signature
    ? new Date(new Date(data.date_signature).getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
