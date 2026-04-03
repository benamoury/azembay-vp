import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailAlerteJ30 } from '@/lib/email/resend'

// CRON: quotidien 8h — Séjours réalisés depuis 30 jours sans acquisition
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // J+30 exact (tolérance ±1 jour)
  const j30start = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
  const j30end = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sejours } = await admin
    .from('sejours')
    .select('date_arrivee, prospect_id, prospect:prospects(nom,prenom,statut)')
    .eq('statut', 'realise')
    .gte('date_arrivee', j30start.split('T')[0])
    .lte('date_arrivee', j30end.split('T')[0])

  if (!sejours?.length) return NextResponse.json({ sent: 0 })

  // Filtrer les prospects qui ne sont pas encore vendus
  const toNotify = sejours.filter(s => {
    const p = s.prospect as { statut: string } | null
    return p && p.statut !== 'vendu'
  })

  const { data: recipients } = await admin
    .from('profiles')
    .select('email')
    .in('role', ['direction', 'manager'])

  let sent = 0
  for (const s of toNotify) {
    const p = s.prospect as { nom: string; prenom: string } | null
    if (!p) continue

    const emailData = buildEmailAlerteJ30({
      prospect: { nom: p.nom, prenom: p.prenom, id: s.prospect_id },
      date_sejour: s.date_arrivee,
    })

    for (const r of recipients ?? []) {
      await sendEmail({ to: r.email, ...emailData })
      sent++
    }
  }

  return NextResponse.json({ sent, prospects: toNotify.length })
}
