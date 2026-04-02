'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate, formatCurrency, PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS, TEMPERATURE_LABELS, TEMPERATURE_COLORS } from '@/lib/utils'
import type { Prospect, ClientNote, JourDisponible } from '@/lib/types'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Hotel, MessageSquare, Flame } from 'lucide-react'
import Link from 'next/link'
import { demanderVisite } from '@/actions/visites'
import { ajouterNote } from '@/actions/notes'

type VisiteWithJour = {
  id: string
  statut: string
  date_visite: string
  notes_apporteur?: string
  jour?: { date: string; prioritaire: boolean }
}

type SejourWithLot = {
  id: string
  statut: string
  date_arrivee: string
  date_depart: string
  lot_assigne?: { reference: string } | null
}

type NoteWithAuteur = ClientNote & { auteur?: { prenom: string; nom: string } }

const VISITE_STATUT: Record<string, string> = {
  demandee: 'Demandée',
  confirmee_manager: 'Confirmée',
  confirmee_securite: 'Réalisée',
  realisee: 'Réalisée',
  annulee: 'Annulée',
}

const VISITE_COLORS: Record<string, string> = {
  demandee: 'bg-yellow-100 text-yellow-700',
  confirmee_manager: 'bg-blue-100 text-blue-700',
  confirmee_securite: 'bg-green-100 text-green-700',
  realisee: 'bg-gray-100 text-gray-600',
  annulee: 'bg-red-100 text-red-600',
}

const SEJOUR_STATUT: Record<string, string> = {
  demande: 'Demandé',
  confirme: 'Confirmé',
  realise: 'Réalisé',
  no_show: 'No-show',
  annule: 'Annulé',
}

interface Props {
  prospect: Prospect & { lot_cible?: { reference: string; type: string } | null }
  visites: VisiteWithJour[]
  sejours: SejourWithLot[]
  notes: NoteWithAuteur[]
  jours: (JourDisponible & { nb_visites: number })[]
  userId: string
  apporteurNom: string
}

export function MonProspectDetailClient({ prospect: initialProspect, visites: initialVisites, sejours, notes: initialNotes, jours, userId }: Props) {
  const [prospect] = useState(initialProspect)
  const [visites, setVisites] = useState(initialVisites)
  const [notes, setNotes] = useState(initialNotes)
  const [showVisiteDialog, setShowVisiteDialog] = useState(false)
  const [visiteJourId, setVisiteJourId] = useState('')
  const [visiteNotes, setVisiteNotes] = useState('')
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const hasActiveVisite = visites.some(v => !['annulee'].includes(v.statut))
  const joursDisponibles = jours.filter(j => j.nb_visites < j.capacite)

  async function handleDemanderVisite() {
    if (!visiteJourId) return
    const jour = jours.find(j => j.id === visiteJourId)
    if (!jour) return
    setLoading(true)
    const result = await demanderVisite({
      prospect_id: prospect.id,
      jour_id: visiteJourId,
      date_visite: jour.date,
      notes_apporteur: visiteNotes || undefined,
    })
    if (result.success) {
      setVisites(prev => [...prev, { id: result.visite!.id, statut: 'demandee', date_visite: jour.date, notes_apporteur: visiteNotes || undefined }])
      setShowVisiteDialog(false)
      setVisiteJourId('')
      setVisiteNotes('')
      toast({ title: '✓ Visite demandée', description: 'Le manager va confirmer la date.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleAjouterNote() {
    if (!noteText.trim()) return
    setLoading(true)
    const result = await ajouterNote({ prospect_id: prospect.id, contenu: noteText })
    if (result.success && result.note) {
      setNotes(prev => [{ ...result.note!, auteur: { prenom: '', nom: '' } }, ...prev])
      setNoteText('')
      toast({ title: '✓ Note ajoutée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mes-prospects">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button>
        </Link>
      </div>

      {/* Fiche prospect */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl text-[#1A3C6E]">{prospect.prenom} {prospect.nom}</CardTitle>
              {prospect.temperature && (
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className={cn('text-xs font-medium', TEMPERATURE_COLORS[prospect.temperature])}>
                    {TEMPERATURE_LABELS[prospect.temperature]}
                  </span>
                </div>
              )}
            </div>
            <Badge className={cn('text-xs', PROSPECT_STATUT_COLORS[prospect.statut])}>
              {PROSPECT_STATUT_LABELS[prospect.statut]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {prospect.telephone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${prospect.telephone}`} className="text-[#1A3C6E] font-medium hover:underline">{prospect.telephone}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{prospect.email}</span>
          </div>
          {prospect.ville && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{prospect.ville}</span>
            </div>
          )}
          {prospect.budget_estime && (
            <div className="text-sm text-gray-600">
              Budget : <span className="font-medium text-[#C8973A]">{formatCurrency(prospect.budget_estime)}</span>
            </div>
          )}
          {prospect.lot_cible && (
            <div className="text-sm text-gray-600">
              Lot ciblé : <span className="font-medium">{prospect.lot_cible.reference}</span>
            </div>
          )}
          {prospect.notes && (
            <div className="text-sm text-gray-500 pt-1 border-t border-gray-100">{prospect.notes}</div>
          )}
        </CardContent>
      </Card>

      {/* Visites */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1A3C6E]" /> Visites
            </CardTitle>
            {!hasActiveVisite && joursDisponibles.length > 0 && (
              <Button size="sm" className="bg-[#1A3C6E]" onClick={() => setShowVisiteDialog(true)}>
                + Demander une visite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {visites.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune visite planifiée.</p>
          ) : (
            <div className="space-y-2">
              {visites.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{new Date(v.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    {v.notes_apporteur && <p className="text-xs text-gray-400">{v.notes_apporteur}</p>}
                  </div>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', VISITE_COLORS[v.statut])}>
                    {VISITE_STATUT[v.statut]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Séjours */}
      {sejours.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Hotel className="w-4 h-4 text-[#1A3C6E]" /> Séjours test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sejours.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                    </p>
                    {s.lot_assigne && <p className="text-xs text-gray-400">Lot {s.lot_assigne.reference}</p>}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {SEJOUR_STATUT[s.statut] || s.statut}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#1A3C6E]" /> Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ajouter une note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
            <Button size="sm" className="bg-[#1A3C6E] self-end" onClick={handleAjouterNote} disabled={loading || !noteText.trim()}>
              Ajouter
            </Button>
          </div>
          {notes.length > 0 && (
            <div className="space-y-2 pt-1">
              {notes.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{n.contenu}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog visite */}
      <Dialog open={showVisiteDialog} onOpenChange={setShowVisiteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander une visite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date souhaitée</label>
              <Select value={visiteJourId} onValueChange={setVisiteJourId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une date..." />
                </SelectTrigger>
                <SelectContent>
                  {joursDisponibles.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {new Date(j.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {j.prioritaire ? ' ⭐' : ''} — {j.capacite - j.nb_visites} place(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optionnel)</label>
              <Textarea
                placeholder="Contexte, disponibilités particulières..."
                value={visiteNotes}
                onChange={e => setVisiteNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full bg-[#1A3C6E]"
              disabled={!visiteJourId || loading}
              onClick={handleDemanderVisite}
            >
              Soumettre la demande
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
