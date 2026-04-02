'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { WeekendActif, Sejour } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Calendar, Star, CheckCircle, Clock } from 'lucide-react'

interface CalendrierClientProps {
  weekends: WeekendActif[]
  sejours: Sejour[]
  apporteurId: string
}

const MONTHS = [
  { label: 'Avril 2026', month: 3 },
  { label: 'Mai 2026', month: 4 },
  { label: 'Juin 2026', month: 5 },
]

const SEJOUR_STATUT: Record<string, { label: string; color: string }> = {
  demande: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirme: { label: 'Confirmé', color: 'bg-green-100 text-green-700' },
  realise: { label: 'Réalisé', color: 'bg-blue-100 text-blue-700' },
  annule: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
}

export function CalendrierClient({ weekends, sejours }: CalendrierClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Calendrier des visites</h1>
        <p className="text-sm text-gray-500 mt-1">Dates disponibles pour les visites et séjours test</p>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-[#C8973A] fill-[#C8973A]" />
          <span>Dates prioritaires (Golden Hour)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
          <span>Week-end disponible</span>
        </div>
      </div>

      {/* Calendrier par mois */}
      {MONTHS.map(({ label, month }) => {
        const monthWeekends = weekends.filter(w => new Date(w.date_vendredi).getMonth() === month)
        return (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C8973A]" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthWeekends.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun week-end disponible ce mois</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {monthWeekends.map(w => {
                    const isPrioritaire = w.notes?.includes('PRIORITAIRE')
                    return (
                      <div
                        key={w.id}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all',
                          isPrioritaire
                            ? 'border-[#C8973A] bg-[#C8973A]/5'
                            : 'border-gray-200 bg-gray-50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {isPrioritaire && <Star className="w-3.5 h-3.5 text-[#C8973A] fill-[#C8973A]" />}
                            <span className={cn('text-sm font-semibold', isPrioritaire ? 'text-[#8B6420]' : 'text-gray-700')}>
                              {formatDate(w.date_vendredi)} – {formatDate(w.date_samedi)}
                            </span>
                          </div>
                          <Badge variant={isPrioritaire ? 'gold' : 'gray'} className="text-[10px]">
                            {isPrioritaire ? 'Prioritaire' : 'Disponible'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <CheckCircle className="w-3 h-3" />
                          {w.nb_guests_confirmes}/{w.seuil_guests} guests confirmés
                        </div>
                        {w.notes && (
                          <p className="text-xs text-[#C8973A] mt-1">{w.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Mes séjours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E]">Mes séjours test ({sejours.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sejours.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun séjour planifié.</p>
          ) : (
            <div className="space-y-3">
              {sejours.map(s => {
                const p = s.prospect as { nom: string; prenom: string } | undefined
                const statut = SEJOUR_STATUT[s.statut] || SEJOUR_STATUT.demande
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{p?.prenom} {p?.nom}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                          <span className="ml-2">{s.nb_adultes} adulte(s)</span>
                        </p>
                      </div>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full', statut.color)}>
                      {statut.label}
                    </span>
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
