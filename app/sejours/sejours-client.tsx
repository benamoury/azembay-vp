'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, LOT_TYPE_LABELS } from '@/lib/utils'
import type { Sejour } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Hotel, CheckCircle } from 'lucide-react'
import { confirmerSejour } from '@/actions/sejours'

interface SejoursClientProps {
  sejours: Sejour[]
  lots: { id: string; reference: string; type: string }[]
  managerId: string
}

const STATUT_COLORS: Record<string, string> = {
  demande: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  realise: 'bg-blue-100 text-blue-700',
  annule: 'bg-red-100 text-red-700',
}

const STATUT_LABELS: Record<string, string> = {
  demande: 'Demandé',
  confirme: 'Confirmé',
  realise: 'Réalisé',
  annule: 'Annulé',
}

export function SejoursClient({ sejours: initSejours, lots }: SejoursClientProps) {
  const [sejours, setSejours] = useState(initSejours)
  const { toast } = useToast()

  async function handleConfirmer(sejourId: string, lotId: string) {
    const result = await confirmerSejour(sejourId, lotId)
    if (result.success) {
      setSejours(prev => prev.map(s => s.id === sejourId ? { ...s, statut: 'confirme', lot_assigne_id: lotId } : s))
      toast({ title: 'Séjour confirmé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  const demandesSejours = sejours.filter(s => s.statut === 'demande')
  const sejoursConfirmes = sejours.filter(s => s.statut === 'confirme')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Séjours test</h1>
        <p className="text-sm text-gray-500 mt-1">{sejours.length} séjour(s) · {demandesSejours.length} en attente</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Demandes en attente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">
              Demandes en attente ({demandesSejours.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {demandesSejours.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune demande en attente</p>
            ) : (
              <div className="space-y-4">
                {demandesSejours.map(s => {
                  const p = s.prospect as { nom: string; prenom: string } | undefined
                  return (
                    <div key={s.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{p?.prenom} {p?.nom}</p>
                          <p className="text-xs text-gray-400">
                            {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                            <span className="ml-2">{s.nb_adultes}A {s.nb_enfants > 0 ? `+ ${s.nb_enfants}E` : ''}</span>
                          </p>
                        </div>
                        <Badge variant="orange">Demandé</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Select onValueChange={(lotId) => handleConfirmer(s.id, lotId)}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Assigner un lot..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lots.map(l => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.reference} — {LOT_TYPE_LABELS[l.type as keyof typeof LOT_TYPE_LABELS]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Séjours confirmés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">
              Séjours confirmés ({sejoursConfirmes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sejoursConfirmes.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun séjour confirmé</p>
            ) : (
              <div className="space-y-2">
                {sejoursConfirmes.map(s => {
                  const p = s.prospect as { nom: string; prenom: string } | undefined
                  const lot = s.lot_assigne as { reference: string } | undefined
                  return (
                    <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{p?.prenom} {p?.nom}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                          {lot && <span className="ml-2 font-mono">{lot.reference}</span>}
                        </p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
