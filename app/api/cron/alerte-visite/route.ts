import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailAlerteVisite } from '@/lib/email/resend'

// CRON: quotidien 8h — Prospects validés sans visite depuis >7j
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff7j = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Prospects validés sans visite active depuis >7j
  const { data: prospects } = await admin
    .from('prospects')
    .select('id, nom, prenom, updated_at, apporteur_id, apporteur:profiles!apporteur_id(email,nom,prenom)')
    .eq('statut', 'valide')
    .lt('updated_at', cutoff7j)

  if (!prospects?.length) return NextResponse.json({ sent: 0 })

  // Filtrer ceux qui n'ont pas de visite active
  const prospectIds = prospects.map(p => p.id)
  const { data: visitesActives } = await admin
    .from('visites')
    .select('prospect_id')
    .in('prospect_id', prospectIds)
    .neq('statut', 'annulee')

  const idsAvecVisite = new Set(visitesActives?.map(v => v.prospect_id) ?? [])
  const sansVisite = prospects.filter(p => !idsAvecVisite.has(p.id))

  const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')

  let sent = 0
  for (const p of sansVisite) {
    const emailData = buildEmailAlerteVisite({
      prospect: { nom: p.nom, prenom: p.prenom, id: p.id },
      valide_le: new Date(p.updated_at).toLocaleDateString('fr-FR'),
    })

    const recipients: string[] = [...(managers?.map(m => m.email) ?? [])]
    const ap = p.apporteur as unknown as { email: string } | null
    if (ap?.email) recipients.push(ap.email)

    for (const email of recipients) {
      await sendEmail({ to: email, ...emailData })
      sent++
    }
  }

  return NextResponse.json({ sent, prospects: sansVisite.length })
}
