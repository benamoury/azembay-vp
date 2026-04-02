'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS } from '@/lib/utils'
import type { Prospect, Vente } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, Users, Hotel, Calendar, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ApporteurDashboardProps {
  prospects: Prospect[]
  ventes: Vente[]
  sejours: { id: string; statut: string; date_arrivee: string; date_depart: string }[]
  visites: { id: string; statut: string; date_visite: string }[]
  quotaUsed: number
  nom: string
  prenom: string
}

const QUOTA_MAX = 6
const OBJECTIF_VENTES = 3
const COMMISSION_RATE = 0.02

export function ApporteurDashboard({ prospects, ventes, sejours, visites, quotaUsed, nom, prenom }: ApporteurDashboardProps) {
  const ventesAcquises = ventes.filter(v => v.statut === 'acte_signe')
  const commissionAcquise = ventesAcquises.reduce((sum, v) => sum + (v.commission_apporteur || v.prix_notarie * COMMISSION_RATE), 0)
  const commissionEstimee = ventes.filter(v => v.statut === 'en_cours').reduce((sum, v) => sum + v.prix_notarie * COMMISSION_RATE, 0)

  const progression = Math.min((ventesAcquises.length / OBJECTIF_VENTES) * 100, 100)
  const quotaRestant = QUOTA_MAX - quotaUsed
  const quotaPct = (quotaUsed / QUOTA_MAX) * 100

  const visitesEnAttente = visites.filter(v => v.statut === 'demandee').length
  const sejoursConfirmes = sejours.filter(s => s.statut === 'confirme').length
  const sejoursEnAttente = sejours.filter(s => s.statut === 'demande').length

  const byStatut = prospects.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Bonjour, {prenom} !</h1>
        <p className="text-sm text-gray-500 mt-1">Votre tableau de bord — Golden Hour 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Prospects</p>
                <p className="text-xl font-bold text-[#1A3C6E]">{prospects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Visites</p>
                <p className="text-xl font-bold text-[#1A3C6E]">{visites.length}</p>
                {visitesEnAttente > 0 && <p className="text-[10px] text-orange-500">{visitesEnAttente} en attente</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Hotel className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Séjours</p>
                <p className="text-xl font-bold text-[#1A3C6E]">{sejours.length}</p>
                {sejoursEnAttente > 0 && <p className="text-[10px] text-orange-500">{sejoursEnAttente} en attente</p>}
                {sejoursConfirmes > 0 && <p className="text-[10px] text-green-600">{sejoursConfirmes} confirmé(s)</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', quotaRestant <= 1 ? 'bg-red-50' : 'bg-[#C8973A]/10')}>
                <Target className={cn('w-5 h-5', quotaRestant <= 1 ? 'text-red-500' : 'text-[#C8973A]')} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Quota séjours</p>
                <p className="text-xl font-bold text-[#1A3C6E]">{quotaUsed}<span className="text-sm text-gray-400">/{QUOTA_MAX}</span></p>
                {quotaRestant === 0 && <p className="text-[10px] text-red-500">Quota atteint</p>}
                {quotaRestant === 1 && <p className="text-[10px] text-orange-500">1 place restante</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quota progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1A3C6E] text-sm">
            <Hotel className="w-4 h-4 text-[#C8973A]" />
            Quota séjours test — fin juin 2026
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{quotaUsed} séjour(s) utilisé(s)</span>
            <span className={cn('font-medium', quotaRestant === 0 ? 'text-red-500' : quotaRestant <= 2 ? 'text-orange-500' : 'text-green-600')}>
              {quotaRestant} place(s) restante(s)
            </span>
          </div>
          <Progress value={quotaPct} className="h-2" />
          {quotaRestant === 0 && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Vous avez atteint votre quota de {QUOTA_MAX} séjours pour cette session.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Objectif ventes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1A3C6E] text-sm">
              <Target className="w-4 h-4 text-[#C8973A]" />
              Objectif : {OBJECTIF_VENTES} ventes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{ventesAcquises.length} vente(s) réalisée(s)</span>
                <span className="text-gray-500">{progression.toFixed(0)}%</span>
              </div>
              <Progress value={progression} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Commission acquise</p>
                <p className="font-bold text-[#1A3C6E]">{formatCurrency(commissionAcquise)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Commission estimée</p>
                <p className="font-semibold text-gray-600">{formatCurrency(commissionEstimee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm">Accès rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/soumettre" className="flex items-center justify-between p-3 bg-[#1A3C6E]/5 rounded-lg hover:bg-[#1A3C6E]/10 transition-colors">
              <span className="text-sm font-medium text-[#1A3C6E]">Soumettre un prospect</span>
              <Users className="w-4 h-4 text-[#C8973A]" />
            </Link>
            <Link href="/mes-prospects" className="flex items-center justify-between p-3 bg-[#1A3C6E]/5 rounded-lg hover:bg-[#1A3C6E]/10 transition-colors">
              <span className="text-sm font-medium text-[#1A3C6E]">Mes prospects</span>
              <TrendingUp className="w-4 h-4 text-[#C8973A]" />
            </Link>
            <Link href="/calendrier" className="flex items-center justify-between p-3 bg-[#1A3C6E]/5 rounded-lg hover:bg-[#1A3C6E]/10 transition-colors">
              <span className="text-sm font-medium text-[#1A3C6E]">Calendrier des visites</span>
              <Calendar className="w-4 h-4 text-[#C8973A]" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] text-sm">Mes prospects par étape</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PROSPECT_STATUT_LABELS).map(([key, label]) => (
              byStatut[key] ? (
                <div key={key} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border text-xs', PROSPECT_STATUT_COLORS[key as keyof typeof PROSPECT_STATUT_COLORS])}>
                  <span className="font-medium">{label}</span>
                  <span className="font-bold text-sm">{byStatut[key]}</span>
                </div>
              ) : null
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
