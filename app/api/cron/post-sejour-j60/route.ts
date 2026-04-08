import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

// CRON: quotidien 8h — J+60 après séjour, closing forcé si orange sans formulaire
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const j60 = new Date(now); j60.setDate(j60.getDate() - 60)

  // Prospects en orange depuis + de 60 jours
  const { data: prospects } = await admin
    .from('prospects')
    .select('id, nom, prenom, statut, orange_since, post_sejour_j60_processed, apporteur_id, apporteur:profiles!apporteur_id(email, prenom, nom)')
    .eq('statut', 'orange')
    .eq('post_sejour_j60_processed', false)
    .lte('orange_since', j60.toISOString())

  if (!prospects?.length) return NextResponse.json({ closed: 0 })

  let closed = 0
  for (const p of prospects) {
    // Vérifier une dernière fois si formulaire signé
    const { count } = await admin
      .from('formulaires')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', p.id)
      .in('statut', ['signe', 'converti'])

    if ((count ?? 0) > 0) {
      await admin.from('prospects').update({ post_sejour_j60_processed: true }).eq('id', p.id)
      continue
    }

    // Closing forcé
    await admin.from('prospects').update({
      statut: 'non_concluant',
      post_sejour_j60_processed: true,
    }).eq('id', p.id)

    // Notifier direction + managers
    const { data: notifs } = await admin.from('profiles').select('email').in('role', ['direction', 'manager'])
    const ap = (p.apporteur as unknown as { email: string; prenom: string; nom: string } | null)

    for (const n of notifs ?? []) {
      await sendEmail({
        to: n.email,
        subject: `❌ Closing automatique — ${p.prenom} ${p.nom}`,
        html: `<p>Le prospect <strong>${p.prenom} ${p.nom}</strong> a été automatiquement closé après 60 jours sans formulaire signé.</p>`,
      })
    }
    closed++
  }

  return NextResponse.json({ closed })
}
