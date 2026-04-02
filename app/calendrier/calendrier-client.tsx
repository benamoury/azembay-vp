'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { JourDisponible, Sejour } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Calendar, Star, Clock, Hotel, AlertCircle, PlusCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { soumettreSejourDemande } from '@/actions/sejours'
import { useRouter } from 'next/navigation'

interface CalendrierClientProps {
  jours: JourDisponible[]
  sejours: Sejour[]
  weekends: { id: string; date_vendredi: string; date_samedi: string; statut: string; nb_sejours_confirmes: number; seuil_guests: number }[]
  prospects: { id: string; nom: string; prenom: string; statut: string }[]
  apporteurId: string
  quotaUsed: number
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
  no_show: { label: 'No-show', color: 'bg-red-100 text-red-700' },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
}

const QUOTA_MAX = 6

export function CalendrierClient({ jours, sejours, weekends, prospects, apporteurId, quotaUsed }: CalendrierClientProps) {
  const today = new Date().toISOString().split('T')[0]
  const [showSejourDialog, setShowSejourDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sejourForm, setSejourForm] = useState({
    prospect_id: '',
    nb_adultes: 2,
    nb_enfants: 0,
    date_souhaitee_1: '',
    date_souhaitee_2: '',
    date_souhaitee_3: '',
    notes: '',
  })
  const { toast } = useToast()
  const router = useRouter()

  const quotaRestant = QUOTA_MAX - quotaUsed

  async function handleSoumettreSejourDemande(e: React.FormEvent) {
    e.preventDefault()
    if (!sejourForm.prospect_id || !sejourForm.date_souhaitee_1 || !sejourForm.date_souhaitee_2 || !sejourForm.date_souhaitee_3) return

    setLoading(true)
    const result = await soumettreSejourDemande({
      prospect_id: sejourForm.prospect_id,
      nb_adultes: sejourForm.nb_adultes,
      nb_enfants: sejourForm.nb_enfants,
      date_souhaitee_1: sejourForm.date_souhaitee_1,
      date_souhaitee_2: sejourForm.date_souhaitee_2,
      date_souhaitee_3: sejourForm.date_souhaitee_3,
      notes_apporteur: sejourForm.notes || undefined,
    })

    if (result.success) {
      setShowSejourDialog(false)
      toast({ title: 'Demande de séjour soumise', description: 'Le manager va traiter votre demande.' })
      router.refresh()
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Calendrier des visites</h1>
          <p className="text-sm text-gray-500 mt-1">Dates disponibles — Golden Hour 2026</p>
        </div>
        {prospects.length > 0 && quotaRestant > 0 && (
          <Button onClick={() => setShowSejourDialog(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Demander un séjour test
          </Button>
        )}
      </div>

      {/* Quota badge */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm',
        quotaRestant === 0 ? 'bg-red-50 text-red-700 border border-red-200' :
        quotaRestant <= 2 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
        'bg-green-50 text-green-700 border border-green-200'
      )}>
        <Hotel className="w-4 h-4" />
        <span>Quota séjours : <strong>{quotaUsed}/{QUOTA_MAX}</strong> utilisés</span>
        {quotaRestant === 0 && <span className="ml-2 font-medium">— Quota atteint</span>}
        {quotaRestant > 0 && <span className="ml-1 text-xs opacity-70">({quotaRestant} place{quotaRestant > 1 ? 's' : ''} restante{quotaRestant > 1 ? 's' : ''})</span>}
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
                    const dayLabel = `${DAY_FR[d.getDay()]} ${d.getDate()}`
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
                        <span className="font-semibold">{dayLabel}</span>
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

      {/* Weekends disponibles pour séjours */}
      {weekends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] flex items-center gap-2 text-sm">
              <Hotel className="w-4 h-4 text-[#C8973A]" />
              Weekends disponibles — The Owners' Club
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {weekends.map(w => {
                const pct = (w.nb_sejours_confirmes / w.seuil_guests) * 100
                return (
                  <div key={w.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-[#1A3C6E]">{formatDate(w.date_vendredi)}</p>
                    <p className="text-gray-500 mt-0.5">Vendredi → Dimanche (2 nuits)</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div className="h-full bg-[#C8973A] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-gray-400">{w.nb_sejours_confirmes}/{w.seuil_guests}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mes séjours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A3C6E]">Mes séjours ({sejours.length})</CardTitle>
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
                          {s.date_souhaitee_1 && s.statut === 'demande'
                            ? `Choix 1 : ${formatDate(s.date_souhaitee_1)}`
                            : `${formatDate(s.date_arrivee)} → ${formatDate(s.date_depart)}`
                          }
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

      {/* Dialog: Demander un séjour */}
      <Dialog open={showSejourDialog} onOpenChange={setShowSejourDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Demander un séjour test — The Owners' Club</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSoumettreSejourDemande} className="space-y-4">
            {quotaRestant <= 2 && (
              <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Il vous reste {quotaRestant} place(s) sur votre quota de {QUOTA_MAX}.
              </div>
            )}

            <div>
              <Label>Prospect</Label>
              <Select value={sejourForm.prospect_id} onValueChange={v => setSejourForm(p => ({ ...p, prospect_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un prospect..." />
                </SelectTrigger>
                <SelectContent>
                  {prospects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prenom} {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Seuls les prospects avec visite réalisée sont éligibles.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Adultes</Label>
                <Input type="number" min={1} max={10} value={sejourForm.nb_adultes} onChange={e => setSejourForm(p => ({ ...p, nb_adultes: +e.target.value }))} />
              </div>
              <div>
                <Label>Enfants (&gt;2 ans)</Label>
                <Input type="number" min={0} max={10} value={sejourForm.nb_enfants} onChange={e => setSejourForm(p => ({ ...p, nb_enfants: +e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">3 dates souhaitées (ordonnées par préférence)</p>
              <div className="space-y-2">
                {(['date_souhaitee_1', 'date_souhaitee_2', 'date_souhaitee_3'] as const).map((field, i) => (
                  <div key={field}>
                    <Label className="text-xs">
                      {i === 0 ? '🥇 1er choix' : i === 1 ? '🥈 2ème choix' : '🥉 3ème choix'}
                    </Label>
                    <Select
                      value={sejourForm[field]}
                      onValueChange={v => setSejourForm(p => ({ ...p, [field]: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Choisir un weekend..." />
                      </SelectTrigger>
                      <SelectContent>
                        {weekends.map(w => (
                          <SelectItem key={w.id} value={w.date_vendredi}>
                            {formatDate(w.date_vendredi)} · {w.nb_sejours_confirmes}/{w.seuil_guests} familles
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={sejourForm.notes}
                onChange={e => setSejourForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Informations particulières pour le manager..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowSejourDialog(false)}>Annuler</Button>
              <Button
                type="submit"
                disabled={loading || !sejourForm.prospect_id || !sejourForm.date_souhaitee_1 || !sejourForm.date_souhaitee_2 || !sejourForm.date_souhaitee_3}
              >
                Soumettre la demande
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
