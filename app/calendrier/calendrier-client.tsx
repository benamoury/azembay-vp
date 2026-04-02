'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { JourDisponible, Sejour } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Calendar, Star, Clock } from 'lucide-react'

interface CalendrierClientProps {
  jours: JourDisponible[]
  sejours: Sejour[]
  apporteurId: string
}

const MONTHS = [
  { label: 'Avril 2026', month: 3 },
  { label: 'Mai 2026', month: 4 },
  { label: 'Juin 2026', month: 5 },
]

const DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const SEJOUR_STATUT: Record<string, { label: string; color: string }> = {
  demande: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  confirme: { label: 'Confirmé', color: 'bg-green-100 text-green-700' },
  realise: { label: 'Réalisé', color: 'bg-blue-100 text-blue-700' },
  annule: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
}

export function CalendrierClient({ jours, sejours }: CalendrierClientProps) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Calendrier des visites</h1>
        <p className="text-sm text-gray-500 mt-1">Dates disponibles — Golden Hour 2026</p>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-[#C8973A] fill-[#C8973A]" />
          <span>Date prioritaire Golden Hour</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />
          <span>Complet</span>
        </div>
      </div>

      {/* Calendrier par mois */}
      <div className="grid grid-cols-3 gap-6">
        {MONTHS.map(({ label, month }) => {
          const monthJours = jours.filter(j => new Date(j.date + 'T00:00:00').getMonth() === month)
          return (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1A3C6E] flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#C8973A]" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {monthJours.map(j => {
                    const full = (j.nb_visites ?? 0) >= j.capacite
                    const isPast = j.date < today
                    const d = new Date(j.date + 'T00:00:00')
                    const label2 = `${DAY_FR[d.getDay()]} ${d.getDate()}`
                    return (
                      <div
                        key={j.id}
                        title={`${(j.nb_visites ?? 0)}/${j.capacite} visite(s)`}
                        className={cn(
                          'flex flex-col items-center px-2 py-1.5 rounded-lg text-xs border min-w-[42px]',
                          isPast ? 'opacity-50 bg-gray-50 border-gray-200 text-gray-400' :
                          full ? 'bg-red-50 border-red-200 text-red-500' :
                          j.prioritaire ? 'bg-[#C8973A]/10 border-[#C8973A]/40 text-[#8B6420]' :
                          'bg-green-50 border-green-200 text-green-700'
                        )}
                      >
                        {j.prioritaire && !isPast && <Star className="w-2.5 h-2.5 text-[#C8973A] fill-[#C8973A]" />}
                        <span className="font-semibold">{label2}</span>
                        <span className="opacity-70 text-[10px]">{j.nb_visites ?? 0}/{j.capacite}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
