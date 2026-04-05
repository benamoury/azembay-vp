'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  formatCurrency, LOT_TYPE_LABELS, LOT_STATUT_COLORS, LOT_STATUT_LABELS,
  WEEKEND_STATUT_COLORS, WEEKEND_STATUT_LABELS,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrendingUp, Home, Users, Hotel, DollarSign, Calendar } from 'lucide-react'

interface StatsClientProps {
  lots: { id: string; reference: string; type: string; statut: string; prix_individuel: number }[]
  prospects: { id: string; statut: string; apporteur_id: string; apporteur?: unknown }[]
  ventes: { id: string; statut: string; apporteur_id: string; prix_notarie: number; commission_apporteur?: number }[]
  apporteurs: { id: string; nom: string; prenom: string }[]
  sejours: { id: string; statut: string; prospect?: { apporteur_id: string } | null }[]
  factures: { montant_ttc: number; statut: string; date_emission: string }[]
  weekends: { id: string; date_vendredi: string; date_samedi: string; statut: string; nb_sejours_confirmes: number; seuil_guests: number }[]
}

const OBJECTIF_CA = 40_000_000
const COMMISSION_RATE = 0.02

export function StatsClient({ lots, prospects, ventes, apporteurs, sejours, factures, weekends }: StatsClientProps) {
  const caNotarie = ventes.filter(v => v.statut === 'acte_signe').reduce((s, v) => s + v.prix_notarie, 0)
  const lotsVendus = lots.filter(l => l.statut === 'vendu').length
  const lotsBloque = lots.filter(l => l.statut === 'bloque').length
  const lotsDisponibles = lots.filter(l => l.statut === 'disponible').length

  const revenusNoShow = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0)
  const facturesEmises = factures.filter(f => f.statut === 'emise').reduce((s, f) => s + f.montant_ttc, 0)

  // Funnel
  const totalProspects = prospects.length
  const withVisite = prospects.filter(p => ['visite_programmee','visite_realisee','dossier_envoye','formulaire_signe','sejour_confirme','sejour_realise','vendu'].includes(p.statut)).length
  const withFormulaire = prospects.filter(p => ['formulaire_signe','sejour_confirme','sejour_realise','vendu'].includes(p.statut)).length
  const converted = prospects.filter(p => p.statut === 'vendu').length

  const conversionVisiteSejour = withVisite > 0 ? ((sejours.length / withVisite) * 100).toFixed(0) : '0'
  const conversionSejourVente = sejours.length > 0 ? ((converted / sejours.length) * 100).toFixed(0) : '0'

  // Stats par apporteur
  const statsApporteur = apporteurs.map(ap => {
    const mesProspects = prospects.filter(p => p.apporteur_id === ap.id)
    const mesVisites = mesProspects.filter(p => ['visite_programmee','visite_realisee','dossier_envoye','formulaire_signe','sejour_confirme','sejour_realise','vendu'].includes(p.statut)).length
    const mesSejours = sejours.filter(s => s.prospect?.apporteur_id === ap.id).length
    const mesVentes = ventes.filter(v => v.apporteur_id === ap.id && v.statut === 'acte_signe')
    const ca = mesVentes.reduce((s, v) => s + v.prix_notarie, 0)
    const commission = mesVentes.reduce((s, v) => s + (v.commission_apporteur || v.prix_notarie * COMMISSION_RATE), 0)
    const conversionRate = mesProspects.length > 0 ? Math.round((mesVentes.length / mesProspects.length) * 100) : 0
    return {
      ...ap,
      nbProspects: mesProspects.length,
      nbVisites: mesVisites,
      nbSejours: mesSejours,
      nbVentes: mesVentes.length,
      ca,
      commission,
      conversionRate,
    }
  }).sort((a, b) => b.nbVentes - a.nbVentes)

  // Weekends par mois
  const weekendsByMonth: Record<string, typeof weekends> = {}
  weekends.forEach(w => {
    const month = w.date_vendredi.slice(0, 7)
    if (!weekendsByMonth[month]) weekendsByMonth[month] = []
    weekendsByMonth[month].push(w)
  })

  // Lots par type
  const lotsByType: Record<string, { total: number; disponible: number; bloque: number; vendu: number }> = {}
  lots.forEach(l => {
    if (!lotsByType[l.type]) lotsByType[l.type] = { total: 0, disponible: 0, bloque: 0, vendu: 0 }
    lotsByType[l.type].total++
    lotsByType[l.type][l.statut as 'disponible' | 'bloque' | 'vendu']++
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Statistiques</h1>
        <p className="text-sm text-gray-500 mt-1">Tableau de bord analytique — Azembay RIPT 1</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'CA Notarié', value: formatCurrency(caNotarie), sub: `${((caNotarie/OBJECTIF_CA)*100).toFixed(1)}% de l'objectif`, icon: TrendingUp, color: 'bg-[#1A3C6E]/10 text-[#1A3C6E]' },
          { label: 'Lots vendus', value: `${lotsVendus} / ${lots.length}`, sub: `${lotsBloque} retenus · ${lotsDisponibles} dispo`, icon: Home, color: 'bg-[#C8973A]/10 text-[#C8973A]' },
          { label: 'Revenus no-show', value: formatCurrency(revenusNoShow), sub: `${formatCurrency(facturesEmises)} en attente`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'Total prospects', value: totalProspects, sub: `${converted} converti(s)`, icon: Users, color: 'bg-blue-50 text-blue-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className="text-lg font-bold text-[#1A3C6E]">{kpi.value}</p>
                  <p className="text-[10px] text-gray-400">{kpi.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CA Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] text-sm">Progression objectif CA — 40 M MAD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CA notarié : <strong>{formatCurrency(caNotarie)}</strong></span>
              <span className="text-gray-500">{((caNotarie / OBJECTIF_CA) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(caNotarie / OBJECTIF_CA) * 100} className="h-3" />
            <p className="text-xs text-gray-400">Restant : {formatCurrency(Math.max(0, OBJECTIF_CA - caNotarie))}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm">Funnel de conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Prospects total', value: totalProspects },
              { label: 'Avec visite', value: withVisite },
              { label: 'Avec formulaire', value: withFormulaire },
              { label: 'Séjours planifiés', value: sejours.length },
              { label: 'Ventes conclues', value: converted },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-bold text-[#1A3C6E]">{value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-full rounded-full bg-[#1A3C6E] transition-all"
                    style={{ width: totalProspects > 0 ? `${(value/totalProspects)*100}%` : '0%', opacity: 0.3 + (value/Math.max(totalProspects,1))*0.7 }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t space-y-1 text-xs text-gray-500">
              <div className="flex justify-between"><span>Visite → Séjour</span><span className="font-bold text-[#1A3C6E]">{conversionVisiteSejour}%</span></div>
              <div className="flex justify-between"><span>Séjour → Vente</span><span className="font-bold text-[#1A3C6E]">{conversionSejourVente}%</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Stock lots par type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm flex items-center gap-2">
              <Home className="w-4 h-4" /> Stock par type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(lotsByType).map(([type, counts]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">{LOT_TYPE_LABELS[type as keyof typeof LOT_TYPE_LABELS]}</span>
                  <span className="text-gray-500">{counts.vendu}/{counts.total} vendus</span>
                </div>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded">
                  {counts.vendu > 0 && <div className="bg-yellow-400" style={{ width: `${(counts.vendu/counts.total)*100}%` }} title={`${counts.vendu} vendu(s)`} />}
                  {counts.bloque > 0 && <div className="bg-orange-400" style={{ width: `${(counts.bloque/counts.total)*100}%` }} title={`${counts.bloque} bloqué(s)`} />}
                  {counts.disponible > 0 && <div className="bg-green-400" style={{ width: `${(counts.disponible/counts.total)*100}%` }} title={`${counts.disponible} disponible(s)`} />}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-sm inline-block" />{counts.disponible} dispo</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-sm inline-block" />{counts.bloque} retenus</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-sm inline-block" />{counts.vendu} vendus</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Occupation weekends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Weekends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {weekends.map(w => {
              const pct = w.seuil_guests > 0 ? Math.min((w.nb_sejours_confirmes / w.seuil_guests) * 100, 100) : 0
              const date = new Date(w.date_vendredi + 'T00:00:00')
              return (
                <div key={w.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{w.nb_sejours_confirmes}/{w.seuil_guests}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', WEEKEND_STATUT_COLORS[w.statut as keyof typeof WEEKEND_STATUT_COLORS])}>
                        {WEEKEND_STATUT_LABELS[w.statut as keyof typeof WEEKEND_STATUT_LABELS]}
                      </span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Performance apporteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Classement Apporteurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsApporteur.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun apporteur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 pr-4">Apporteur</th>
                    <th className="pb-2 pr-4 text-center">Prospects</th>
                    <th className="pb-2 pr-4 text-center">Visites</th>
                    <th className="pb-2 pr-4 text-center">Séjours</th>
                    <th className="pb-2 pr-4 text-center">Ventes</th>
                    <th className="pb-2 pr-4 text-right">Taux conv.</th>
                    <th className="pb-2 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {statsApporteur.map((ap, i) => (
                    <tr key={ap.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-[#C8973A]">★</span>}
                          <span className="font-medium">{ap.prenom} {ap.nom}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-center text-gray-600">{ap.nbProspects}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-600">{ap.nbVisites}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-600">{ap.nbSejours}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <Badge variant={ap.nbVentes > 0 ? 'gold' : 'gray'}>
                          {ap.nbVentes}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-xs text-gray-500">{ap.conversionRate}%</td>
                      <td className="py-2.5 text-right font-medium text-[#1A3C6E]">{formatCurrency(ap.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock détaillé lots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] text-sm">Détail stock — tous les lots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {lots.map(lot => (
              <div key={lot.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-[#1A3C6E] w-24">{lot.reference}</span>
                  <span className="text-xs text-gray-500">{LOT_TYPE_LABELS[lot.type as keyof typeof LOT_TYPE_LABELS]}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{formatCurrency(lot.prix_individuel)}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', LOT_STATUT_COLORS[lot.statut as keyof typeof LOT_STATUT_COLORS])}>
                    {LOT_STATUT_LABELS[lot.statut as keyof typeof LOT_STATUT_LABELS]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
