'use server'

import Groq from 'groq-sdk'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function sendMessageToYouss(message: string, prospectId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // Récupérer le contexte si un prospect est spécifié
  let contextProspect = ''
  if (prospectId) {
    const [{ data: prospect }, { data: notes }, { data: sejours }, { data: visites }] = await Promise.all([
      admin.from('prospects').select('*, apporteur:profiles!apporteur_id(prenom,nom,email), lot_cible:lots(reference,type,prix_individuel)').eq('id', prospectId).single(),
      admin.from('client_notes').select('*, auteur:profiles!auteur_id(prenom,nom)').eq('prospect_id', prospectId).order('created_at', { ascending: false }).limit(10),
      admin.from('sejours').select('*').eq('prospect_id', prospectId).order('created_at', { ascending: false }),
      admin.from('visites').select('*').eq('prospect_id', prospectId).order('created_at', { ascending: false }),
    ])

    if (prospect) {
      contextProspect = `
## Fiche client actuelle

**Prospect:** ${prospect.prenom} ${prospect.nom}
**Email:** ${prospect.email}
**Téléphone:** ${prospect.telephone || 'Non renseigné'}
**Ville:** ${prospect.ville || 'Non renseigné'}
**Statut CRM:** ${prospect.statut}
**Température:** ${prospect.temperature || 'Non évaluée'}/5
**Profil:** ${prospect.profil || 'Non renseigné'}
**Budget estimé:** ${prospect.budget_estime ? prospect.budget_estime.toLocaleString('fr-MA') + ' MAD' : 'Non renseigné'}
**Lot ciblé:** ${prospect.lot_cible ? `${(prospect.lot_cible as {reference:string}).reference}` : 'Non défini'}
**Apporteur:** ${prospect.apporteur ? `${(prospect.apporteur as {prenom:string;nom:string}).prenom} ${(prospect.apporteur as {prenom:string;nom:string}).nom}` : 'Non assigné'}
**Notes Prospect:** ${prospect.notes || 'Aucune'}
**Référence personnelle:** ${prospect.reference_personnelle || 'Non renseignée'}
**Valeur ajoutée:** ${prospect.valeur_ajoutee || 'Non renseignée'}

**Historique notes (${notes?.length || 0}) :**
${notes?.map(n => `- [${(n.auteur as {prenom:string;nom:string}|undefined)?.prenom || '?'}] ${n.created_at.slice(0,10)}: ${n.contenu}`).join('\n') || 'Aucune note'}

**Séjours (${sejours?.length || 0}) :**
${sejours?.map(s => `- ${s.date_arrivee} → ${s.date_depart} | Statut: ${s.statut}`).join('\n') || 'Aucun séjour'}

**Visites (${visites?.length || 0}) :**
${visites?.map(v => `- ${v.date_visite} | Statut: ${v.statut}`).join('\n') || 'Aucune visite'}
`
    }
  }

  const systemPrompt = `Tu es Youss, l'assistant commercial intelligent d'Azembay RIPT 1 — un projet immobilier de luxe off-market à Sidi Bou Naim, Maroc.

## Ton rôle
Tu animes l'effort commercial interne : tu aides les apporteurs, managers et la direction à avancer leurs prospects vers la vente.
Tu ne contactes JAMAIS directement les prospects.

## Le projet Azembay RIPT 1
- Vente privée off-market de 16 lots de luxe (4 App. 1CH, 5 App. 2CH, 7 Villas Parc type E)
- Programme "Golden Hour 2026" : visites exclusives avril-juin 2026
- Séjours test "The Owners' Club" : week-ends immersifs de 2 nuits sur place
- Prix : 1,28M-1,35M MAD (App 1CH), 2,08M-2,20M MAD (App 2CH), 4,15M-4,65M MAD (Villa E)

## Processus commercial
1. Apporteur soumet le prospect → Manager valide
2. Visite Golden Hour planifiée (max 3/jour)
3. Dossier post-visite envoyé
4. Formulaire signé + 100 KDHS (lot retenu 30 jours)
5. Séjour test The Owners' Club (week-end 2 nuits)
6. Acte notarié

## Règles métier clés
- Rétractation: 7 jours ouvrables après signature
- Quota: 6 séjours max par apporteur jusqu'à fin juin 2026
- Séjour confirmé seulement si minimum 3 familles confirment ce week-end
- No-show = facture émise, avoir si achat ultérieur
- Lot libéré automatiquement 30 jours après no-show non recouvré

## Ton style
- Direct, confidentiel, professionnel
- Orienté action : tu proposes toujours une prochaine étape concrète
- Tu analyses les données et tu poses des questions pertinentes pour compléter la fiche client
- Tu réponds en français ou en anglais selon la langue utilisée
- Pas de formules creuses — des conseils actionnables

${contextProspect ? `## Contexte du prospect en cours\n${contextProspect}` : ''}

Si tu n'as pas assez d'informations sur un prospect, demande des précisions spécifiques.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
    })

    const text = completion.choices[0]?.message?.content || ''
    return { success: true, response: text }
  } catch (error) {
    console.error('Youss error:', error)
    return { success: false, error: 'Erreur de connexion à Youss' }
  }
}
