import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildEmailAlerteQualification } from '@/lib/email/resend'

// CRON: toutes les heures — Prospects soumis non qualifiés depuis >48h
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: prospects } = await admin
    .from('prospects')
    .select('id, nom, prenom, created_at, apporteur:profiles!apporteur_id(nom,prenom)')
    .eq('statut', 'soumis')
    .lt('created_at', cutoff)

  if (!prospects?.length) return NextResponse.json({ sent: 0 })

  const { data: managers } = await admin.from('profiles').select('email').eq('role', 'manager')

  let sent = 0
  for (const p of prospects) {
    const ap = p.apporteur as unknown as { nom: string; prenom: string } | null
    const apporteur_nom = ap ? `${ap.prenom} ${ap.nom}` : 'Apporteur'
    const emailData = buildEmailAlerteQualification({
      prospect: { nom: p.nom, prenom: p.prenom, id: p.id },
      apporteur_nom,
      soumis_le: new Date(p.created_at).toLocaleDateString('fr-FR'),
    })
    for (const m of managers ?? []) {
      await sendEmail({ to: m.email, ...emailData })
      sent++
    }
  }

  return NextResponse.json({ sent, prospects: prospects.length })
}
