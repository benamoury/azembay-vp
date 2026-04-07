import { Resend } from 'resend'

// Lazy initialization — évite l'erreur "Missing API key" au build
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// ✅ FROM corrigé — domaine earth.ma vérifié dans Resend
const FROM = 'AZEMBAY <noreply@earth.ma>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://azembay.vercel.app'

// ─── Layout commun ────────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:#1A3C6E;padding:24px 32px;text-align:center;">
        <h1 style="color:#C8973A;margin:0;font-size:22px;letter-spacing:2px;">AZEMBAY</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;">RIPT 1 — Vente Privée Off-Market — Sidi Bou Naim</p>
      </div>
      <div style="padding:32px;background:#F8FAFC;">
        ${content}
      </div>
      <div style="padding:16px 32px;background:#1A3C6E;text-align:center;">
        <p style="color:rgba(255,255,255,0.4);margin:0;font-size:11px;">CONFIDENTIEL — Document réservé aux membres autorisés</p>
      </div>
    </div>
  `
}

function btn(label: string, url: string) {
  return `<a href="${url}" style="display:inline-block;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:20px;">${label} →</a>`
}

function card(content: string) {
  return `<div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;margin-bottom:20px;">${content}</div>`
}

function row(label: string, value: string) {
  return `<p style="margin:0 0 8px;"><strong>${label} :</strong> ${value}</p>`
}

// ─── Envoi générique ──────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string | string[]
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    })
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// ─── E1 — Nouveau prospect → Manager ─────────────────────────────────────────

export function buildEmailNouveauProspect(prospect: {
  nom: string; prenom: string; email: string; apporteur_nom?: string; prospect_id?: string
}) {
  return {
    subject: `Nouveau prospect à valider : ${prospect.prenom} ${prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Nouveau prospect soumis</h2>
      ${card(`
        ${row('Nom', `${prospect.prenom} ${prospect.nom}`)}
        ${row('Email', prospect.email)}
        ${prospect.apporteur_nom ? row('Soumis par', prospect.apporteur_nom) : ''}
      `)}
      ${btn('Visualiser le dossier', `${APP_URL}/prospects/${prospect.prospect_id ?? ''}`)}
    `),
  }
}

// ─── E2 — Prospect qualifié → Direction ──────────────────────────────────────

export function buildEmailProspectQualifie(data: {
  prospect: { nom: string; prenom: string; email: string; id: string }
  apporteur_nom: string
  notes: string
}) {
  return {
    subject: `Prospect qualifié — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Prospect qualifié par le manager</h2>
      ${card(`
        ${row('Nom', `${data.prospect.prenom} ${data.prospect.nom}`)}
        ${row('Email', data.prospect.email)}
        ${row('Apporteur', data.apporteur_nom)}
        <p style="margin:8px 0 0;"><strong>Notes du manager :</strong></p>
        <p style="margin:4px 0 0;color:#374151;white-space:pre-wrap;">${data.notes}</p>
      `)}
      ${btn('Visualiser le dossier', `${APP_URL}/validation`)}
    `),
  }
}

// ─── E3 — Prospect approuvé → Apporteur ──────────────────────────────────────

