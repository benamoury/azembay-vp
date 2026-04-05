'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, LOT_TYPE_LABELS, SEJOUR_STATUT_COLORS, SEJOUR_STATUT_LABELS, WEEKEND_STATUT_COLORS, WEEKEND_STATUT_LABELS } from '@/lib/utils'
import type { Sejour } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Hotel, CheckCircle, XCircle, AlertTriangle, DollarSign, Calendar } from 'lucide-react'
import {
  confirmerSejour, declarerNoShow, confirmerRecouvrement,
  marquerSejourRealise, annulerSejour, validerWeekend,
} from '@/actions/sejours'

interface SejoursClientProps {
  sejours: Sejour[]
  lots: { id: string; reference: string; type: string; statut: string; adultes_max?: number; enfants_max?: number }[]
  weekends: { id: string; date_vendredi: string; date_samedi: string; date_dimanche?: string; statut: string; nb_sejours_confirmes: number; seuil_guests: number }[]
  factures: { id: string; sejour_id: string; numero_facture?: string; montant_ttc: number; statut: string }[]
  managerId: string
}

export function SejoursClient({ sejours: initSejours, lots, weekends, factures, managerId }: SejoursClientProps) {
  const [sejours, setSejours] = useState(initSejours)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedSejour, setSelectedSejour] = useState<Sejour | null>(null)
  const [confirmData, setConfirmData] = useState({ weekend_id: '' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'demandes' | 'confirmes' | 'noshow' | 'weekends'>('demandes')
  const { toast } = useToast()

  const demandesSejours = sejours.filter(s => s.statut === 'demande')
  const sejoursConfirmes = sejours.filter(s => s.statut === 'confirme')
  const sejoursNoShow = sejours.filter(s => s.statut === 'no_show')
  const sejoursRealises = sejours.filter(s => s.statut === 'realise')

  function openConfirmDialog(sejour: Sejour) {
    setSelectedSejour(sejour)
    setConfirmData({ weekend_id: '' })
    setShowConfirmDialog(true)
  }

  async function handleConfirmer(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSejour || !confirmData.weekend_id) return
    setLoading(true)

    const weekend = weekends.find(w => w.id === confirmData.weekend_id)
    if (!weekend) return

    const result = await confirmerSejour(selectedSejour.id, {
      weekend_id: confirmData.weekend_id,
      date_arrivee: weekend.date_vendredi,
      date_depart: weekend.date_dimanche || (() => {
        const d = new Date(weekend.date_samedi + 'T00:00:00')
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
      })(),
    })

    if (result.success) {
      setSejours(prev => prev.map(s => s.id === selectedSejour.id
        ? { ...s, statut: 'confirme', weekend_id: confirmData.weekend_id }
        : s
      ))
      setShowConfirmDialog(false)
      toast({ title: 'Séjour confirmé — Voucher envoyé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleNoShow(sejourId: string) {
    setLoading(true)
    const result = await declarerNoShow(sejourId, managerId)
    if (result.success) {
      setSejours(prev => prev.map(s => s.id === sejourId ? { ...s, statut: 'no_show', noshow: true, facture_envoyee: true } : s))
      toast({ title: 'No-show déclaré — Facture envoyée au client' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleRecouvrement(sejourId: string) {
    setLoading(true)
    const result = await confirmerRecouvrement(sejourId, managerId)
    if (result.success) {
      setSejours(prev => prev.map(s => s.id === sejourId ? { ...s, recouvre: true } : s))
      toast({ title: 'Recouvrement confirmé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleRealise(sejourId: string) {
    setLoading(true)
    const result = await marquerSejourRealise(sejourId)
    if (result.success) {
      setSejours(prev => prev.map(s => s.id === sejourId ? { ...s, statut: 'realise' } : s))
      toast({ title: 'Séjour marqué réalisé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleAnnuler(sejourId: string) {
    setLoading(true)
    const result = await annulerSejour(sejourId)
    if (result.success) {
      setSejours(prev => prev.map(s => s.id === sejourId ? { ...s, statut: 'annule' } : s))
      toast({ title: 'Séjour annulé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleConfirmerWeekend(weekendId: string) {
    setLoading(true)
    const result = await validerWeekend(weekendId)
    if (result.success) {
      toast({ title: 'Weekend confirmé — The Owners\' Club' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  const tabs = [
    { key: 'demandes', label: `Demandes (${demandesSejours.length})` },
    { key: 'confirmes', label: `Confirmés (${sejoursConfirmes.length})` },
    { key: 'noshow', label: `No-show (${sejoursNoShow.length})` },
    { key: 'weekends', label: `Weekends (${weekends.length})` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Séjours test</h1>
        <p className="text-sm text-gray-500 mt-1">
          {sejours.length} séjour(s) · {demandesSejours.length} en attente · {sejoursRealises.length} réalisé(s)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-white text-[#1A3C6E] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Demandes */}
      {activeTab === 'demandes' && (
        <div className="space-y-4">
          {demandesSejours.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">Aucune demande en attente</CardContent></Card>
          ) : (
            demandesSejours.map(s => {
              const p = s.prospect as { nom: string; prenom: string; email?: string } | undefined
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#1A3C6E]">{p?.prenom} {p?.nom}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.nb_adultes} adulte(s) · {(s.nb_enfants_plus_6 ?? 0) + (s.nb_enfants_moins_6 ?? 0)} enfant(s)
                        </p>
                        <div className="mt-2 space-y-0.5">
                          {s.date_souhaitee_1 && (
                            <p className="text-xs text-gray-600">🥇 Choix 1 : {formatDate(s.date_souhaitee_1)}</p>
                          )}
                          {s.date_souhaitee_2 && (
                            <p className="text-xs text-gray-500">🥈 Choix 2 : {formatDate(s.date_souhaitee_2)}</p>
                          )}
                          {s.date_souhaitee_3 && (
                            <p className="text-xs text-gray-400">🥉 Choix 3 : {formatDate(s.date_souhaitee_3)}</p>
                          )}
                        </div>
                        {s.notes_manager && (
                          <p className="text-xs text-gray-400 mt-2 italic">"{s.notes_manager}"</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openConfirmDialog(s)} disabled={loading}>
                          <Hotel className="w-3.5 h-3.5 mr-1" /> Assigner
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleAnnuler(s.id)} disabled={loading}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Confirmés */}
      {activeTab === 'confirmes' && (
        <div className="space-y-3">
          {sejoursConfirmes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">Aucun séjour confirmé</CardContent></Card>
          ) : (
            sejoursConfirmes.map(s => {
              const p = s.prospect as { nom: string; prenom: string } | undefined
              const lot = s.stock_hebergement as { reference: string } | undefined
              const isPast = s.date_depart < new Date().toISOString().split('T')[0]
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p?.prenom} {p?.nom}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                          {lot && <span className="ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{lot.reference}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isPast && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => handleRealise(s.id)} disabled={loading}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Réalisé
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleNoShow(s.id)} disabled={loading}>
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> No-show
                            </Button>
                          </>
                        )}
                        {!isPast && (
                          <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => handleAnnuler(s.id)} disabled={loading}>
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* No-shows */}
      {activeTab === 'noshow' && (
        <div className="space-y-3">
          {sejoursNoShow.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">Aucun no-show</CardContent></Card>
          ) : (
            sejoursNoShow.map(s => {
              const p = s.prospect as { nom: string; prenom: string } | undefined
              const facture = factures.find(f => f.sejour_id === s.id)
              const joursDepuis = s.noshow_declared_at
                ? Math.floor((Date.now() - new Date(s.noshow_declared_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0
              return (
                <Card key={s.id} className={cn('border', s.recouvre ? 'border-green-200 bg-green-50/30' : joursDepuis >= 23 ? 'border-red-200 bg-red-50/30' : joursDepuis >= 15 ? 'border-orange-200 bg-orange-50/30' : '')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{p?.prenom} {p?.nom}</p>
                        <p className="text-xs text-gray-400">
                          Séjour du {formatDate(s.date_arrivee)} — No-show J+{joursDepuis}
                        </p>
                        {facture && (
                          <p className="text-xs mt-1">
                            <span className="text-gray-500">Facture {facture.numero_facture}</span>
                            {' — '}
                            <span className={cn('font-medium', facture.statut === 'payee' ? 'text-green-600' : 'text-orange-600')}>
                              {facture.statut === 'payee' ? 'Payée' : `${new Intl.NumberFormat('fr-MA').format(facture.montant_ttc)} MAD — En attente`}
                            </span>
                          </p>
                        )}
                        {!s.recouvre && joursDepuis > 0 && (
                          <p className={cn('text-xs mt-1 font-medium', joursDepuis >= 28 ? 'text-red-600' : joursDepuis >= 23 ? 'text-orange-500' : 'text-gray-400')}>
                            {30 - joursDepuis} jour(s) avant libération automatique du lot
                          </p>
                        )}
                        {s.recouvre && <p className="text-xs mt-1 text-green-600 font-medium">✓ Recouvrement confirmé</p>}
                      </div>
                      <div className="flex gap-2">
                        {!s.recouvre && (
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => handleRecouvrement(s.id)} disabled={loading}>
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Recouvrement confirmé
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Weekends */}
      {activeTab === 'weekends' && (
        <div className="space-y-3">
          {weekends.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400">Aucun weekend ouvert</CardContent></Card>
          ) : (
            weekends.map(w => {
              const sejoursWeekend = sejours.filter(s => s.weekend_id === w.id && s.statut !== 'annule')
              const pct = w.seuil_guests > 0 ? (w.nb_sejours_confirmes / w.seuil_guests) * 100 : 0
              return (
                <Card key={w.id} className={cn('border', w.statut === 'valide' ? 'border-blue-200 bg-blue-50/30' : w.statut === 'complet' ? 'border-orange-200' : '')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-[#C8973A]" />
                          <p className="font-semibold text-[#1A3C6E]">
                            Vendredi {formatDate(w.date_vendredi)} → Dimanche
                          </p>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', WEEKEND_STATUT_COLORS[w.statut as keyof typeof WEEKEND_STATUT_COLORS])}>
                            {WEEKEND_STATUT_LABELS[w.statut as keyof typeof WEEKEND_STATUT_LABELS]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-full bg-[#1A3C6E] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {w.nb_sejours_confirmes}/{w.seuil_guests} familles
                          </span>
                        </div>
                        {sejoursWeekend.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {sejoursWeekend.map(s => {
                              const p = s.prospect as { nom: string; prenom: string } | undefined
                              return (
                                <div key={s.id} className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className={cn('w-2 h-2 rounded-full', SEJOUR_STATUT_COLORS[s.statut as keyof typeof SEJOUR_STATUT_COLORS].split(' ')[0])} />
                                  {p?.prenom} {p?.nom}
                                  <span className="text-gray-400">— {SEJOUR_STATUT_LABELS[s.statut as keyof typeof SEJOUR_STATUT_LABELS]}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {w.statut === 'ouvert' && (
                        <Button size="sm" onClick={() => handleConfirmerWeekend(w.id)} disabled={loading}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider weekend
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Dialog: Assigner lot + weekend */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le séjour</DialogTitle>
          </DialogHeader>
          {selectedSejour && (
            <form onSubmit={handleConfirmer} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">
                  {(selectedSejour.prospect as { prenom: string; nom: string } | undefined)?.prenom}{' '}
                  {(selectedSejour.prospect as { prenom: string; nom: string } | undefined)?.nom}
                </p>
                <p className="text-gray-500">{selectedSejour.nb_adultes} adulte(s) · {(selectedSejour.nb_enfants_plus_6 ?? 0) + (selectedSejour.nb_enfants_moins_6 ?? 0)} enfant(s)</p>
                {selectedSejour.date_souhaitee_1 && (
                  <p className="text-gray-500 mt-1">
                    Préférences : {formatDate(selectedSejour.date_souhaitee_1)}
                    {selectedSejour.date_souhaitee_2 && ` · ${formatDate(selectedSejour.date_souhaitee_2)}`}
                    {selectedSejour.date_souhaitee_3 && ` · ${formatDate(selectedSejour.date_souhaitee_3)}`}
                  </p>
                )}
              </div>

              <div>
                <Label>Weekend assigné</Label>
                <Select value={confirmData.weekend_id} onValueChange={v => setConfirmData(p => ({ ...p, weekend_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un weekend..." />
                  </SelectTrigger>
                  <SelectContent>
                    {weekends.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {formatDate(w.date_vendredi)} ({w.nb_sejours_confirmes}/{w.seuil_guests} fam.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-gray-400">L'unité d'hébergement sera assignée automatiquement selon disponibilité (FIFO).</p>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)}>Annuler</Button>
                <Button type="submit" disabled={loading || !confirmData.weekend_id}>
                  Confirmer & envoyer voucher
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
