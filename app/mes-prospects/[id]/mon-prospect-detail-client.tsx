'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate, formatCurrency, PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS, TEMPERATURE_LABELS, TEMPERATURE_COLORS } from '@/lib/utils'
import type { Prospect, ClientNote, JourDisponible } from '@/lib/types'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Hotel, MessageSquare, Flame, Home, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { demanderVisite } from '@/actions/visites'
import { ajouterNote } from '@/actions/notes'
import { soumettreSejourDemande } from '@/actions/sejours'
import { mettreEnListeAttente, closerProspect, reactiverProspect, modifierProspect } from '@/actions/prospects'
import { ajouterLotProspect, retirerLotProspect } from '@/actions/prospects'

type VisiteWithJour = {
  id: string
  statut: string
  date_visite: string
  heure_visite?: string
  notes_apporteur?: string
  jour?: { date: string; prioritaire: boolean }
}

type SejourWithStock = {
  id: string
  statut: string
  date_arrivee: string
  date_depart: string
  nb_adultes?: number
  stock_hebergement?: { reference: string } | null
}

type NoteWithAuteur = ClientNote & { auteur?: { prenom: string; nom: string } }

type Weekend = {
  id: string
  date_vendredi: string
  date_samedi: string
  date_dimanche?: string
  nb_sejours_confirmes: number
  seuil_guests: number
  statut: string
}

type ProspectLot = {
  id: string
  lot_id: string
  lot?: { id: string; reference: string; type: string; prix_individuel: number; prix_bloc?: number }
}

type LotDisponible = {
  id: string
  reference: string
  type: string
  prix_individuel: number
  prix_bloc?: number
}

const VISITE_STATUT: Record<string, string> = {
  confirmee: 'Confirmée',
  realisee: 'Réalisée',
  annulee: 'Annulée',
  // legacy
  demandee: 'Demandée',
  confirmee_manager: 'Confirmée',
  confirmee_securite: 'Réalisée',
}

const VISITE_COLORS: Record<string, string> = {
  confirmee: 'bg-blue-100 text-blue-700',
  realisee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-600',
  demandee: 'bg-yellow-100 text-yellow-700',
  confirmee_manager: 'bg-blue-100 text-blue-700',
}

const SEJOUR_STATUT: Record<string, string> = {
  demande: 'En attente',
  confirme: 'Confirmé',
  realise: 'Réalisé',
  no_show: 'No-show',
  annule: 'Annulé',
}

const LOT_TYPE_LABELS: Record<string, string> = {
  villa_e: 'Villa Parc Type E',
  appart_2ch: 'Appartement 2 chambres',
  appart_1ch: 'Appartement 1 chambre',
}

interface Props {
  prospect: Prospect & { lot_cible?: { reference: string; type: string } | null }
  visites: VisiteWithJour[]
  sejours: SejourWithStock[]
  notes: NoteWithAuteur[]
  jours: (JourDisponible & { nb_visites: number })[]
  weekends: Weekend[]
  prospectLots: ProspectLot[]
  lotsDisponibles: LotDisponible[]
  userId: string
  apporteurNom: string
  quotaUtilise: number
  quotaMax: number
}

