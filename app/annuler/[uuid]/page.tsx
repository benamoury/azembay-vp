import { createAdminClient } from '@/lib/supabase/server'
import { AnnulationClient } from './annulation-client'

export const dynamic = 'force-dynamic'

export default async function AnnulationPage({ params }: { params: { uuid: string } }) {
  const admin = createAdminClient()
  const token = params.uuid

  // Vérifier le token
  const { data: tokenRow } = await admin
    .from('annulation_tokens')
    .select('id, type, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return <AnnulationStatus status="invalide" />
  }

  if (tokenRow.used_at) {
    return <AnnulationStatus status="deja_utilise" />
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return <AnnulationStatus status="expire" />
  }

  // Récupérer les infos selon le type
  let info: { type: 'visite' | 'sejour'; date: string; heure?: string } | null = null

  if (tokenRow.type === 'visite') {
    const { data: visite } = await admin
      .from('visites')
      .select('date_visite, heure_visite')
      .eq('annulation_token', token)
      .neq('statut', 'annulee')
      .single()

    if (!visite) return <AnnulationStatus status="invalide" />
    info = { type: 'visite', date: visite.date_visite, heure: visite.heure_visite }
  } else if (tokenRow.type === 'sejour') {
    const { data: sejour } = await admin
      .from('sejours')
      .select('date_arrivee, date_depart')
      .eq('annulation_token_id', tokenRow.id)
      .in('statut', ['demande', 'confirme'])
      .single()

    if (!sejour) return <AnnulationStatus status="invalide" />

    const isLate = (new Date(sejour.date_arrivee).getTime() - Date.now()) < 72 * 60 * 60 * 1000
    info = { type: 'sejour', date: sejour.date_arrivee }

    return (
      <AnnulationClient
        token={token}
        type="sejour"
        date={sejour.date_arrivee}
        dateFin={sejour.date_depart}
        isLate={isLate}
      />
    )
  }

  if (!info) return <AnnulationStatus status="invalide" />

  return (
    <AnnulationClient
      token={token}
      type={info.type}
      date={info.date}
      heure={info.heure}
      isLate={false}
    />
  )
}

function AnnulationStatus({ status }: { status: 'invalide' | 'deja_utilise' | 'expire' }) {
  const messages = {
    invalide: { titre: 'Lien invalide', texte: 'Ce lien d\'annulation n\'existe pas. Vérifiez le lien dans votre email.' },
    deja_utilise: { titre: 'Déjà utilisé', texte: 'Ce lien a déjà été utilisé. Votre annulation a bien été prise en compte.' },
    expire: { titre: 'Lien expiré', texte: 'Ce lien a expiré. Contactez votre conseiller Azembay.' },
  }
  const { titre, texte } = messages[status]
  return (
    <div className="min-h-screen bg-[#1A3C6E] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <div className="text-2xl font-bold text-[#1A3C6E] mb-2">{titre}</div>
        <p className="text-gray-600">{texte}</p>
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">AZEMBAY — RIPT 1 — Vente Privée</p>
        </div>
      </div>
    </div>
  )
}