export function buildEmailProspectValide(data: {
  prospect: { nom: string; prenom: string; id: string }
}) {
  return {
    subject: `Votre prospect ${data.prospect.prenom} ${data.prospect.nom} est validé`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Votre prospect a été validé</h2>
      ${card(`
        ${row('Nom', `${data.prospect.prenom} ${data.prospect.nom}`)}
        <p style="margin:8px 0 0;">Vous pouvez maintenant planifier sa visite.</p>
      `)}
      ${btn('Voir le dossier', `${APP_URL}/mes-prospects/${data.prospect.id}`)}
    `),
  }
}

// ─── E4+E5 — Confirmation visite + Voucher → Client / CC: Apporteur + Sécu + Manager

export function buildEmailConfirmationVisite(data: {
  prospect: { nom: string; prenom: string }
  date_visite: string
  apporteur: { nom: string; prenom: string; telephone?: string }
  lien_annulation: string
}) {
  return {
    subject: `Invitation Visite Exclusive — Golden Hour 2026 — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Invitation Visite Exclusive — Golden Hour 2026</h2>
      <p style="font-size:16px;color:#374151;font-weight:500;">${data.prospect.prenom} ${data.prospect.nom} — ${data.date_visite}</p>
      <p>Nous avons le plaisir de vous confirmer votre visite Golden Hour d'Azembay le <strong>${data.date_visite}</strong>, à partir de <strong>17h00 environ</strong>.</p>
      <p>L'horaire exact sera reconfirmé en fonction de l'horaire du coucher de soleil.</p>
      ${card(row('Votre contact', `${data.apporteur.prenom} ${data.apporteur.nom}${data.apporteur.telephone ? ' — ' + data.apporteur.telephone : ''}`))}
      <p>Merci de vous munir de ce voucher ainsi qu'une pièce d'identité à votre arrivée.</p>
      <p>En cas d'annulation, merci de nous prévenir au moins 48h en avance.</p>
      <p><a href="${data.lien_annulation}" style="color:#1A3C6E;font-size:13px;">Annuler ma visite</a></p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:16px;">Document personnel et non cessible.</p>
    `),
  }
}

// ─── E6-CLIENT — Confirmation annulation visite → Client ─────────────────────

export function buildEmailAnnulationVisiteClient(data: {
  prospect: { nom: string; prenom: string }
  date_visite: string
}) {
  return {
    subject: `Annulation de votre visite Azembay — ${data.date_visite}`,
    html: baseLayout(`
      <p>Madame, Monsieur ${data.prospect.prenom} ${data.prospect.nom},</p>
      <p>Votre visite du <strong>${data.date_visite}</strong> a bien été annulée.</p>
      <p>Nous vous contacterons prochainement pour reprogrammer.</p>
    `),
  }
}

// ─── E6-INTERN — Annulation visite → Apporteur + Sécurité + Manager ──────────

export function buildEmailAnnulationVisiteIntern(data: {
  prospect: { nom: string; prenom: string; id: string }
  date_visite: string
}) {
  return {
    subject: `Annulation visite — ${data.prospect.prenom} ${data.prospect.nom} — ${data.date_visite}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Visite annulée</h2>
      <p><strong>${data.prospect.prenom} ${data.prospect.nom}</strong> a annulé sa visite prévue le <strong>${data.date_visite}</strong>.</p>
      <p>Merci de le contacter pour reprogrammer une nouvelle date.</p>
      ${btn('Voir le dossier', `${APP_URL}/prospects/${data.prospect.id}`)}
    `),
  }
}

// ─── E-SEC — Récap sécurité J-1 (CRON 20h) → Sécurité + Manager + Direction ──

export function buildEmailRecapSecurite(data: {
  date: string
  visiteurs: { nom: string; prenom: string; heure: string }[]
}) {
  const liste = data.visiteurs.map((v, i) =>
    `<p style="margin:4px 0;">${i + 1}. <strong>${v.nom} ${v.prenom}</strong> — ${v.heure}</p>`
  ).join('')
  return {
    subject: `Guest list — Visites du ${data.date}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Visiteurs attendus le ${data.date}</h2>
      ${card(liste || '<p style="margin:0;color:#9CA3AF;">Aucun visiteur prévu.</p>')}
      ${btn('Voir la guest list', `${APP_URL}/guest-list`)}
    `),
  }
}

// ─── E7 — Séjour confirmé (voucher) → Client / CC: Apporteur + Sécu + Manager ─

const CONDITIONS_SEJOUR = `
<div style="background:#F3F4F6;border:1px solid #D1D5DB;border-radius:6px;padding:16px;margin-top:20px;font-size:12px;color:#374151;">
  <p style="margin:0 0 8px;font-weight:600;">Conditions de participation — Azembay — Séjour en vente privée</p>
  <p style="margin:0 0 6px;">• Vente privée off-market sur invitation seulement — document non cessible.</p>
  <p style="margin:0 0 6px;">• <strong>Conditions de la gratuité :</strong> Votre séjour test est offert en pension complète. Il ne sera facturé qu'en cas de no-show, d'annulation effectuée à moins de 72h avant la date d'arrivée, ou si l'acquisition n'est pas confirmée dans un délai de 30 jours après votre séjour, au tarif de 1 500 DHS / nuit par adulte et 750 DHS / nuit par enfant de plus de 6 ans.</p>
  <p style="margin:0;">• <strong>Blocage d'une unité :</strong> Le formulaire de réservation et la confirmation de séjour (voucher) n'exigent aucun règlement. Toutefois, pour bloquer une unité temporairement, vous pouvez vous acquitter à tout moment de la somme de 100 000 DHS contre reçu, ce qui permettra de la retirer de l'inventaire pendant un délai de 7 jours. Ce dépôt est entièrement remboursable dans les 7 jours par simple demande par email. Au-delà de ce délai, le dépôt sera automatiquement converti en avance sur réservation.</p>
</div>`

export function buildEmailSejourConfirme(data: {
  prospect: { nom: string; prenom: string }
  sejour: {
    date_arrivee: string
    date_depart: string
    nb_adultes: number
    nb_enfants_plus_6: number
    nb_enfants_moins_6: number
    unite_reference?: string
    unite_type?: string
  }
  lien_annulation: string
}) {
  const { sejour } = data
  const typeLabel =
    sejour.unite_type === 'appart_1ch' ? 'appartement 1 chambre' :
    sejour.unite_type === 'appart_2ch' ? 'appartement 2 chambres' :
    sejour.unite_type === 'villa_e' ? 'villa' : 'unité'

  return {
    subject: `Invitation Séjour Exclusif — The Owners' Club — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Invitation Séjour Exclusif — The Owners' Club — Voucher</h2>
      <p>Nous avons le plaisir de vous confirmer votre séjour test pour votre acquisition à Azembay.</p>
      ${card(`
        ${row('Invité(e)', `${data.prospect.prenom} ${data.prospect.nom}`)}
        ${row('Arrivée', `${sejour.date_arrivee} — à partir de 17h00`)}
        ${row('Départ', sejour.date_depart)}
        ${row('Participants', `${sejour.nb_adultes} adulte(s), ${sejour.nb_enfants_plus_6} enfant(s) >6 ans, ${sejour.nb_enfants_moins_6} enfant(s) ≤6 ans`)}
        ${sejour.unite_reference ? row('Unité assignée', sejour.unite_reference) : ''}
      `)}
      <p>Vous serez hébergé(e) en <strong>${typeLabel}</strong> en pension complète.</p>
      <p>Merci de vous munir de ce voucher ainsi qu'une pièce d'identité à votre arrivée.</p>
      <p>En cas d'annulation, merci de nous prévenir au moins <strong>72h en avance</strong>.</p>
      <p><a href="${data.lien_annulation}" style="color:#1A3C6E;font-size:13px;">Annuler mon séjour</a></p>
      <p style="margin-top:16px;font-weight:500;color:#374151;">Nous sommes ravis de vous recevoir.</p>
      ${CONDITIONS_SEJOUR}
    `),
  }
}

// ─── E8 — No-show → Client / CC: Apporteur + Sécu + Manager ─────────────────

export function buildEmailNoShow(data: {
  prospect: { nom: string; prenom: string }
  date_arrivee: string
  date_depart: string
}) {
  return {
    subject: `Séjour Azembay — Facture — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <p>Madame, Monsieur ${data.prospect.prenom} ${data.prospect.nom},</p>
      <p>Nous avons le regret de constater votre absence lors de votre séjour test à Azembay prévu du <strong>${data.date_arrivee}</strong> au <strong>${data.date_depart}</strong>.</p>
      <p>Conformément aux conditions de participation acceptées, nous vous adressons la facture correspondante en attaché.</p>
      <p>Dans le cas où vous concrétisez votre acquisition dans un délai de 30 jours, un avoir du même montant vous sera accordé lors de la finalisation de votre acquisition.</p>
    `),
  }
}

// ─── E9 — Annulation séjour <72h → Client / CC: Apporteur + Sécu + Manager ───

export function buildEmailAnnulationSejourTardive(data: {
  prospect: { nom: string; prenom: string }
  date_arrivee: string
  date_depart: string
}) {
  return {
    subject: `Séjour Azembay — Annulation tardive — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <p>Madame, Monsieur ${data.prospect.prenom} ${data.prospect.nom},</p>
      <p>Nous avons bien pris note de l'annulation de votre séjour test à Azembay prévu du <strong>${data.date_arrivee}</strong> au <strong>${data.date_depart}</strong>, reçue moins de 72h avant votre arrivée.</p>
      <p>Conformément aux conditions de participation acceptées, nous vous adressons la facture correspondante en attaché.</p>
      <p>Dans le cas où vous concrétisez votre acquisition dans le délai en vigueur de votre formulaire de réservation, un avoir du même montant vous sera accordé.</p>
    `),
  }
}

// ─── E10 — Alerte J+30 acquisition → Manager + Direction ─────────────────────

export function buildEmailAlerteJ30(data: {
  prospect: { nom: string; prenom: string; id: string }
  date_sejour: string
}) {
  return {
    subject: `Suivi acquisition — ${data.prospect.prenom} ${data.prospect.nom} — J+30 séjour`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Suivi acquisition — J+30</h2>
      <p>Le séjour test de <strong>${data.prospect.prenom} ${data.prospect.nom}</strong> s'est tenu le <strong>${data.date_sejour}</strong>.</p>
      <p>L'acquisition n'a pas été confirmée à ce jour.</p>
      <p>Conformément aux conditions de participation, une facture peut être émise.</p>
      <p style="margin-top:20px;">
        ${btn('Émettre la facture', `${APP_URL}/sejours`)}
        &nbsp;&nbsp;
        <a href="${APP_URL}/prospects/${data.prospect.id}" style="display:inline-block;background:#C8973A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir le dossier →</a>
      </p>
    `),
  }
}