export function MonProspectDetailClient({
  prospect: initialProspect,
  visites: initialVisites,
  sejours: initialSejours,
  notes: initialNotes,
  jours,
  weekends,
  prospectLots: initialProspectLots,
  lotsDisponibles,
  userId,
  quotaUtilise,
  quotaMax,
}: Props) {
  const [prospect, setProspect] = useState(initialProspect)
  const [visites, setVisites] = useState(initialVisites)
  const [sejours] = useState(initialSejours)
  const [notes, setNotes] = useState(initialNotes)
  const [prospectLots, setProspectLots] = useState(initialProspectLots)

  // Visite dialog
  const [showVisiteDialog, setShowVisiteDialog] = useState(false)
  const [visiteJourId, setVisiteJourId] = useState('')
  const [visiteHeure, setVisiteHeure] = useState('')
  const [visiteNotes, setVisiteNotes] = useState('')

  // Séjour dialog
  const [showSejourDialog, setShowSejourDialog] = useState(false)
  const [sejourPref1, setSejourPref1] = useState('')
  const [sejourPref2, setSejourPref2] = useState('')
  const [sejourPref3, setSejourPref3] = useState('')
  const [sejourAdultes, setSejourAdultes] = useState(2)
  const [sejourEnf6Plus, setSejourEnf6Plus] = useState(0)
  const [sejourEnf6Moins, setSejourEnf6Moins] = useState(0)

  // Lot dialog
  const [showLotDialog, setShowLotDialog] = useState(false)
  const [lotToAdd, setLotToAdd] = useState('')

  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState({
    nom: prospect.nom || '',
    prenom: prospect.prenom || '',
    email: prospect.email || '',
    telephone: prospect.telephone || '',
    ville: prospect.ville || '',
    budget_estime: prospect.budget_estime?.toString() || '',
    capacite_financiere: prospect.capacite_financiere || '',
    valeur_ajoutee: prospect.valeur_ajoutee || '',
    reference_personnelle: prospect.reference_personnelle || '',
    notes: prospect.notes || '',
  })

  async function handleModifier() {
    setLoading(true)
    const result = await modifierProspect(prospect.id, {
      ...editData,
      budget_estime: editData.budget_estime ? parseFloat(editData.budget_estime) : undefined,
    })
    if (result.success) {
      setProspect(p => ({ ...p, ...editData, budget_estime: editData.budget_estime ? parseFloat(editData.budget_estime) : undefined }))
      setShowEditDialog(false)
      toast({ title: '✓ Fiche mise à jour' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }
  const { toast } = useToast()

  const hasActiveVisite = visites.some(v => !['annulee'].includes(v.statut))
  const joursDisponibles = jours.filter(j => j.nb_visites < j.capacite)
  const hasActiveSejouer = sejours.some(s => ['demande', 'confirme'].includes(s.statut))
  const canDemanderSejour = ['visite_realisee', 'dossier_envoye', 'formulaire_signe'].includes(prospect.statut)
  const quotaOk = quotaUtilise < quotaMax
  const weekendsOuverts = weekends.filter(w => ['ouvert', 'valide'].includes(w.statut))

  async function handleDemanderVisite() {
    if (!visiteJourId) return
    const jour = jours.find(j => j.id === visiteJourId)
    if (!jour) return
    setLoading(true)
    const result = await demanderVisite({
      prospect_id: prospect.id,
      jour_id: visiteJourId,
      date_visite: jour.date,
      heure_visite: visiteHeure || undefined,
      notes_apporteur: visiteNotes || undefined,
    })
    if (result.success) {
      setVisites(prev => [...prev, {
        id: result.visite!.id,
        statut: 'confirmee',
        date_visite: jour.date,
        heure_visite: visiteHeure || undefined,
        notes_apporteur: visiteNotes || undefined,
      }])
      setShowVisiteDialog(false)
      setVisiteJourId(''); setVisiteHeure(''); setVisiteNotes('')
      toast({ 
        title: '✓ Demande de visite soumise', 
        description: 'Votre demande est enregistrée. Le voucher de visite vous sera envoyé automatiquement par email dès que le Manager confirme sa présence.'
      })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  const [showOrangeDialog, setShowOrangeDialog] = useState(false)
  const [orangeAction, setOrangeAction] = useState<'liste_attente' | 'closer' | 'reactiver' | null>(null)
  const [listeAttenteDelai, setListeAttenteDelai] = useState('')
  const [listeAttenteNotes, setListeAttenteNotes] = useState('')

  async function handleOrangeAction() {
    if (!orangeAction) return
    setLoading(true)
    if (orangeAction === 'liste_attente') {
      if (!listeAttenteDelai) {
        toast({ title: 'Erreur', description: 'Veuillez saisir un délai estimé.', variant: 'destructive' })
        setLoading(false)
        return
      }
      const res = await mettreEnListeAttente(prospect.id, { delai: listeAttenteDelai, notes: listeAttenteNotes })
      if (res.success) {
        setProspect(p => ({ ...p, statut: 'liste_attente' }))
        toast({ title: '✓ Prospect mis en liste d\'attente' })
        setShowOrangeDialog(false)
      } else {
        toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
      }
    } else if (orangeAction === 'closer') {
      const res = await closerProspect(prospect.id)
      if (res.success) {
        setProspect(p => ({ ...p, statut: 'non_concluant' }))
        toast({ title: 'Prospect closé' })
        setShowOrangeDialog(false)
      }
    } else if (orangeAction === 'reactiver') {
      const res = await reactiverProspect(prospect.id)
      if (res.success) {
        setProspect(p => ({ ...p, statut: 'sejour_realise' }))
        toast({ title: '✓ Prospect réactivé — Prêt pour formulaire' })
        setShowOrangeDialog(false)
      }
    }
    setLoading(false)
  }

  async function handleDemanderSejour() {
    if (!sejourPref1 || !sejourPref2 || !sejourPref3) {
      toast({ title: 'Erreur', description: '3 préférences de weekends sont requises.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const result = await soumettreSejourDemande({
      prospect_id: prospect.id,
      nb_adultes: sejourAdultes,
      nb_enfants_plus_6: sejourEnf6Plus,
      nb_enfants_moins_6: sejourEnf6Moins,
      preferences_weekends: [
        { rank: 1, weekend_id: sejourPref1 },
        { rank: 2, weekend_id: sejourPref2 },
        { rank: 3, weekend_id: sejourPref3 },
      ],
    })
    if (result.success) {
      setShowSejourDialog(false)
      setSejourPref1(''); setSejourPref2(''); setSejourPref3('')
      toast({ title: '✓ Demande de séjour soumise', description: 'Le manager va confirmer votre weekend.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleAjouterNote() {
    if (!noteText.trim()) return
    setLoading(true)
    const result = await ajouterNote({ prospect_id: prospect.id, contenu: noteText })
    if (result.success) {
      setNotes(prev => [{
        id: crypto.randomUUID(),
        prospect_id: prospect.id,
        auteur_id: '',
        contenu: noteText,
        temperature: undefined,
        created_at: new Date().toISOString(),
        auteur: { prenom: '', nom: '' },
      } as NoteWithAuteur, ...prev])
      setNoteText('')
      toast({ title: '✓ Note ajoutée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleAjouterLot() {
    if (!lotToAdd) return
    setLoading(true)
    const result = await ajouterLotProspect(prospect.id, lotToAdd)
    if (result.success) {
      const lot = lotsDisponibles.find(l => l.id === lotToAdd)
      if (lot) {
        setProspectLots(prev => [...prev, { id: `temp-${lotToAdd}`, lot_id: lotToAdd, lot }])
      }
      setShowLotDialog(false)
      setLotToAdd('')
      toast({ title: '✓ Lot ajouté' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleRetirerLot(lotId: string) {
    const result = await retirerLotProspect(prospect.id, lotId)
    if (result.success) {
      setProspectLots(prev => prev.filter(pl => pl.lot_id !== lotId))
      toast({ title: 'Lot retiré' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  const weekendLabel = (w: Weekend) =>
    `Ven. ${new Date(w.date_vendredi + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → Dim. ${w.date_dimanche ? new Date(w.date_dimanche + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}`

  const alreadyLinkedIds = new Set(prospectLots.map(pl => pl.lot_id))
  const lotsToAdd = lotsDisponibles.filter(l => !alreadyLinkedIds.has(l.id))

  return (
    <div className="space-y-6 max-w-2xl">
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
              Lot principal : <span className="font-medium">{prospect.lot_cible.reference}</span>
            </div>
          )}
          {prospect.notes && (
            <div className="text-sm text-gray-500 pt-1 border-t border-gray-100">{prospect.notes}</div>
          )}
        </CardContent>
      </Card>

      {/* Lots associés */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4 text-[#1A3C6E]" /> Lots d&apos;intérêt
            </CardTitle>
            {lotsToAdd.length > 0 && (
              <Button size="sm" variant="outline" className="text-[#C8973A] border-[#C8973A]" onClick={() => setShowLotDialog(true)}>
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prospectLots.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun lot associé.</p>
          ) : (
            <div className="space-y-2">
              {prospectLots.map(pl => (
                <div key={pl.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <span className="font-mono text-sm font-bold text-[#1A3C6E]">{pl.lot?.reference}</span>
                    <span className="text-xs text-gray-400 ml-2">{LOT_TYPE_LABELS[pl.lot?.type ?? ''] ?? pl.lot?.type}</span>
                    <span className="text-xs text-[#C8973A] ml-2">{pl.lot ? formatCurrency(pl.lot.prix_individuel) : ''}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600 h-7"
                    onClick={() => handleRetirerLot(pl.lot_id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
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
            {!hasActiveVisite && joursDisponibles.length > 0 && prospect.statut === 'valide' && (
              <Button size="sm" className="bg-[#1A3C6E]" onClick={() => setShowVisiteDialog(true)}>
                + Planifier une visite
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
                    <p className="text-sm font-medium">
                      {new Date(v.date_visite + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {v.heure_visite && ` — ${v.heure_visite.slice(0, 5)}`}
                    </p>
                    {v.notes_apporteur && <p className="text-xs text-gray-400">{v.notes_apporteur}</p>}
                  </div>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', VISITE_COLORS[v.statut] ?? 'bg-gray-100 text-gray-600')}>
                    {VISITE_STATUT[v.statut] ?? v.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Séjours */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Hotel className="w-4 h-4 text-[#1A3C6E]" /> Séjours test
              <span className="text-xs text-gray-400 font-normal">({quotaUtilise}/{quotaMax} quota)</span>
            </CardTitle>
            {canDemanderSejour && !hasActiveSejouer && quotaOk && weekendsOuverts.length >= 3 && (
              <Button size="sm" className="bg-[#1A3C6E]" onClick={() => setShowSejourDialog(true)}>
                + Soumettre demande
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!quotaOk && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              Quota de {quotaMax} séjours atteint.
            </div>
          )}
          {sejours.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun séjour planifié.</p>
          ) : (
            <div className="space-y-2">
              {sejours.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(s.date_arrivee)} → {formatDate(s.date_depart)}
                    </p>
                    {s.nb_adultes && <p className="text-xs text-gray-400">{s.nb_adultes} adulte(s)</p>}
                    {s.stock_hebergement && <p className="text-xs text-gray-400">Unité {s.stock_hebergement.reference}</p>}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {SEJOUR_STATUT[s.statut] || s.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Dialog — Planifier visite */}
      <Dialog open={showVisiteDialog} onOpenChange={setShowVisiteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier une visite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Date souhaitée</Label>
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
              <Label>Créneau souhaité</Label>
              <Select value={visiteHeure} onValueChange={setVisiteHeure}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un créneau" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="17:00">🌅 Golden Hour — 17h00 (recommandé)</SelectItem>
                  <SelectItem value="10:00">🌄 Matinée — 10h00</SelectItem>
                  <SelectItem value="14:00">☀️ Après-midi — 14h00</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-600 mt-1">⭐ La Golden Hour démarre à 17h — moment idéal pour découvrir le site</p>
            </div>
            <div>
              <Label>Note (optionnel)</Label>
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
              {loading ? 'Envoi...' : 'Confirmer la visite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Demande de séjour */}
      <Dialog open={showSejourDialog} onOpenChange={setShowSejourDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Demande de séjour test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-gray-500">Sélectionnez 3 weekends par ordre de préférence. Le manager confirmera l&apos;un d&apos;entre eux.</p>

            {(['1ère', '2ème', '3ème'] as const).map((rank, i) => {
              const vals = [sejourPref1, sejourPref2, sejourPref3]
              const setters = [setSejourPref1, setSejourPref2, setSejourPref3]
              const excluded = vals.filter((_, j) => j !== i)
              return (
                <div key={i}>
                  <Label>{rank} préférence</Label>
                  <Select value={vals[i]} onValueChange={setters[i]}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un weekend..." />
                    </SelectTrigger>
                    <SelectContent>
                      {weekendsOuverts.filter(w => !excluded.includes(w.id)).map(w => (
                        <SelectItem key={w.id} value={w.id}>{weekendLabel(w)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              <div>
                <Label>Adultes</Label>
                <Input type="number" min={1} max={4} value={sejourAdultes} onChange={e => setSejourAdultes(+e.target.value)} />
              </div>
              <div>
                <Label>Enfants &gt;6 ans</Label>
                <Input type="number" min={0} max={4} value={sejourEnf6Plus} onChange={e => setSejourEnf6Plus(+e.target.value)} />
              </div>
              <div>
                <Label>Enfants ≤6 ans</Label>
                <Input type="number" min={0} max={4} value={sejourEnf6Moins} onChange={e => setSejourEnf6Moins(+e.target.value)} />
              </div>
            </div>

            <div className="bg-[#1A3C6E]/5 rounded-lg p-3 text-xs text-gray-600">
              Total : {sejourAdultes} adulte(s) + {sejourEnf6Plus} enf.&gt;6ans + {sejourEnf6Moins} enf.≤6ans = {sejourAdultes + sejourEnf6Plus + sejourEnf6Moins} personnes
            </div>

            <Button
              className="w-full bg-[#1A3C6E]"
              disabled={!sejourPref1 || !sejourPref2 || !sejourPref3 || loading}
              onClick={handleDemanderSejour}
            >
              {loading ? 'Envoi...' : 'Soumettre la demande'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Ajouter un lot */}
      <Dialog open={showLotDialog} onOpenChange={setShowLotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associer un lot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={lotToAdd} onValueChange={setLotToAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un lot disponible..." />
              </SelectTrigger>
              <SelectContent>
                {lotsToAdd.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.reference} — {LOT_TYPE_LABELS[l.type] ?? l.type} — {formatCurrency(l.prix_individuel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full bg-[#1A3C6E]"
              disabled={!lotToAdd || loading}
              onClick={handleAjouterLot}
            >
              Associer ce lot
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Orange — Qualification requise */}
      {prospect.statut === 'orange' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mt-4">
          <h3 className="font-bold text-orange-800 text-base mb-2">🟠 Prospect en attente — Action requise</h3>
          <p className="text-sm text-orange-700 mb-4">Ce prospect n'a pas signé de formulaire dans les 7 jours suivant son séjour. Vous devez qualifier sa situation.</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => { setOrangeAction('reactiver'); setShowOrangeDialog(true) }}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              🔄 Réactiver — Prêt à signer maintenant
            </button>
            <button onClick={() => { setOrangeAction('liste_attente'); setShowOrangeDialog(true) }}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              📅 Liste d'attente — Intéressé mais plus tard
            </button>
            <button onClick={() => { setOrangeAction('closer'); setShowOrangeDialog(true) }}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600">
              ❌ Closer — Non intéressé
            </button>
          </div>
        </div>
      )}

      {/* Dialog Orange */}
      {showOrangeDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg">
              {orangeAction === 'liste_attente' ? "📅 Mise en liste d'attente" :
               orangeAction === 'closer' ? "❌ Fermer le dossier" : "🔄 Réactiver le prospect"}
            </h3>

            {orangeAction === 'liste_attente' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Délai estimé de signature *</label>
                  <input type="date" value={listeAttenteDelai}
                    onChange={e => setListeAttenteDelai(e.target.value)}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-500 mt-1">Date à laquelle vous pensez pouvoir relancer ce prospect</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes (raison du délai)</label>
                  <textarea value={listeAttenteNotes}
                    onChange={e => setListeAttenteNotes(e.target.value)}
                    rows={3} placeholder="Ex: En attente de financement, déménagement prévu..."
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </>
            )}

            {orangeAction === 'closer' && (
              <p className="text-sm text-gray-600">Le prospect sera archivé définitivement. Cette action est irréversible sauf intervention de la Direction.</p>
            )}

            {orangeAction === 'reactiver' && (
              <p className="text-sm text-gray-600">Le prospect sera réactivé en statut "séjour réalisé". Vous pourrez ensuite enregistrer le formulaire signé.</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowOrangeDialog(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleOrangeAction} disabled={loading}
                className="flex-1 py-2 bg-[#1A3C6E] text-white rounded-lg text-sm font-medium hover:bg-[#163362] disabled:opacity-50">
                {loading ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
