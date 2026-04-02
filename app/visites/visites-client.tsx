'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Visite } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { Calendar, CheckCircle, XCircle, Star } from 'lucide-react'
import { confirmerVisiteManager, annulerVisite } from '@/actions/visites'

const STATUT_LABELS: Record<string, string> = {
  demandee: 'Demandée',
  confirmee_manager: 'Confirmée — En attente sécurité',
  confirmee_securite: 'Confirmée sécurité',
  realisee: 'Réalisée',
  annulee: 'Annulée',
}

const STATUT_COLORS: Record<string, string> = {
  demandee: 'bg-yellow-100 text-yellow-700',
  confirmee_manager: 'bg-blue-100 text-blue-700',
  confirmee_securite: 'bg-green-100 text-green-700',
  realisee: 'bg-gray-100 text-gray-600',
  annulee: 'bg-red-100 text-red-600',
}

type VisiteWithRelations = Visite & {
  prospect: { nom: string; prenom: string; email: string; telephone?: string; budget_estime?: number }
  jour: { date: string; prioritaire: boolean }
}

export function VisitesClient({ visites: initialVisites, userId }: { visites: VisiteWithRelations[]; userId: string }) {
  const [visites, setVisites] = useState(initialVisites)
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleConfirmer(id: string) {
    setLoading(id)
    const result = await confirmerVisiteManager(id)
    if (result.success) {
      setVisites(prev => prev.map(v => v.id === id ? { ...v, statut: 'confirmee_manager' } : v))
      toast({ title: '✓ Visite confirmée', description: 'En attente de confirmation sécurité.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  async function handleAnnuler(id: string) {
    setLoading(id)
    const result = await annulerVisite(id)
    if (result.success) {
      setVisites(prev => prev.map(v => v.id === id ? { ...v, statut: 'annulee' } : v))
      toast({ title: 'Visite annulée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  const pending = visites.filter(v => v.statut === 'demandee')
  const confirmed = visites.filter(v => ['confirmee_manager', 'confirmee_securite'].includes(v.statut))
  const past = visites.filter(v => ['realisee', 'annulee'].includes(v.statut))

  function VisiteCard({ v }: { v: VisiteWithRelations }) {
    const dateFormatted = new Date(v.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    return (
      <Card key={v.id} className={cn(v.statut === 'demandee' ? 'border-yellow-300' : '')}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-[#1A3C6E]/5 rounded-lg p-2 flex flex-col items-center min-w-[52px]">
                {v.jour?.prioritaire && <Star className="w-3 h-3 text-[#C8973A] fill-[#C8973A]" />}
                <Calendar className="w-4 h-4 text-[#1A3C6E]" />
              </div>
              <div>
                <p className="font-semibold text-[#1A3C6E]">{v.prospect?.prenom} {v.prospect?.nom}</p>
                <p className="text-sm text-gray-500 capitalize">{dateFormatted}</p>
                {v.prospect?.budget_estime && (
                  <p className="text-xs text-[#C8973A] font-medium">{formatCurrency(v.prospect.budget_estime)}</p>
                )}
                {v.notes_apporteur && (
                  <p className="text-xs text-gray-400 mt-0.5">Note : {v.notes_apporteur}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUT_COLORS[v.statut])}>
                {STATUT_LABELS[v.statut]}
              </span>
              {v.statut === 'demandee' && (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading === v.id} onClick={() => handleConfirmer(v.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Confirmer
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" disabled={loading === v.id} onClick={() => handleAnnuler(v.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Annuler
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Gestion des visites</h1>
        <p className="text-sm text-gray-500 mt-1">{visites.filter(v => v.statut !== 'annulee').length} visite(s) planifiées</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            En attente de confirmation ({pending.length})
          </h2>
          {pending.map(v => <VisiteCard key={v.id} v={v} />)}
        </div>
      )}

      {confirmed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Confirmées ({confirmed.length})
          </h2>
          {confirmed.map(v => <VisiteCard key={v.id} v={v} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-300 rounded-full" />
            Historique ({past.length})
          </h2>
          {past.map(v => <VisiteCard key={v.id} v={v} />)}
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