// ─── E-INT1 — 3 séjours confirmés → Manager + Direction + Sécurité ───────────

export function buildEmailWeekendComplet(data: {
  weekend: { date_vendredi: string; date_dimanche: string }
  sejours: { nom: string; prenom: string; unite_type?: string }[]
}) {
  const liste = data.sejours.map((s, i) => {
    const type = s.unite_type === 'appart_1ch' ? '1CH' : s.unite_type === 'appart_2ch' ? '2CH' : 'Villa'
    return `<p style="margin:4px 0;">${i + 1}. <strong>${s.nom} ${s.prenom}</strong> — ${type}</p>`
  }).join('')
  return {
    subject: `Action requise — Weekend ${data.weekend.date_vendredi} — 3 séjours confirmés`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Weekend complet — Validation requise</h2>
      <p>Le weekend du <strong>${data.weekend.date_vendredi}</strong> au <strong>${data.weekend.date_dimanche}</strong> a atteint 3 séjours confirmés.</p>
      ${card(liste)}
      ${btn('Valider le weekend', `${APP_URL}/sejours`)}
    `),
  }
}

// ─── E-INT2 — Récap J-72 → Manager + Direction + Sécurité ────────────────────

export function buildEmailRecapJ72(data: {
  weekend: { date_vendredi: string; date_dimanche: string }
  participants: {
    nom: string; prenom: string
    nb_adultes: number; nb_enfants_plus_6: number; nb_enfants_moins_6: number
    unite_reference?: string
  }[]
}) {
  const liste = data.participants.map((p, i) => `
    <div style="border-bottom:1px solid #E5E7EB;padding:8px 0;">
      <p style="margin:0;font-weight:600;">${i + 1}. ${p.nom} ${p.prenom}</p>
      <p style="margin:2px 0;font-size:13px;color:#6B7280;">
        ${p.nb_adultes} adulte(s), ${p.nb_enfants_plus_6} enf.&gt;6ans, ${p.nb_enfants_moins_6} enf.≤6ans
        ${p.unite_reference ? ` — Unité : ${p.unite_reference}` : ''}
      </p>
    </div>
  `).join('')
  return {
    subject: `Récapitulatif participants — Weekend ${data.weekend.date_vendredi} — J-72`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Récapitulatif participants — J-72</h2>
      <p>Weekend du <strong>${data.weekend.date_vendredi}</strong> au <strong>${data.weekend.date_dimanche}</strong></p>
      ${card(liste || '<p style="margin:0;">Aucun participant confirmé.</p>')}
      ${btn('Voir le weekend', `${APP_URL}/sejours`)}
    `),
  }
}

