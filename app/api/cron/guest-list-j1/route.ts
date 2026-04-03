import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailRecapSecurite } from '@/lib/email/resend'

// CRON: quotidien 20h — Récap guest list J-1 → Sécurité + Managers
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Demain
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateVisite = tomorrow.toISOString().split('T')[0]

  const { data: visites } = await admin
    .from('visites')
    .select('heure_visite, prospect:prospects(nom,prenom)')
    .eq('date_visite', dateVisite)
    .neq('statut', 'annulee')
    .order('heure_visite')

  const visiteurs = (visites ?? []).map(v => {
    const p = v.prospect as unknown as { nom: string; prenom: string } | null
    return {
      nom: p?.nom ?? '',
      prenom: p?.prenom ?? '',
      heure: v.heure_visite ?? '',
    }
  })

  const emailData = buildEmailRecapSecurite({
    date: dateVisite,
    visiteurs,
  })

  const { data: recipients } = await admin
    .from('profiles')
    .select('email')
    .in('role', ['securite', 'manager', 'direction'])

  let sent = 0
  for (const r of recipients ?? []) {
    await sendEmail({ to: r.email, ...emailData })
    sent++
  }

  return NextResponse.json({ sent, guests: visiteurs.length, date: dateVisite })
}
