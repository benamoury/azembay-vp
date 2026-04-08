import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

// CRON: quotidien 18h — J+2 soir, dernier rappel + copie direction
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const j2Start = new Date(now); j2Start.setDate(j2Start.getDate() - 2); j2Start.setHours(0,0,0,0)
  const j2End = new Date(now); j2End.setDate(j2End.getDate() - 2); j2End.setHours(23,59,59,999)

  const { data: sejours } = await admin
    .from('sejours')
    .select('prospect_id, prospect:prospects!inner(id, nom, prenom, statut, apporteur_id, post_sejour_rappel_j2_midi_at, post_sejour_rappel_j2_soir_at, apporteur:profiles!apporteur_id(email, prenom, nom))')
    .eq('statut', 'realise')
    .gte('updated_at', j2Start.toISOString())
    .lte('updated_at', j2End.toISOString())

  if (!sejours?.length) return NextResponse.json({ sent: 0 })

  const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')
  const { data: directions } = await admin.from('profiles').select('email').eq('role', 'direction')

  let sent = 0
  for (const s of sejours) {
    const p = s.prospect as any
    if (!p || p.post_sejour_rappel_j2_soir_at) continue

    const { count } = await admin
      .from('client_notes')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', p.id)
      .gte('created_at', j2Start.toISOString())

    if ((count ?? 0) > 0) continue

    const ap = p.apporteur as unknown as { email: string; prenom: string; nom: string } | null
    if (!ap?.email) continue

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#dc2626;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">🚨 ALERTE AZEMBAY</h1></div>
        <div style="padding:32px;background:#FEF2F2;">
          <h2 style="color:#dc2626;">DERNIER RAPPEL — Fiche ${p.prenom} ${p.nom}</h2>
          <p>La fiche de ce prospect n'a pas été mise à jour depuis son séjour il y a 2 jours. La Direction a été notifiée.</p>
          <a href="https://azembay.vercel.app/mes-prospects/${p.id}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:20px;">Mettre à jour MAINTENANT →</a>
        </div>
      </div>`

    const recipients = [
      ap.email,
      ...(managers?.map(m => m.email) ?? []),
      ...(directions?.map(d => d.email) ?? []),
    ]
    for (const email of Array.from(new Set(recipients))) {
      await sendEmail({ to: email, subject: `🚨 DERNIER RAPPEL — Fiche ${p.prenom} ${p.nom} non mise à jour`, html })
    }

    await admin.from('prospects').update({ post_sejour_rappel_j2_soir_at: now.toISOString() }).eq('id', p.id)
    sent++
  }

  return NextResponse.json({ sent })
}
