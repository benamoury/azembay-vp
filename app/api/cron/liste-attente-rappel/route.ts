import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

// CRON: chaque matin 8h — rappel quand le délai liste d'attente est atteint
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: prospects } = await admin
    .from('prospects')
    .select('id, nom, prenom, liste_attente_delai, liste_attente_notes, apporteur_id, apporteur:profiles!apporteur_id(email, prenom, nom)')
    .eq('statut', 'liste_attente')
    .lte('liste_attente_delai', today)

  if (!prospects?.length) return NextResponse.json({ sent: 0 })

  const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')

  let sent = 0
  for (const p of prospects) {
    const apporteur = p.apporteur as any
    if (!apporteur?.email) continue

    const recipients = [apporteur.email, ...(managers?.map((m: any) => m.email) ?? [])]
    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: `📅 Relance liste d'attente — ${p.prenom} ${p.nom}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#1A3C6E;padding:24px;text-align:center;"><h1 style="color:#C8973A;margin:0;">AZEMBAY</h1></div>
            <div style="padding:32px;background:#F0FDF4;">
              <h2 style="color:#16a34a;">📅 Délai de relance atteint</h2>
              <p><strong>${p.prenom} ${p.nom}</strong> était en liste d'attente — délai prévu aujourd'hui.</p>
              ${p.liste_attente_notes ? `<p><em>Notes : ${p.liste_attente_notes}</em></p>` : ''}
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/prospects"
                 style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:16px;">
                Voir le prospect →
              </a>
            </div>
          </div>
        `,
      })
      sent++
    }
  }
  return NextResponse.json({ sent })
}
