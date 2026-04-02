import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Azembay <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://azembay-vp.vercel.app'

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
    const { data, error } = await resend.emails.send({
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

export function buildEmailNouveauProspect(prospect: {
  nom: string; prenom: string; budget_estime?: number; email: string
}) {
  const isHighValue = (prospect.budget_estime ?? 0) >= 5_000_000
  return {
    subject: isHighValue
      ? `🔴 Prospect haute valeur à valider : ${prospect.prenom} ${prospect.nom}`
      : `Nouveau prospect à valider : ${prospect.prenom} ${prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Nouveau prospect soumis</h2>
      ${isHighValue ? '<div style="background:#FEF3C7;border:1px solid #F59E0B;padding:12px 16px;border-radius:6px;margin-bottom:16px;"><strong style="color:#92400E;">⚠️ Budget ≥ 5M MAD — Validation Directeur requise</strong></div>' : ''}
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;margin-bottom:20px;">
        <p style="margin:0 0 8px;"><strong>Nom :</strong> ${prospect.prenom} ${prospect.nom}</p>
        <p style="margin:0 0 8px;"><strong>Email :</strong> ${prospect.email}</p>
        ${prospect.budget_estime ? `<p style="margin:0;"><strong>Budget estimé :</strong> ${new Intl.NumberFormat('fr-MA').format(prospect.budget_estime)} MAD</p>` : ''}
      </div>
      <a href="${APP_URL}/validation" style="display:inline-block;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Valider le prospect →</a>
    `),
  }
}

export function buildEmailProspectValide(prospect: { nom: string; prenom: string }) {
  return {
    subject: `✅ Votre prospect ${prospect.prenom} ${prospect.nom} est validé`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Prospect validé</h2>
      <p>Votre prospect <strong>${prospect.prenom} ${prospect.nom}</strong> a été validé par le manager.</p>
      <p>Vous pouvez maintenant planifier sa visite et émettre un voucher.</p>
      <a href="${APP_URL}/mes-prospects" style="display:inline-block;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir mes prospects →</a>
    `),
  }
}

export function buildEmailVoucherEmis(data: {
  prospect: { nom: string; prenom: string }
  voucher: { numero_voucher?: string; date_visite: string; heure_visite: string }
  apporteur: { nom: string; prenom: string }
}) {
  return {
    subject: `Voucher émis — ${data.prospect.prenom} ${data.prospect.nom} — ${data.voucher.date_visite}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Voucher de visite émis</h2>
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;margin-bottom:20px;">
        <p style="margin:0 0 8px;"><strong>Numéro :</strong> ${data.voucher.numero_voucher ?? 'En cours'}</p>
        <p style="margin:0 0 8px;"><strong>Prospect :</strong> ${data.prospect.prenom} ${data.prospect.nom}</p>
        <p style="margin:0 0 8px;"><strong>Date :</strong> ${data.voucher.date_visite}</p>
        <p style="margin:0 0 8px;"><strong>Heure :</strong> ${data.voucher.heure_visite}</p>
        <p style="margin:0;"><strong>Apporteur :</strong> ${data.apporteur.prenom} ${data.apporteur.nom}</p>
      </div>
      <p style="color:#666;font-size:13px;">Le voucher PDF nominatif est joint à cet email. Présentez-le à l'entrée du site.</p>
    `),
  }
}

export function buildEmailSejourConfirme(data: {
  prospect: { nom: string; prenom: string }
  sejour: { date_arrivee: string; date_depart: string; nb_adultes: number; nb_enfants: number; lot_reference?: string }
}) {
  return {
    subject: `Invitation Séjour Exclusif — The Owners' Club — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Invitation Séjour Exclusif — The Owners' Club</h2>
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;margin-bottom:20px;">
        <p style="margin:0 0 8px;"><strong>Invité(e) :</strong> ${data.prospect.prenom} ${data.prospect.nom}</p>
        <p style="margin:0 0 8px;"><strong>Arrivée :</strong> ${data.sejour.date_arrivee}</p>
        <p style="margin:0 0 8px;"><strong>Départ :</strong> ${data.sejour.date_depart}</p>
        <p style="margin:0 0 8px;"><strong>Participants :</strong> ${data.sejour.nb_adultes} adulte(s)${data.sejour.nb_enfants > 0 ? `, ${data.sejour.nb_enfants} enfant(s)` : ''}</p>
        ${data.sejour.lot_reference ? `<p style="margin:0;"><strong>Unité assignée :</strong> ${data.sejour.lot_reference}</p>` : ''}
      </div>
      <p style="color:#666;font-size:13px;">Merci de vous munir d'une pièce d'identité à la réception afin de confirmer votre séjour.</p>
    `),
  }
}

export function buildEmailNoShow(data: {
  prospect: { nom: string; prenom: string }
  facture: { numero: string; montant_ttc: number; date_emission: string }
}) {
  return {
    subject: `Facture no-show — ${data.prospect.prenom} ${data.prospect.nom}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Facture de séjour non honoré</h2>
      <p>Cher(e) ${data.prospect.prenom} ${data.prospect.nom},</p>
      <p>Suite à votre absence lors du séjour test prévu, nous vous adressons la facture correspondante.</p>
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;margin-bottom:20px;">
        <p style="margin:0 0 8px;"><strong>N° Facture :</strong> ${data.facture.numero}</p>
        <p style="margin:0 0 8px;"><strong>Date :</strong> ${data.facture.date_emission}</p>
        <p style="margin:0;"><strong>Montant TTC :</strong> ${new Intl.NumberFormat('fr-MA').format(data.facture.montant_ttc)} MAD</p>
      </div>
      <p style="color:#666;font-size:13px;">La facture est jointe en pièce jointe. Si vous procédez à l'acquisition d'une unité Azembay, un avoir vous sera accordé.</p>
    `),
  }
}

export function buildEmailAlerte(data: {
  prospect: { nom: string; prenom: string }
  joursRestants: number
  lot_reference: string
}) {
  const urgent = data.joursRestants <= 7
  return {
    subject: `${urgent ? '⚠️ URGENT — ' : ''}Alerte recouvrement — ${data.prospect.prenom} ${data.prospect.nom} — J${30 - data.joursRestants}+`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">${urgent ? '⚠️ ' : ''}Alerte recouvrement no-show</h2>
      ${urgent ? '<div style="background:#FEF3C7;border:1px solid #F59E0B;padding:12px 16px;border-radius:6px;margin-bottom:16px;"><strong style="color:#92400E;">⚠️ URGENT — Le lot sera libéré automatiquement dans ${data.joursRestants} jour(s)</strong></div>' : ''}
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;">
        <p style="margin:0 0 8px;"><strong>Prospect :</strong> ${data.prospect.prenom} ${data.prospect.nom}</p>
        <p style="margin:0 0 8px;"><strong>Lot :</strong> ${data.lot_reference}</p>
        <p style="margin:0;"><strong>Jours avant libération automatique :</strong> ${data.joursRestants}</p>
      </div>
      <a href="${APP_URL}/sejours" style="display:inline-block;margin-top:20px;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Gérer les séjours →</a>
    `),
  }
}

export function buildEmailFormulaireSign(data: {
  prospect: { nom: string; prenom: string }
  lot: { reference: string }
  type: string
}) {
  return {
    subject: `📝 Formulaire signé — ${data.prospect.prenom} ${data.prospect.nom} — Lot ${data.lot.reference}`,
    html: baseLayout(`
      <h2 style="color:#1A3C6E;margin-top:0;">Formulaire de réservation signé</h2>
      <div style="background:#fff;padding:20px;border-radius:8px;border-left:4px solid #C8973A;">
        <p style="margin:0 0 8px;"><strong>Prospect :</strong> ${data.prospect.prenom} ${data.prospect.nom}</p>
        <p style="margin:0 0 8px;"><strong>Lot :</strong> ${data.lot.reference}</p>
        <p style="margin:0;"><strong>Type :</strong> ${data.type === 'avec_acompte' ? 'Avec acompte' : 'Sans acompte'}</p>
      </div>
      <a href="${APP_URL}/prospects" style="display:inline-block;margin-top:20px;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir le dossier →</a>
    `),
  }
}
