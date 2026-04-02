'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS } from '@/lib/utils'
import type { Prospect, Vente } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, Users } from 'lucide-react'

interface ApporteurDashboardProps {
  prospects: Prospect[]
  ventes: Vente[]
  nom: string
  prenom: string
}

const OBJECTIF_VENTES = 3
const COMMISSION_RATE = 0.02 // 2%

export function ApporteurDashboard({ prospects, ventes, nom, prenom }: ApporteurDashboardProps) {
  const ventesAcquises = ventes.filter(v => v.statut === 'acte_signe')
  const ventesEnCours = ventes.filter(v => v.statut === 'en_cours')

  const commissionAcquise = ventesAcquises.reduce((sum, v) => sum + (v.commission_apporteur || v.prix_notarie * COMMISSION_RATE), 0)
  const commissionEstimee = ventesEnCours.reduce((sum, v) => sum + v.prix_notarie * COMMISSION_RATE, 0)

  const progression = Math.min((ventesAcquises.length / OBJECTIF_VENTES) * 100, 100)

  const byStatut = prospects.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Bonjour, {prenom} !</h1>
        <p className="text-sm text-gray-500 mt-1">Votre tableau de bord apporteur</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C8973A]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#C8973A]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Commission acquise</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{formatCurrency(commissionAcquise)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Commission estimée</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{formatCurrency(commissionEstimee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total prospects</p>
                <p className="text-lg font-bold text-[#1A3C6E]">{prospects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectif ventes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A3C6E]">
            <Target className="w-4 h-4 text-[#C8973A]" />
            Objectif : {OBJECTIF_VENTES} ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{ventesAcquises.length} vente(s) réalisée(s)</span>
              <span className="text-gray-500">{progression.toFixed(0)}%</span>
            </div>
            <Progress value={progression} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E]">Mes prospects par étape</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PROSPECT_STATUT_LABELS).map(([key, label]) => (
              <div key={key} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border text-xs', PROSPECT_STATUT_COLORS[key as keyof typeof PROSPECT_STATUT_COLORS])}>
                <span className="font-medium">{label}</span>
                <span className="font-bold text-sm">{byStatut[key] || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
