'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import type { Voucher, JourDisponible } from '@/lib/types'
import { cn, VOUCHER_STATUT_COLORS, VOUCHER_STATUT_LABELS } from '@/lib/utils'
import { Ticket, Star, Calendar } from 'lucide-react'

interface VouchersClientProps {
  vouchers: Voucher[]
  jours: JourDisponible[]
}

const MONTHS = [
  { label: 'Avril 2026', month: 3 },
  { label: 'Mai 2026', month: 4 },
  { label: 'Juin 2026', month: 5 },
]

const DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function formatDayShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAY_FR[d.getDay()]} ${d.getDate()}`
}

export function VouchersClient({ vouchers, jours }: VouchersClientProps) {
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const filtered = vouchers.filter(v => {
    if (!search) return true
    const p = v.prospect as {nom:string;prenom:string} | undefined
    return `${p?.prenom} ${p?.nom} ${v.numero_voucher}`.toLowerCase().includes(search.toLowerCase())
  })

  const vouchersToday = vouchers.filter(v => v.date_visite === today && v.statut === 'emis')
  const vouchersActifs = vouchers.filter(v => v.statut === 'emis')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Vouchers & Calendrier</h1>
          <p className="text-sm text-gray-500 mt-1">{vouchers.length} voucher(s) · {vouchersActifs.length} actifs</p>
        </div>
      </div>

      {/* Today KPI */}
      {vouchersToday.length > 0 && (
        <Card className="border-[#C8973A]/40 bg-[#C8973A]/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-[#C8973A]" />
              <div>
                <p className="font-semibold text-[#1A3C6E]">{vouchersToday.length} visite(s) aujourd'hui</p>
                <p className="text-xs text-gray-500">
                  {vouchersToday.map(v => {
                    const p = v.prospect as {prenom:string;nom:string} | undefined
                    return `${p?.prenom} ${p?.nom} (${v.heure_visite?.slice(0,5)})`
                  }).join(' · ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendrier Golden Hour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C8973A]" />
            Calendrier des visites — Golden Hour 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {MONTHS.map(({ label, month }) => {
              const monthJours = jours.filter(j => new Date(j.date + 'T00:00:00').getMonth() === month)
              return (
                <div key={label}>
                  <h3 className="text-sm font-bold text-[#1A3C6E] mb-3 pb-1 border-b">{label}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {monthJours.map(j => {
                      const full = (j.nb_visites ?? 0) >= j.capacite
                      const isPast = j.date < today
                      return (
                        <div
                          key={j.id}
                          title={`${(j.nb_visites ?? 0)}/${j.capacite} visite(s)${j.prioritaire ? ' — Date prioritaire' : ''}`}
                          className={cn(
                            'flex flex-col items-center px-2 py-1.5 rounded-lg text-xs border min-w-[44px] cursor-default',
                            isPast
                              ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                              : full
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : j.prioritaire
                              ? 'bg-[#C8973A]/10 border-[#C8973A]/50 text-[#8B6420]'
                              : 'bg-green-50 border-green-200 text-green-700'
                          )}
                        >
                          {j.prioritaire && !isPast && (
                            <Star className="w-2.5 h-2.5 text-[#C8973A] fill-[#C8973A] mb-0.5" />
                          )}
                          <span className="font-semibold">{formatDayShort(j.date)}</span>
                          <span className="text-[10px] mt-0.5 opacity-80">
                            {j.nb_visites ?? 0}/{j.capacite}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#C8973A]/20 border border-[#C8973A]/50 inline-block" /> Prioritaire</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Complet (2/2)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" /> Passé</span>
          </div>
        </CardContent>
      </Card>

      {/* Search + list */}
      <div className="space-y-3">
        <Input
          placeholder="Rechercher un voucher ou prospect..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <div className="space-y-2">
          {filtered.map(v => {
            const p = v.prospect as {nom:string;prenom:string} | undefined
            const ap = v.apporteur as {nom:string;prenom:string} | undefined
            return (
              <Card key={v.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Ticket className="w-4 h-4 text-[#C8973A]" />
                      <div>
                        <p className="text-sm font-medium">
                          {p?.prenom} {p?.nom}
                          <span className="text-gray-400 font-mono text-xs ml-2">{v.numero_voucher}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(v.date_visite)} à {v.heure_visite?.slice(0,5)}
                          {ap && ` · ${ap.prenom} ${ap.nom}`}
                        </p>
                      </div>
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full', VOUCHER_STATUT_COLORS[v.statut])}>
                      {VOUCHER_STATUT_LABELS[v.statut]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun voucher trouvé</p>
          )}
        </div>
      </div>
    </div>
  )
}
