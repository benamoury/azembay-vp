import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailRecapJ72 } from '@/lib/email/resend'

// CRON: quotidien 8h — Récap participants J-72 (3 jours avant le weekend = vendredi)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Weekend dont le vendredi est dans 3 jours (72h)
  const in3days = new Date()
  in3days.setDate(in3days.getDate() + 3)
  const targetDate = in3days.toISOString().split('T')[0]

  const { data: weekend } = await admin
    .from('weekends_actives')
    .select('*')
    .eq('date_vendredi', targetDate)
    .single()

  if (!weekend) return NextResponse.json({ sent: 0, reason: 'no_weekend' })

  // Séjours confirmés pour ce weekend
  const { data: sejours } = await admin
    .from('sejours')
    .select('nb_adultes, nb_enfants_plus_6, nb_enfants_moins_6, stock_hebergement_id, stock_hebergement:stock_hebergement(reference), prospect:prospects(nom,prenom)')
    .eq('weekend_id', weekend.id)
    .eq('statut', 'confirme')

  const participants = (sejours ?? []).map(s => {
    const p = s.prospect as { nom: string; prenom: string } | null
    const uh = s.stock_hebergement as { reference: string } | null
    return {
      nom: p?.nom ?? '',
      prenom: p?.prenom ?? '',
      nb_adultes: s.nb_adultes ?? 0,
      nb_enfants_plus_6: s.nb_enfants_plus_6 ?? 0,
      nb_enfants_moins_6: s.nb_enfants_moins_6 ?? 0,
      unite_reference: uh?.reference,
    }
  })

  const emailData = buildEmailRecapJ72({
    weekend: {
      date_vendredi: weekend.date_vendredi,
      date_dimanche: weekend.date_dimanche ?? weekend.date_samedi,
    },
    participants,
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

  return NextResponse.json({ sent, participants: participants.length })
}
