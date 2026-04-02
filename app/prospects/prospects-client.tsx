'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  formatCurrency, formatDate,
  PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS, CRM_ETAPES,
} from '@/lib/utils'
import type { Prospect, Lot, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Search, ChevronRight, User } from 'lucide-react'

interface ProspectsClientProps {
  prospects: Prospect[]
  lots: Lot[]
  role: UserRole
}

const ALL_STATUTS = ['tous', ...Object.keys(PROSPECT_STATUT_LABELS)] as const

export function ProspectsClient({ prospects, role }: ProspectsClientProps) {
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')

  const filtered = prospects.filter(p => {
    const matchSearch = search === '' ||
      `${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || p.statut === filterStatut
    return matchSearch && matchStatut
  })

  // Pipeline counts
  const pipelineCounts = CRM_ETAPES.reduce((acc, e) => {
    acc[e.value] = prospects.filter(p => p.statut === e.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Prospects CRM</h1>
          <p className="text-sm text-gray-500 mt-1">{prospects.length} prospect(s) au total</p>
        </div>
      </div>

      {/* Pipeline visuel */}
      <div className="grid grid-cols-7 gap-2">
        {CRM_ETAPES.map((etape, i) => (
          <button
            key={etape.value}
            onClick={() => setFilterStatut(filterStatut === etape.value ? 'tous' : etape.value)}
            className={cn(
              'relative text-center p-3 rounded-xl border-2 transition-all cursor-pointer',
              filterStatut === etape.value
                ? 'border-[#1A3C6E] bg-[#1A3C6E] text-white'
                : 'border-gray-200 bg-white hover:border-[#1A3C6E]/40'
            )}
          >
            <div className={cn(
              'text-xs font-medium mb-1',
              filterStatut === etape.value ? 'text-white/70' : 'text-gray-400'
            )}>
              Étape {i + 1}
            </div>
            <div className={cn(
              'text-2xl font-bold',
              filterStatut === etape.value ? 'text-white' : 'text-[#1A3C6E]'
            )}>
              {pipelineCounts[etape.value] || 0}
            </div>
            <div className={cn(
              'text-[10px] mt-1 leading-tight',
              filterStatut === etape.value ? 'text-white/80' : 'text-gray-500'
            )}>
              {etape.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un prospect..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(PROSPECT_STATUT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterStatut !== 'tous' && (
          <Button variant="outline" size="sm" onClick={() => setFilterStatut('tous')}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              Aucun prospect trouvé
            </CardContent>
          </Card>
        ) : (
          filtered.map(p => (
            <Link key={p.id} href={`/prospects/${p.id}`}>
              <Card className="hover:border-[#1A3C6E]/30 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1A3C6E]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#1A3C6E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1A3C6E]">{p.prenom} {p.nom}</p>
                          {(p.budget_estime || 0) >= 5_000_000 && (
                            <Badge variant="orange" className="text-[10px]">≥ 5M</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {p.email} · {p.ville ? `${p.ville}, ` : ''}{p.pays}
                          {p.apporteur && ` · Apporteur : ${(p.apporteur as {prenom:string;nom:string}).prenom} ${(p.apporteur as {prenom:string;nom:string}).nom}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {p.budget_estime && (
                        <span className="text-sm font-medium text-gray-600 hidden xl:block">
                          {formatCurrency(p.budget_estime)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 hidden lg:block">{formatDate(p.created_at)}</span>
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PROSPECT_STATUT_COLORS[p.statut])}>
                        {PROSPECT_STATUT_LABELS[p.statut]}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
