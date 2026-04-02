'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, PROSPECT_STATUT_LABELS } from '@/lib/utils'
import type { Lot, Prospect, Vente } from '@/lib/types'
import { TrendingUp, Home, AlertTriangle, Users } from 'lucide-react'

interface DirectionDashboardProps {
  lots: Lot[]
  prospects: Prospect[]
  ventes: Vente[]
}

const OBJECTIF_CA = 40_000_000

export function DirectionDashboard({ lots, prospects, ventes }: DirectionDashboardProps) {
  const caNotarie = ventes
    .filter(v => v.statut === 'acte_signe')
    .reduce((sum, v) => sum + v.prix_notarie, 0)
  const caProgress = Math.min((caNotarie / OBJECTIF_CA) * 100, 100)

  const lotsVendus = lots.filter(l => l.statut === 'vendu').length
  const lotsDisponibles = lots.filter(l => l.statut === 'disponible').length

  // Alertes : prospects en étape 4 (visite_realisee) depuis >7 jours
  const now = new Date()
  const alertes = prospects.filter(p => {
    if (p.statut !== 'visite_realisee') return false
    const updated = new Date(p.updated_at)
    return (now.getTime() - updated.getTime()) > 7 * 24 * 60 * 60 * 1000
  })

  // Performance par apporteur
  const apporteurStats: Record<string, { nom: string; ventes: number; prospects: number }> = {}
  prospects.forEach(p => {
    if (!p.apporteur_id) return
    const key = p.apporteur_id
    if (!apporteurStats[key]) {
      apporteurStats[key] = {
        nom: p.apporteur ? `${p.apporteur.prenom} ${p.apporteur.nom}` : 'Inconnu',
        ventes: 0,
        prospects: 0,
      }
    }
    apporteurStats[key].prospects++
    if (p.statut === 'vendu') apporteurStats[key].ventes++
  })

  const pipeline = [
    'soumis', 'valide', 'visite_programmee', 'visite_realisee',
    'formulaire_signe', 'vendu',
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Tableau de bord Direction</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble — Azembay RIPT 1</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
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
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C8973A]/10 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-[#C8973A]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lots vendus</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{lotsVendus} / 16</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lots disponibles</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{lotsDisponibles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
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
          <CardTitle className="text-[#1A3C6E]">Progression objectif CA — 40 M MAD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">CA notarié : <strong>{formatCurrency(caNotarie)}</strong></span>
              <span className="text-gray-500">{caProgress.toFixed(1)}%</span>
            </div>
            <Progress value={caProgress} className="h-3" />
            <p className="text-xs text-gray-400">
              Restant : {formatCurrency(Math.max(0, OBJECTIF_CA - caNotarie))}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">Pipeline CRM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pipeline.map(statut => {
                const count = prospects.filter(p => p.statut === statut).length
                return (
                  <div key={statut} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{PROSPECT_STATUT_LABELS[statut]}</span>
                    <Badge variant={statut === 'vendu' ? 'gold' : count > 0 ? 'green' : 'gray'}>
                      {count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Apporteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1A3C6E]">
              <Users className="w-4 h-4" />
              Performance Apporteurs
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
                        <p className="text-xs text-gray-400">{a.prospects} prospect(s)</p>
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

      {/* Alertes */}
      {alertes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertes — Prospects sans action depuis +7 jours (étape 4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                  <span className="text-xs text-orange-600">
                    Dernière action : {new Date(p.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
