'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, PROSPECT_STATUT_LABELS, SEJOUR_STATUT_LABELS } from '@/lib/utils'
import type { Lot, Prospect, Vente, Sejour } from '@/lib/types'
import { TrendingUp, Home, AlertTriangle, Users, Hotel, DollarSign } from 'lucide-react'

interface DirectionDashboardProps {
  lots: Lot[]
  prospects: Prospect[]
  ventes: Vente[]
  sejours: Sejour[]
  factures: { montant_ttc: number; statut: string }[]
}

const OBJECTIF_CA = 40_000_000

export function DirectionDashboard({ lots, prospects, ventes, sejours, factures }: DirectionDashboardProps) {
  const caNotarie = ventes.filter(v => v.statut === 'acte_signe').reduce((sum, v) => sum + v.prix_notarie, 0)
  const caProgress = Math.min((caNotarie / OBJECTIF_CA) * 100, 100)

  const lotsVendus = lots.filter(l => l.statut === 'vendu').length
  const lotsBloque = lots.filter(l => l.statut === 'bloque').length
  const lotsDisponibles = lots.filter(l => l.statut === 'disponible').length

  const revenusNoShow = factures.filter(f => f.statut === 'payee').reduce((sum, f) => sum + f.montant_ttc, 0)
  const facturesEnAttente = factures.filter(f => f.statut === 'emise').reduce((sum, f) => sum + f.montant_ttc, 0)

  // Funnel de conversion
  const totalProspects = prospects.length
  const withVisite = prospects.filter(p => ['visite_programmee','visite_realisee','dossier_envoye','formulaire_signe','sejour_confirme','sejour_realise','vendu'].includes(p.statut)).length
  const withFormulaire = prospects.filter(p => ['formulaire_signe','sejour_confirme','sejour_realise','vendu'].includes(p.statut)).length
  const withSejour = sejours.filter(s => s.statut !== 'annule').length
  const converted = prospects.filter(p => p.statut === 'vendu').length

  const conversionVisiteSejour = withVisite > 0 ? Math.round((withSejour / withVisite) * 100) : 0
  const conversionSejourVente = withSejour > 0 ? Math.round((converted / withSejour) * 100) : 0

  // Alertes
  const now = new Date()
  const alertes = prospects.filter(p => {
    if (p.statut !== 'visite_realisee') return false
    return (now.getTime() - new Date(p.updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
  })

  // Performance apporteurs
  const apporteurStats: Record<string, { nom: string; ventes: number; prospects: number; sejours: number }> = {}
  prospects.forEach(p => {
    if (!p.apporteur_id) return
    if (!apporteurStats[p.apporteur_id]) {
      apporteurStats[p.apporteur_id] = {
        nom: p.apporteur ? `${(p.apporteur as {prenom:string;nom:string}).prenom} ${(p.apporteur as {prenom:string;nom:string}).nom}` : 'Inconnu',
        ventes: 0, prospects: 0, sejours: 0,
      }
    }
    apporteurStats[p.apporteur_id].prospects++
    if (p.statut === 'vendu') apporteurStats[p.apporteur_id].ventes++
  })

  sejours.forEach(s => {
    const p = s.prospect as Prospect | undefined
    if (p?.apporteur_id && apporteurStats[p.apporteur_id]) {
      apporteurStats[p.apporteur_id].sejours++
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Tableau de bord Direction</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble — Azembay RIPT 1</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A3C6E]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#1A3C6E]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">CA Notarié</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{formatCurrency(caNotarie)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C8973A]/10 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-[#C8973A]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Stock lots</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{lotsDisponibles} dispo</p>
                <p className="text-[10px] text-gray-400">{lotsBloque} retenus · {lotsVendus} vendus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Revenus no-show</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{formatCurrency(revenusNoShow)}</p>
                {facturesEnAttente > 0 && <p className="text-[10px] text-orange-500">{formatCurrency(facturesEnAttente)} en attente</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Alertes</p>
                <p className="text-lg font-bold text-red-600">{alertes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <span className="text-gray-500">{caProgress.toFixed(1)}%</span>
            </div>
            <Progress value={caProgress} className="h-2" />
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
              { label: 'Prospects total', value: totalProspects, color: 'bg-gray-200' },
              { label: 'Avec visite', value: withVisite, color: 'bg-blue-400' },
              { label: 'Avec formulaire', value: withFormulaire, color: 'bg-orange-400' },
              { label: 'Séjours planifiés', value: withSejour, color: 'bg-purple-400' },
              { label: 'Ventes conclues', value: converted, color: 'bg-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-bold">{value}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className={`h-full rounded-full ${color}`} style={{ width: totalProspects > 0 ? `${(value/totalProspects)*100}%` : '0%' }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Visite → Séjour</span>
                <span className="font-medium text-gray-700">{conversionVisiteSejour}%</span>
              </div>
              <div className="flex justify-between">
                <span>Séjour → Vente</span>
                <span className="font-medium text-gray-700">{conversionSejourVente}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Séjours par statut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm flex items-center gap-2">
              <Hotel className="w-4 h-4" /> Séjours par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(SEJOUR_STATUT_LABELS).map(([key, label]) => {
              const count = sejours.filter(s => s.statut === key).length
              return (
                <div key={key} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="text-xs text-gray-600">{label}</span>
                  <Badge variant={count > 0 ? 'green' : 'gray'}>{count}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Apporteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1A3C6E] text-sm">
              <Users className="w-4 h-4" /> Performance Apporteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.values(apporteurStats).length === 0 ? (
              <p className="text-sm text-gray-400">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {Object.values(apporteurStats)
                  .sort((a, b) => b.ventes - a.ventes)
                  .map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.nom}</p>
                        <p className="text-xs text-gray-400">{a.prospects} prospect(s) · {a.sejours} séjour(s)</p>
                      </div>
                      <Badge variant={a.ventes > 0 ? 'gold' : 'gray'}>
                        {a.ventes} vente{a.ventes !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] text-sm">Pipeline CRM global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {(['soumis', 'valide', 'visite_realisee', 'formulaire_signe', 'vendu'] as const).map(statut => {
              const count = prospects.filter(p => p.statut === statut).length
              return (
                <div key={statut} className="text-center">
                  <p className="text-2xl font-bold text-[#1A3C6E]">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">{PROSPECT_STATUT_LABELS[statut]}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      {alertes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Prospects sans action depuis +7 jours (visite réalisée)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                  <span className="text-xs text-orange-600">{new Date(p.updated_at).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
