'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Visite } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { Calendar, CheckCircle, XCircle, Star, Users, Clock } from 'lucide-react'
import { annulerVisite, marquerVisiteRealisee } from '@/actions/visites'
import Link from 'next/link'

const STATUT_LABELS: Record<string, string> = {
  confirmee: 'Confirmée',
  realisee: 'Réalisée',
  annulee: 'Annulée',
}

const STATUT_COLORS: Record<string, string> = {
  confirmee: 'bg-blue-100 text-blue-700',
  realisee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-600',
}

type ApporteurInfo = { nom: string; prenom: string } | null

type VisiteWithRelations = Visite & {
  prospect: {
    nom: string; prenom: string; email: string
    telephone?: string; budget_estime?: number
    apporteur?: ApporteurInfo | ApporteurInfo[]
  }
  apporteur?: ApporteurInfo | ApporteurInfo[]
  jour: { date: string; prioritaire: boolean }
}

// ─── Composant Tooltip ───────────────────────────────────────────────────────

function DateTooltip({ date, visiteurs }: {
  date: string
  visiteurs: VisiteWithRelations[]
}) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const dayNum = new Date(date + 'T00:00:00').getDate()
  const monthShort = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })
  const isToday = date === new Date().toISOString().split('T')[0]

  function handleMouseEnter(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ x: rect.left, y: rect.bottom + 8 })
    setVisible(true)
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex flex-col items-center cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Badge date compact */}
      <div className={cn(
        'flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 shadow-sm transition-all',
        isToday
          ? 'bg-amber-500 border-amber-400 text-white shadow-amber-200'
          : 'bg-white border-[#1A3C6E]/20 text-[#1A3C6E]'
      )}>
        <span className="text-[10px] font-medium uppercase opacity-70">{monthShort}</span>
        <span className="text-2xl font-bold leading-none">{dayNum}</span>
        <span className="text-[10px] font-medium flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5" />{visiteurs.length}
        </span>
      </div>

      {/* Tooltip popup */}
      {visible && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 min-w-[280px] max-w-[340px]"
          style={{ left: Math.min(pos.x, window.innerWidth - 360), top: pos.y }}
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            <span className="text-sm font-bold text-[#1A3C6E] capitalize">{dateFormatted}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              🌅 17h (prévoir 3h) · {visiteurs.length} visite{visiteurs.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {visiteurs.map((v) => {
              const ap = Array.isArray(v.apporteur) ? v.apporteur[0] : v.apporteur
              const apAlt = Array.isArray(v.prospect?.apporteur) ? v.prospect.apporteur[0] : v.prospect?.apporteur
              const apporteur = ap || apAlt
              return (
                <div key={v.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                  <div className="w-7 h-7 bg-[#1A3C6E]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#1A3C6E]">
                      {v.prospect?.prenom?.[0]}{v.prospect?.nom?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {v.prospect?.prenom} {v.prospect?.nom}
                    </p>
                    {v.prospect?.budget_estime && (
                      <p className="text-xs text-[#C8973A]">{formatCurrency(v.prospect.budget_estime)}</p>
                    )}
                    {apporteur && (
                      <p className="text-xs text-gray-500">
                        🤝 {apporteur.prenom} {apporteur.nom}
                      </p>
                    )}
                  </div>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full shrink-0', STATUT_COLORS[v.statut])}>
                    {STATUT_LABELS[v.statut]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function VisitesClient({ visites: initialVisites, userId }: {
  visites: VisiteWithRelations[]
  userId: string
}) {
  const [visites, setVisites] = useState(initialVisites)
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleRealise(id: string) {
    setLoading(id)
    const result = await marquerVisiteRealisee(id)
    if (result.success) {
      setVisites(prev => prev.map(v => v.id === id ? { ...v, statut: 'realisee' } : v))
      toast({ title: '✓ Visite marquée réalisée' })
    } else toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    setLoading(null)
  }

  async function handleAnnuler(id: string) {
    setLoading(id)
    const result = await annulerVisite(id)
    if (result.success) {
      setVisites(prev => prev.map(v => v.id === id ? { ...v, statut: 'annulee' } : v))
      toast({ title: 'Visite annulée' })
    } else toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    setLoading(null)
  }

  // Grouper par date
  const grouped = visites.reduce((acc, v) => {
    const d = v.date_visite
    if (!acc[d]) acc[d] = []
    acc[d].push(v)
    return acc
  }, {} as Record<string, VisiteWithRelations[]>)

  const sortedDates = Object.keys(grouped).sort()
  const today = new Date().toISOString().split('T')[0]
  const upcoming = sortedDates.filter(d => d >= today)
  const past = sortedDates.filter(d => d < today)
  const active = visites.filter(v => v.statut === 'confirmee')

  return (
    <div className="space-y-6">
      {/* Header avec stats rapides */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Visites</h1>
          <p className="text-sm text-gray-500 mt-1">
            {active.length} confirmée{active.length > 1 ? 's' : ''} · {visites.length} au total
          </p>
        </div>
        {/* Frise dates à venir */}
        {upcoming.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end max-w-[60%]">
            {upcoming.slice(0, 6).map(date => (
              <DateTooltip key={date} date={date} visiteurs={grouped[date]} />
            ))}
          </div>
        )}
      </div>

      {/* Visites à venir groupées par date */}
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#1A3C6E] flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            À venir ({upcoming.reduce((s, d) => s + grouped[d].length, 0)})
          </h2>
          {upcoming.map(date => {
            const visitsDuJour = grouped[date]
            const isToday = date === today
            const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })
            return (
              <div key={date}>
                {/* En-tête de groupe de date */}
                <div className={cn(
                  'flex items-center gap-3 mb-2 px-3 py-2 rounded-lg',
                  isToday ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                )}>
                  <DateTooltip date={date} visiteurs={visitsDuJour} />
                  <div>
                    <p className={cn('font-semibold capitalize text-sm', isToday ? 'text-amber-800' : 'text-gray-700')}>
                      {isToday ? "📍 Aujourd'hui" : dateFormatted}
                    </p>
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 🌅 17h (prévoir 3h avant coucher de soleil)
                      · {visitsDuJour.length} visite{visitsDuJour.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Cartes visiteurs du jour */}
                <div className="space-y-2 pl-4 border-l-2 border-gray-100 ml-7">
                  {visitsDuJour.map(v => {
                    const ap = Array.isArray(v.apporteur) ? v.apporteur[0] : v.apporteur
                    const apAlt = Array.isArray(v.prospect?.apporteur) ? v.prospect.apporteur[0] : v.prospect?.apporteur
                    const apporteur = ap || apAlt
                    return (
                      <Card key={v.id} className={cn(isToday && 'border-amber-200 bg-amber-50/30')}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-[#1A3C6E]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-[#1A3C6E]">
                                  {v.prospect?.prenom?.[0]}{v.prospect?.nom?.[0]}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <Link href={`/prospects/${v.prospect_id}`}>
                                  <p className="font-semibold text-[#1A3C6E] hover:underline truncate">
                                    {v.prospect?.prenom} {v.prospect?.nom}
                                  </p>
                                </Link>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                                  {apporteur && (
                                    <span>🤝 {apporteur.prenom} {apporteur.nom}</span>
                                  )}
                                  {v.prospect?.budget_estime && (
                                    <span className="text-[#C8973A] font-medium">{formatCurrency(v.prospect.budget_estime)}</span>
                                  )}
                                  {v.prospect?.telephone && (
                                    <span>📞 {v.prospect.telephone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUT_COLORS[v.statut])}>
                                {STATUT_LABELS[v.statut]}
                              </span>
                              {v.statut === 'confirmee' && (
                                <>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" disabled={loading === v.id} onClick={() => handleRealise(v.id)}>
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Réalisée
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 h-7 text-xs" disabled={loading === v.id} onClick={() => handleAnnuler(v.id)}>
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Annuler
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Historique */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-300 rounded-full" />
            Historique
          </h2>
          {past.flatMap(date => grouped[date]).map(v => {
            const ap = Array.isArray(v.apporteur) ? v.apporteur[0] : v.apporteur
            const apAlt = Array.isArray(v.prospect?.apporteur) ? v.prospect.apporteur[0] : v.prospect?.apporteur
            const apporteur = ap || apAlt
            const dateFormatted = new Date(v.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            })
            return (
              <Card key={v.id} className="opacity-70">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[52px]">
                        <p className="text-xs text-gray-400 capitalize">{dateFormatted}</p>
                        <p className="text-xs text-gray-400">17h00</p>
                      </div>
                      <div>
                        <Link href={`/prospects/${v.prospect_id}`}>
                          <p className="font-medium text-sm text-gray-700 hover:underline">
                            {v.prospect?.prenom} {v.prospect?.nom}
                          </p>
                        </Link>
                        {apporteur && (
                          <p className="text-xs text-gray-400">🤝 {apporteur.prenom} {apporteur.nom}</p>
                        )}
                      </div>
                    </div>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUT_COLORS[v.statut])}>
                      {STATUT_LABELS[v.statut]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {visites.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucune visite planifiée</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
