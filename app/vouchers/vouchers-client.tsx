'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import type { Voucher, WeekendActif } from '@/lib/types'
import { cn, VOUCHER_STATUT_COLORS, VOUCHER_STATUT_LABELS } from '@/lib/utils'
import { Ticket, Star, Calendar } from 'lucide-react'

interface VouchersClientProps {
  vouchers: Voucher[]
  weekends: WeekendActif[]
}

const MONTHS = ['Avril 2026', 'Mai 2026', 'Juin 2026']

export function VouchersClient({ vouchers, weekends }: VouchersClientProps) {
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
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Vouchers</h1>
          <p className="text-sm text-gray-500 mt-1">{vouchers.length} voucher(s) total · {vouchersActifs.length} actifs</p>
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
            Calendrier Golden Hour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {MONTHS.map((month, mi) => {
              const monthWeekends = weekends.filter(w => {
                const d = new Date(w.date_vendredi)
                return d.getMonth() === 3 + mi // avril=3, mai=4, juin=5
              })
              return (
                <div key={month}>
                  <h3 className="text-sm font-semibold text-[#1A3C6E] mb-2">{month}</h3>
                  <div className="space-y-1">
                    {monthWeekends.map(w => (
                      <div
                        key={w.id}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg text-xs border',
                          w.notes?.includes('PRIORITAIRE')
                            ? 'bg-[#C8973A]/10 border-[#C8973A]/40 text-[#8B6420]'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {w.notes?.includes('PRIORITAIRE') && (
                            <Star className="w-3 h-3 text-[#C8973A] fill-[#C8973A]" />
                          )}
                          <span>{formatDate(w.date_vendredi)} – {formatDate(w.date_samedi)}</span>
                        </div>
                        <span className="font-medium">{w.nb_guests_confirmes}/{w.seuil_guests}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Star className="w-3 h-3 text-[#C8973A] fill-[#C8973A]" />
            Dates prioritaires (badge or) : 17-18 avril, 29-30 avril, 15-16 mai, 28-29 mai, 10-11 juin
          </p>
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
