import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

// CRON: quotidien 20h — J+1 après séjour, rappel apporteur si aucune note
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const j1Start = new Date(now); j1Start.setDate(j1Start.getDate() - 1); j1Start.setHours(0,0,0,0)
  const j1End = new Date(now); j1End.setDate(j1End.getDate() - 1); j1End.setHours(23,59,59,999)

  // Prospects dont le séjour a été réalisé il y a ~1 jour
  const { data: sejours } = await admin
    .from('sejours')
    .select('prospect_id, prospect:prospects!inner(id, nom, prenom, statut, apporteur_id, post_sejour_rappel_j1_at, apporteur:profiles!apporteur_id(email, prenom, nom))')
    .eq('statut', 'realise')
    .gte('updated_at', j1Start.toISOString())
    .lte('updated_at', j1End.toISOString())

  if (!sejours?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const s of sejours) {
    const p = s.prospect as any
    if (!p || p.post_sejour_rappel_j1_at) continue

    // Vérifier si une note a été ajoutée depuis le séjour
    const { count } = await admin
      .from('client_notes')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', p.id)
      .gte('created_at', j1Start.toISOString())

    if ((count ?? 0) > 0) continue // Note existe, pas de rappel

    const ap = p.apporteur as unknown as { email: string; prenom: string; nom: string } | null
    if (!ap?.email) continue

    await sendEmail({
      to: ap.email,
      subject: `📋 Rappel — Mise à jour fiche ${p.prenom} ${p.nom} requise`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1A3C6E;padding:24px;text-align:center;"><h1 style="color:#C8973A;margin:0;">AZEMBAY</h1></div>
          <div style="padding:32px;background:#F8FAFC;">
            <h2 style="color:#1A3C6E;">Bonjour ${ap.prenom},</h2>
            <p>Le prospect <strong>${p.prenom} ${p.nom}</strong> a réalisé son séjour test hier. Merci de mettre à jour sa fiche avec vos observations et d'indiquer ses intentions d'achat.</p>
            <a href="https://azembay.vercel.app/mes-prospects/${p.id}" style="display:inline-block;background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:20px;">Mettre à jour la fiche →</a>
          </div>
        </div>`,
    })

    await admin.from('prospects').update({ post_sejour_rappel_j1_at: now.toISOString() }).eq('id', p.id)
    sent++
  }

  return NextResponse.json({ sent })
}
