'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS } from '@/lib/utils'
import type { Prospect, Vente } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, Users, Hotel, Calendar, AlertCircle, Home } from 'lucide-react'
import Link from 'next/link'

type LotDisponible = {
  id: string; reference: string; type: string; prix_individuel: number; prix_bloc?: number
}

interface ApporteurDashboardProps {
  prospects: Prospect[]
  ventes: Vente[]
  sejours: { id: string; statut: string; date_arrivee: string; date_depart: string }[]
  visites: { id: string; statut: string; date_visite: string }[]
  lotsDisponibles: LotDisponible[]
  quotaUsed: number
  quotaMax: number
  nom: string
  prenom: string
  prochainesVisites?: any[]
  prochainsWeekends?: any[]
}

const OBJECTIF_VENTES = 3
const COMMISSION_RATE = 0.02

const LOT_TYPE_LABELS: Record<string, string> = {
  villa_e: 'Villa Type E',
  appart_2ch: 'Appart. 2CH',
  appart_1ch: 'Appart. 1CH',
}

export function ApporteurDashboard({ prospects, ventes, sejours, visites, lotsDisponibles, quotaUsed, quotaMax, nom, prenom, prochainesVisites = [], prochainsWeekends = [] }: ApporteurDashboardProps) {
  const ventesAcquises = ventes.filter(v => v.statut === 'acte_signe')
  const commissionAcquise = ventesAcquises.reduce((sum, v) => sum + (v.commission_apporteur || v.prix_notarie * COMMISSION_RATE), 0)
  const commissionEstimee = ventes.filter(v => v.statut === 'en_cours').reduce((sum, v) => sum + v.prix_notarie * COMMISSION_RATE, 0)

  const progression = Math.min((ventesAcquises.length / OBJECTIF_VENTES) * 100, 100)
  const quotaRestant = quotaMax - quotaUsed
  const quotaPct = (quotaUsed / quotaMax) * 100

  const visitesActives = visites.filter(v => !['annulee'].includes(v.statut)).length
  const sejoursConfirmes = sejours.filter(s => s.statut === 'confirme').length
  const sejoursEnAttente = sejours.filter(s => s.statut === 'demande').length

  const byStatut = prospects.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <ProchainesVisitesWidget visites={prochainesVisites} weekends={prochainsWeekends} />
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
                <p className="text-xl font-bold text-[#1A3C6E]">{visitesActives}</p>
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
                <p className="text-xl font-bold text-[#1A3C6E]">{quotaUsed}<span className="text-sm text-gray-400">/{quotaMax}</span></p>
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
              Vous avez atteint votre quota de {quotaMax} séjours pour cette session.
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
            <Link href="/mes-prospects" className="flex items-center justify-between p-3 bg-[#1A3C6E]/5 rounded-lg hover:bg-[#1A3C6E]/10 transition-colors">
              <span className="text-sm font-medium text-[#1A3C6E]">Planifier une visite / séjour</span>
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

      {/* Lots disponibles */}
      {lotsDisponibles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-[#C8973A]" />
              Lots disponibles — {lotsDisponibles.length} unité(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {lotsDisponibles.map(lot => (
                <div key={lot.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#1A3C6E]">{lot.reference}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{LOT_TYPE_LABELS[lot.type] ?? lot.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#C8973A]">{formatCurrency(lot.prix_individuel)}</p>
                    {lot.prix_bloc && <p className="text-[10px] text-gray-400">Bloc : {formatCurrency(lot.prix_bloc)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


function ProchainesVisitesWidget({ visites, weekends }: { visites: any[], weekends: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1A3C6E] flex items-center gap-2">🌅 Prochaines visites</CardTitle>
        </CardHeader>
        <CardContent>
          {visites.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune visite à venir.</p>
          ) : (
            <div className="space-y-2">
              {visites.map((v: any) => {
                const p = Array.isArray(v.prospect) ? v.prospect[0] : v.prospect
                const isToday = v.date_visite === new Date().toISOString().split('T')[0]
                const date = new Date(v.date_visite + 'T00:00:00')
                return (
                  <div key={v.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${isToday ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <p className="text-sm font-medium text-[#1A3C6E]">{p?.prenom} {p?.nom}</p>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${isToday ? 'text-amber-700' : 'text-gray-600'}`}>
                        {isToday ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-amber-600">🌅 17h00</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1A3C6E] flex items-center gap-2">🏕️ Prochains weekends</CardTitle>
        </CardHeader>
        <CardContent>
          {weekends.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun weekend à venir.</p>
          ) : (
            <div className="space-y-2">
              {weekends.map((w: any) => {
                const date = new Date(w.date_vendredi + 'T00:00:00')
                const places = (w.seuil_guests || 0) - (w.nb_guests_confirmes || 0)
                return (
                  <div key={w.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#1A3C6E]">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                      <p className="text-xs text-gray-400">Vendredi → Dimanche</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.statut === 'valide' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {w.statut === 'valide' ? '✓ Validé' : 'Ouvert'}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{places} place(s)</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

