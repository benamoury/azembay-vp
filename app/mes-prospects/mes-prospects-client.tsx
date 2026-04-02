'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  formatCurrency, formatDate,
  PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS, CRM_ETAPES,
} from '@/lib/utils'
import type { Prospect, Vente } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrendingUp, Target, User } from 'lucide-react'

interface MesProspectsClientProps {
  prospects: Prospect[]
  ventes: Vente[]
}

const OBJECTIF = 3
const COMMISSION_RATE = 0.02

export function MesProspectsClient({ prospects, ventes }: MesProspectsClientProps) {
  const ventesAcquises = ventes.filter(v => v.statut === 'acte_signe')
  const commissionAcquise = ventesAcquises.reduce((s, v) => s + (v.commission_apporteur || v.prix_notarie * COMMISSION_RATE), 0)
  const commissionEstimee = ventes.filter(v => v.statut === 'en_cours').reduce((s, v) => s + v.prix_notarie * COMMISSION_RATE, 0)

  const byStatut = prospects.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Mes prospects</h1>
        <p className="text-sm text-gray-500 mt-1">{prospects.length} prospect(s) soumis</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Commission acquise</p>
            <p className="text-2xl font-bold text-[#C8973A] mt-1">{formatCurrency(commissionAcquise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Commission estimée (en cours)</p>
            <p className="text-2xl font-bold text-[#1A3C6E] mt-1">{formatCurrency(commissionEstimee)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Target className="w-3 h-3" /> Objectif ventes
              </p>
              <span className="text-xs text-gray-400">{ventesAcquises.length}/{OBJECTIF}</span>
            </div>
            <Progress value={(ventesAcquises.length / OBJECTIF) * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-7 gap-2">
        {CRM_ETAPES.map((etape, i) => (
          <div key={etape.value} className="text-center p-3 rounded-xl bg-white border border-gray-100">
            <div className="text-xs text-gray-400 mb-1">Étape {i + 1}</div>
            <div className="text-2xl font-bold text-[#1A3C6E]">{byStatut[etape.value] || 0}</div>
            <div className="text-[10px] text-gray-500 mt-1 leading-tight">{etape.label}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {prospects.map(p => (
          <Card key={p.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1A3C6E]/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-[#1A3C6E]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.prenom} {p.nom}</p>
                    <p className="text-xs text-gray-400">
                      {p.email}
                      {p.budget_estime && ` · ${formatCurrency(p.budget_estime)}`}
                      {` · ${formatDate(p.created_at)}`}
                    </p>
                  </div>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PROSPECT_STATUT_COLORS[p.statut])}>
                  {PROSPECT_STATUT_LABELS[p.statut]}
                </span>
              </div>
              {p.statut === 'soumis' && (
                <p className="text-xs text-orange-500 mt-2 ml-12">⏳ En attente de validation Manager</p>
              )}
            </CardContent>
          </Card>
        ))}
        {prospects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              Vous n'avez pas encore soumis de prospect.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