// ─── E-INDISP — Aucune disponibilité → Apporteur ─────────────────────────────

export function buildEmailAucuneDisponibilite(data: {
  prospect: { nom: string; prenom: string; id: string }
  type_lot: string
}) {
  const typeLabel =
    data.type_lot === 'appart_1ch' ? 'appartement 1 chambre' :
    data.type_lot === 'appart_2ch' ? 'appartement 2 chambres' :
    data.type_lot === 'villa_e' ? 'villa' : data.type_lot
  return {
    subject: `Demande de séjour — Aucune disponibilité — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Aucune disponibilité</h2>
      <p>Aucune unité d'hébergement de type <strong>${typeLabel}</strong> n'est disponible sur vos 3 weekends choisis.</p>
      <p>Merci de resoumettre une demande avec de nouvelles dates.</p>
      ${btn('Voir le dossier', `${APP_URL}/mes-prospects/${data.prospect.id}`)}
    `),
  }
}

// ─── E-ALERTE48 — Prospect non qualifié 48h → Manager ────────────────────────

export function buildEmailAlerteQualification(data: {
  prospect: { nom: string; prenom: string; id: string }
  apporteur_nom: string
  soumis_le: string
}) {
  return {
    subject: `Relance qualification — ${data.prospect.prenom} ${data.prospect.nom} — en attente depuis 48h`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Prospect en attente de qualification</h2>
      ${card(`
        ${row('Prospect', `${data.prospect.prenom} ${data.prospect.nom}`)}
        ${row('Soumis par', data.apporteur_nom)}
        ${row('Soumis le', data.soumis_le)}
      `)}
      ${btn('Qualifier le dossier', `${APP_URL}/prospects/${data.prospect.id}`)}
    `),
  }
}

// ─── E-J7 — Prospect validé sans visite 7j → Manager + Apporteur ─────────────

export function buildEmailAlerteVisite(data: {
  prospect: { nom: string; prenom: string; id: string }
  valide_le: string
}) {
  return {
    subject: `Relance visite — ${data.prospect.prenom} ${data.prospect.nom} — aucune visite programmée`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Prospect validé sans visite planifiée</h2>
      ${card(`
        ${row('Prospect', `${data.prospect.prenom} ${data.prospect.nom}`)}
        ${row('Validé le', data.valide_le)}
        <p style="margin:8px 0 0;color:#DC2626;">Aucune visite planifiée depuis 7 jours.</p>
      `)}
      ${btn('Planifier une visite', `${APP_URL}/mes-prospects/${data.prospect.id}`)}
    `),
  }
}

// ─── Formulaire signé (usage interne) ────────────────────────────────────────

export function buildEmailFormulaireSigne(data: {
  prospect: { nom: string; prenom: string }
  lot_reference: string
  type: string
}) {
  return {
    subject: `Formulaire signé — ${data.prospect.prenom} ${data.prospect.nom} — Lot ${data.lot_reference}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Formulaire de réservation signé</h2>
      ${card(`
        ${row('Prospect', `${data.prospect.prenom} ${data.prospect.nom}`)}
        ${row('Lot', data.lot_reference)}
        ${row('Type', data.type === 'avec_acompte' ? 'Avec acompte' : 'Sans acompte')}
      `)}
      ${btn('Voir le dossier', `${APP_URL}/prospects`)}
    `),
  }
}
