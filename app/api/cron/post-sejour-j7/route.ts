import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

// CRON: quotidien 8h — J+7 après séjour, passage en orange si pas de formulaire
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const j7 = new Date(now); j7.setDate(j7.getDate() - 7)

  // Séjours réalisés il y a 7+ jours
  const { data: sejours } = await admin
    .from('sejours')
    .select('prospect_id, updated_at, prospect:prospects!inner(id, nom, prenom, statut, apporteur_id, post_sejour_j7_processed, apporteur:profiles!apporteur_id(email, prenom, nom))')
    .eq('statut', 'realise')
    .lte('updated_at', j7.toISOString())

  if (!sejours?.length) return NextResponse.json({ processed: 0 })

  let processed = 0
  for (const s of sejours) {
    const p = s.prospect as any
    if (!p || p.post_sejour_j7_processed) continue
    if (!['sejour_realise', 'dossier_envoye'].includes(p.statut)) continue

    // Vérifier si un formulaire existe
    const { count } = await admin
      .from('formulaires')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_id', p.id)
      .in('statut', ['signe', 'converti'])

    if ((count ?? 0) > 0) {
      // Formulaire signé, marquer comme traité
      await admin.from('prospects').update({ post_sejour_j7_processed: true }).eq('id', p.id)
      continue
    }

    // Passer en orange
    await admin.from('prospects').update({
      statut: 'orange',
      orange_since: now.toISOString(),
      post_sejour_j7_processed: true,
    }).eq('id', p.id)

    // Notifier apporteur
    const ap = p.apporteur as unknown as { email: string; prenom: string; nom: string } | null
    if (ap?.email) {
      await sendEmail({
        to: ap.email,
        subject: `🟠 Action requise — ${p.prenom} ${p.nom} en liste orange`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#ea580c;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">AZEMBAY</h1></div>
            <div style="padding:32px;background:#FFF7ED;">
              <h2 style="color:#ea580c;">🟠 Prospect en attente de décision</h2>
              <p><strong>${p.prenom} ${p.nom}</strong> n'a pas signé de formulaire dans les 7 jours suivant son séjour. Il est maintenant en statut "Orange".</p>
              <p>Vous devez qualifier sa situation :</p>
              <ul>
                <li>✅ Prêt à signer → Réactivation formulaire</li>
                <li>⏳ Intéressé mais plus tard → Liste d'attente</li>
                <li>❌ Pas intéressé → Closing</li>
              </ul>
              <a href="https://azembay.vercel.app/mes-prospects/${p.id}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:20px;">Qualifier maintenant →</a>
            </div>
          </div>`,
      })
    }
    processed++
  }

  return NextResponse.json({ processed })
}
