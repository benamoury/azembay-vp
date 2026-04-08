'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  formatCurrency, formatDate, formatDateTime,
  PROSPECT_STATUT_LABELS, PROSPECT_STATUT_COLORS, CRM_ETAPES, LOT_TYPE_LABELS,
  VOUCHER_STATUT_LABELS, VOUCHER_STATUT_COLORS, TEMPERATURE_LABELS, TEMPERATURE_COLORS,
} from '@/lib/utils'
import type { Prospect, Voucher, Formulaire, Sejour, Lot, UserRole, JourDisponible, ClientNote, Weekend } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Ticket, FileText,
  Hotel, CheckCircle, XCircle, ArrowRight, MessageSquare, Flame, Send,
} from 'lucide-react'
import Link from 'next/link'
import {
  avancerEtapeProspect, marquerNonConcluant, emettreLienSecurise,
  creerVoucher, creerFormulaire, creerSejour, validerProspect, rejeterProspect, qualifierProspect, validerFormulaireDirection, rejeterFormulaireDirection, modifierProspect, mettreEnListeAttente,
} from '@/actions/prospects'
import { demanderVisite } from '@/actions/visites'
import { ajouterNote } from '@/actions/notes'
import { Star } from 'lucide-react'

interface Props {
  prospect: Prospect
  vouchers: Voucher[]
  formulaires: Formulaire[]
  sejours: Sejour[]
  lots: Lot[]
  jours: JourDisponible[]
  notes: ClientNote[]
  weekends: Weekend[]
  managerId: string
  managerNom: string
  role: UserRole
}

const ETAPE_ACTIONS: Partial<Record<string, { label: string; nextStatut: string }>> = {
  valide: { label: 'Planifier une visite', nextStatut: 'visite_programmee' },
  visite_programmee: { label: 'Marquer visite réalisée', nextStatut: 'visite_realisee' },
  visite_realisee: { label: 'Envoyer lien post-visite', nextStatut: 'dossier_envoye' },
  dossier_envoye: { label: 'Enregistrer formulaire signé', nextStatut: 'formulaire_signe' },
  formulaire_signe: { label: 'Planifier séjour / acte notarié', nextStatut: 'sejour_confirme' },
}

const DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function ProspectDetailClient({
  prospect: initialProspect,
  vouchers: initialVouchers,
  formulaires: initialFormulaires,
  sejours: initialSejours,
  lots,
  jours,
  notes: initialNotes,
  weekends,
  managerId,
  role,
}: Props) {
  const [prospect, setProspect] = useState(initialProspect)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState({
    nom: initialProspect.nom || '',
    prenom: initialProspect.prenom || '',
    email: initialProspect.email || '',
    telephone: initialProspect.telephone || '',
    ville: initialProspect.ville || '',
    budget_estime: initialProspect.budget_estime?.toString() || '',
    capacite_financiere: initialProspect.capacite_financiere || '',
    valeur_ajoutee: initialProspect.valeur_ajoutee || '',
    reference_personnelle: initialProspect.reference_personnelle || '',
    notes: initialProspect.notes || '',
  })

  async function handleModifierProspect() {
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
  const [formulaires, setFormulaires] = useState(initialFormulaires)
  const [dateValidationFormulaire, setDateValidationFormulaire] = useState('')
  const [showListeAttenteDialog, setShowListeAttenteDialog] = useState(false)
  const [listeAttenteDelai, setListeAttenteDelai] = useState('')
  const [listeAttenteNotes, setListeAttenteNotes] = useState('')

  async function handleListeAttente() {
    setLoading(true)
    const res = await mettreEnListeAttente(prospect.id, { delai: listeAttenteDelai, notes: listeAttenteNotes })
    if (res.success) {
      setProspect(p => ({ ...p, statut: 'liste_attente' }))
      setShowListeAttenteDialog(false)
      toast({ title: "✓ Prospect mis en liste d'attente" })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
    setLoading(false)
  }
  const [vouchers] = useState(initialVouchers)
  const [notes, setNotes] = useState(initialNotes)
  const [loading, setLoading] = useState(false)
  const [showVisiteDialog, setShowVisiteDialog] = useState(false)
  const [showVoucherDialog, setShowVoucherDialog] = useState(false)
  const [showFormulaireDialog, setShowFormulaireDialog] = useState(false)
  const [showSejourDialog, setShowSejourDialog] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteTemp, setNoteTemp] = useState<number | undefined>(undefined)
  const [visiteData, setVisiteData] = useState({ jour_id: '', notes_apporteur: '' })
  const [voucherData, setVoucherData] = useState({ date_visite: '', heure_visite: '17:00' })
  const [formulaireData, setFormulaireData] = useState({ lot_id: '', lot_ids: [] as string[], type: 'avec_acompte', programme_hotelier: 'standard', date_signature: '', sejour_test_souhaite: false })
  const [sejourData, setSejourData] = useState({ date_arrivee: '', date_depart: '', nb_adultes: 2, nb_enfants: 0 })
  const { toast } = useToast()
  const router = useRouter()

  async function handleAjouterNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setLoading(true)
    const result = await ajouterNote({ prospect_id: prospect.id, contenu: noteText, temperature: noteTemp })
    if (result.success) {
      setNoteText('')
      setNoteTemp(undefined)
      router.refresh()
      toast({ title: 'Note ajoutée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  const stepCurrent = CRM_ETAPES.find(e => e.value === prospect.statut)
  const action = ETAPE_ACTIONS[prospect.statut]
  const isHighValue = (prospect.budget_estime || 0) >= 5_000_000

  async function handleAvancer() {
    if (!action) return
    setLoading(true)
    const result = await avancerEtapeProspect(prospect.id, action.nextStatut as never)
    if (result.success) {
      setProspect(p => ({ ...p, statut: action.nextStatut as never }))
      toast({ title: 'Étape avancée', description: `Statut : ${PROSPECT_STATUT_LABELS[action.nextStatut as never]}` })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleNonConcluant() {
    setLoading(true)
    const result = await marquerNonConcluant(prospect.id)
    if (result.success) {
      setProspect(p => ({ ...p, statut: 'non_concluant' }))
      toast({ title: 'Prospect marqué non concluant' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleVisite(e: React.FormEvent) {
    e.preventDefault()
    if (!visiteData.jour_id) return
    setLoading(true)
    const jour = jours.find(j => j.id === visiteData.jour_id)
    const result = await demanderVisite({
      prospect_id: prospect.id,
      jour_id: visiteData.jour_id,
      date_visite: jour!.date,
      notes_apporteur: visiteData.notes_apporteur || undefined,
    })
    if (result.success) {
      setShowVisiteDialog(false)
      setProspect(p => ({ ...p, statut: 'visite_programmee' }))
      toast({ title: 'Visite planifiée', description: `Date : ${jour?.date} — En attente de confirmation sécurité.` })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleVoucher(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerVoucher({
      prospect_id: prospect.id,
      apporteur_id: prospect.apporteur_id,
      manager_id: managerId,
      ...voucherData,
    })
    if (result.success) {
      setShowVoucherDialog(false)
      toast({ title: 'Voucher émis', description: 'Le PDF a été envoyé par email à l\'apporteur.' })
      router.refresh()
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleValiderFormulaire(formulaireId: string, date: string) {
    setLoading(true)
    const result = await validerFormulaireDirection(formulaireId, date)
    if (result.success) {
      toast({ title: '✓ Formulaire validé par la Direction' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleRejeterFormulaire(formulaireId: string) {
    setLoading(true)
    const result = await rejeterFormulaireDirection(formulaireId)
    if (result.success) {
      setProspect(p => ({ ...p, statut: 'dossier_envoye' }))
      toast({ title: 'Formulaire annulé — Lots débloqués' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleFormulaire(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerFormulaire({ prospect_id: prospect.id, ...formulaireData, lot_ids: formulaireData.lot_ids.length > 0 ? formulaireData.lot_ids : [formulaireData.lot_id] })
    if (result.success) {
      setShowFormulaireDialog(false)
      setProspect(p => ({ ...p, statut: 'formulaire_signe' }))
      toast({ title: 'Formulaire enregistré' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleSejour(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerSejour({ prospect_id: prospect.id, ...sejourData })
    if (result.success) {
      setShowSejourDialog(false)
      toast({ title: 'Séjour demandé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleQualifier() {
    setLoading(true)
    const result = await qualifierProspect(prospect.id)
    if (result.success) {
      setProspect(p => ({ ...p, statut: 'qualifie' }))
      toast({ title: 'Prospect qualifié', description: 'La Direction a été notifiée pour validation.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleValider() {
    setLoading(true)
    const result = await validerProspect(prospect.id)
    if (result.success) {
      setProspect(p => ({ ...p, statut: 'valide' }))
      toast({ title: '✓ Prospect validé', description: 'L\'apporteur a été notifié.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleRejeter() {
    setLoading(true)
    const result = await rejeterProspect(prospect.id)
    if (result.success) {
      setProspect(p => ({ ...p, statut: 'non_concluant' }))
      toast({ title: 'Prospect rejeté' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleLienSecurise() {
    setLoading(true)
    const result = await emettreLienSecurise(prospect.id, managerId)
    if (result.success) {
      toast({ title: 'Lien sécurisé envoyé', description: 'Le lien a été envoyé à l\'apporteur.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/prospects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1A3C6E]">{prospect.prenom} {prospect.nom}</h1>
              <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)} className="text-[#1A3C6E] border-[#1A3C6E]">
                ✏️ Modifier
              </Button>
            </div>

            {/* Dialog Modifier prospect */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Modifier la fiche prospect</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Prénom</Label><Input value={editData.prenom} onChange={e => setEditData(p => ({ ...p, prenom: e.target.value }))} /></div>
                    <div><Label>Nom</Label><Input value={editData.nom} onChange={e => setEditData(p => ({ ...p, nom: e.target.value }))} /></div>
                    <div><Label>Email</Label><Input value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Téléphone</Label><Input value={editData.telephone} onChange={e => setEditData(p => ({ ...p, telephone: e.target.value }))} /></div>
                    <div><Label>Ville</Label><Input value={editData.ville} onChange={e => setEditData(p => ({ ...p, ville: e.target.value }))} /></div>
                    <div><Label>Budget estimé</Label><Input type="number" value={editData.budget_estime} onChange={e => setEditData(p => ({ ...p, budget_estime: e.target.value }))} /></div>
                  </div>
                  <div><Label>Capacité financière</Label><Input value={editData.capacite_financiere} onChange={e => setEditData(p => ({ ...p, capacite_financiere: e.target.value }))} /></div>
                  <div>
                    <Label>Profil (valeur ajoutée)</Label>
                    <Select value={editData.valeur_ajoutee} onValueChange={v => setEditData(p => ({ ...p, valeur_ajoutee: v }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HNWI">HNWI</SelectItem>
                        <SelectItem value="Serial Investor">Serial Investor</SelectItem>
                        <SelectItem value="Bloc Sale Candidate">Bloc Sale Candidate</SelectItem>
                        <SelectItem value="Profession Libérale Cash">Profession Libérale Cash</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Référence personnelle</Label><Textarea value={editData.reference_personnelle} onChange={e => setEditData(p => ({ ...p, reference_personnelle: e.target.value }))} rows={2} /></div>
                  <div><Label>Notes</Label><Textarea value={editData.notes} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>Annuler</Button>
                    <Button className="flex-1 bg-[#1A3C6E]" onClick={handleModifierProspect} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {isHighValue && <Badge variant="orange">≥ 5M MAD</Badge>}
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PROSPECT_STATUT_COLORS[prospect.statut])}>
              {PROSPECT_STATUT_LABELS[prospect.statut]}
            </span>
            {prospect.temperature && (
              <span className={cn('flex items-center gap-1 text-xs font-medium', TEMPERATURE_COLORS[prospect.temperature])}>
                <Flame className="w-3.5 h-3.5" />
                {TEMPERATURE_LABELS[prospect.temperature]}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Créé le {formatDate(prospect.created_at)}</p>
        </div>
        {prospect.statut !== 'non_concluant' && prospect.statut !== 'vendu' && prospect.statut !== 'liste_attente' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200" onClick={() => setShowListeAttenteDialog(true)} disabled={loading}>
              📅 Liste d'attente
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={handleNonConcluant} disabled={loading}>
              <XCircle className="w-4 h-4 mr-1" /> Closer
            </Button>
          </div>
        )}

        {/* Dialog Liste d'attente */}
        <Dialog open={showListeAttenteDialog} onOpenChange={setShowListeAttenteDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>📅 Mise en liste d'attente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Délai estimé de signature</Label>
                <input type="date" value={listeAttenteDelai} onChange={e => setListeAttenteDelai(e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <Label>Notes</Label>
                <textarea value={listeAttenteNotes} onChange={e => setListeAttenteNotes(e.target.value)} rows={3} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Raison du délai..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowListeAttenteDialog(false)}>Annuler</Button>
                <Button className="flex-1 bg-purple-600" onClick={handleListeAttente} disabled={loading || !listeAttenteDelai}>Confirmer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* CRM Pipeline */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-0">
            {CRM_ETAPES.map((etape, i) => {
              const stepNum = etape.step
              const currentStep = stepCurrent?.step || 0
              const isDone = stepNum < currentStep
              const isCurrent = stepNum === currentStep
              return (
                <div key={etape.value} className="flex items-center flex-1">
                  <div className={cn(
                    'flex flex-col items-center gap-1 flex-1 text-center',
                  )}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
                      isDone ? 'bg-green-500 border-green-500 text-white' :
                      isCurrent ? 'bg-[#1A3C6E] border-[#1A3C6E] text-white' :
                      'bg-white border-gray-200 text-gray-400'
                    )}>
                      {isDone ? <CheckCircle className="w-4 h-4" /> : stepNum}
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium',
                      isCurrent ? 'text-[#1A3C6E]' : isDone ? 'text-green-600' : 'text-gray-400'
                    )}>
                      {etape.label}
                    </span>
                  </div>
                  {i < CRM_ETAPES.length - 1 && (
                    <div className={cn('h-0.5 w-8 mx-1', isDone ? 'bg-green-400' : 'bg-gray-200')} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Informations */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E] flex items-center gap-2"><User className="w-4 h-4" /> Informations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-400">Email</Label>
                <p className="flex items-center gap-1 mt-1"><Mail className="w-3.5 h-3.5 text-gray-400" />{prospect.email}</p>
              </div>
              {prospect.telephone && (
                <div>
                  <Label className="text-xs text-gray-400">Téléphone</Label>
                  <p className="flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{prospect.telephone}</p>
                </div>
              )}
              {prospect.ville && (
                <div>
                  <Label className="text-xs text-gray-400">Localisation</Label>
                  <p className="flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{prospect.ville}, {prospect.pays}</p>
                </div>
              )}
              {prospect.budget_estime && (
                <div>
                  <Label className="text-xs text-gray-400">Budget estimé</Label>
                  <p className="font-semibold text-[#1A3C6E] mt-1">{formatCurrency(prospect.budget_estime)}</p>
                </div>
              )}
              {prospect.profil && (
                <div>
                  <Label className="text-xs text-gray-400">Profil</Label>
                  <p className="mt-1 capitalize">{prospect.profil.replace('_', ' ')}</p>
                </div>
              )}
              {prospect.nationalite && (
                <div>
                  <Label className="text-xs text-gray-400">Nationalité</Label>
                  <p className="mt-1">{prospect.nationalite}</p>
                </div>
              )}
              {prospect.reference_personnelle && (
                <div className="col-span-2">
                  <Label className="text-xs text-gray-400">Référence personnelle</Label>
                  <p className="mt-1">{prospect.reference_personnelle}</p>
                </div>
              )}
              {prospect.valeur_ajoutee && (
                <div className="col-span-2">
                  <Label className="text-xs text-gray-400">Valeur ajoutée</Label>
                  <p className="mt-1">{prospect.valeur_ajoutee}</p>
                </div>
              )}
              {prospect.notes && (
                <div className="col-span-2">
                  <Label className="text-xs text-gray-400">Notes</Label>
                  <p className="mt-1 text-gray-600">{prospect.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vouchers */}
          {vouchers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-[#1A3C6E] flex items-center gap-2"><Ticket className="w-4 h-4" /> Vouchers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vouchers.map(v => (
                    <div key={v.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{v.numero_voucher}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(v.date_visite)} à {v.heure_visite?.slice(0,5)}
                        </p>
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full', VOUCHER_STATUT_COLORS[v.statut])}>
                        {VOUCHER_STATUT_LABELS[v.statut]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Fiche Client Vivante — Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Fiche client vivante
                {notes.length > 0 && <span className="text-xs text-gray-400 font-normal">({notes.length} note{notes.length > 1 ? 's' : ''})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ajouter note */}
              <form onSubmit={handleAjouterNote} className="space-y-3">
                <Textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ajouter une observation, un retour, une information..."
                  rows={3}
                  className="text-sm"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 mr-1">Temp. :</span>
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNoteTemp(prev => prev === n ? undefined : n)}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all',
                          noteTemp === n ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'border-gray-200 text-gray-400 hover:border-gray-400'
                        )}
                        title={TEMPERATURE_LABELS[n]}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <Button type="submit" size="sm" disabled={loading || !noteText.trim()} className="ml-auto">
                    <Send className="w-3.5 h-3.5 mr-1" /> Ajouter
                  </Button>
                </div>
              </form>

              {/* Notes existantes */}
              {notes.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  {notes.map(note => {
                    const auteur = note.auteur as { prenom: string; nom: string } | undefined
                    return (
                      <div key={note.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1A3C6E]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#1A3C6E]">
                            {auteur?.prenom?.[0]}{auteur?.nom?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-700">{auteur?.prenom} {auteur?.nom}</span>
                            <span className="text-[10px] text-gray-400">{formatDateTime(note.created_at)}</span>
                            {note.temperature && (
                              <span className={cn('text-[10px] font-medium flex items-center gap-0.5', TEMPERATURE_COLORS[note.temperature])}>
                                <Flame className="w-2.5 h-2.5" />{TEMPERATURE_LABELS[note.temperature]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{note.contenu}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {notes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Aucune note pour ce prospect.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Card className="border-[#1A3C6E]/20 bg-[#1A3C6E]/5">
            <CardHeader><CardTitle className="text-[#1A3C6E] text-sm">Actions CRM</CardTitle></CardHeader>
            <CardContent className="space-y-3">

              {/* Étape 1 → Manager qualifie / Direction valide */}
              {prospect.statut === 'soumis' && role === 'direction' && (
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleValider} disabled={loading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Valider le prospect
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={handleRejeter} disabled={loading}>
                    <XCircle className="w-4 h-4 mr-2" /> Rejeter
                  </Button>
                </div>
              )}
              {prospect.statut === 'soumis' && (role === 'manager') && (
                <div className="space-y-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleQualifier} disabled={loading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Qualifier le prospect
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={handleRejeter} disabled={loading}>
                    <XCircle className="w-4 h-4 mr-2" /> Rejeter
                  </Button>
                </div>
              )}
              {prospect.statut === 'qualifie' && role === 'direction' && (
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleValider} disabled={loading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approuver le prospect
                  </Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={handleRejeter} disabled={loading}>
                    <XCircle className="w-4 h-4 mr-2" /> Rejeter
                  </Button>
                </div>
              )}
              {prospect.statut === 'qualifie' && role === 'manager' && (
                <p className="text-sm text-blue-600 text-center py-2">✓ Qualifié — En attente de validation Direction</p>
              )}

              {/* Étape 2 → Planifier visite */}
              {prospect.statut === 'valide' && (
                <Button className="w-full" onClick={() => setShowVisiteDialog(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Planifier une visite
                </Button>
              )}

              {/* Étape 3 → Voucher + Marquer visite réalisée */}
              {prospect.statut === 'visite_programmee' && (
                <div className="space-y-2">
                  <Button className="w-full bg-[#C8973A] hover:bg-[#b07e2e]" onClick={() => setShowVoucherDialog(true)} disabled={loading}>
                    <Ticket className="w-4 h-4 mr-2" /> Émettre le voucher visite
                  </Button>
                  <Button className="w-full" onClick={handleAvancer} disabled={loading}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Marquer visite réalisée
                  </Button>
                </div>
              )}

              {/* Étape 4 → Lien sécurisé post-visite */}
              {prospect.statut === 'visite_realisee' && (
                <Button className="w-full" onClick={handleLienSecurise} disabled={loading}>
                  <FileText className="w-4 h-4 mr-2" /> Envoyer lien post-visite
                </Button>
              )}

              {/* Étape 5 → Formulaire */}
              {prospect.statut === 'dossier_envoye' && (
                <Button className="w-full" onClick={() => setShowFormulaireDialog(true)}>
                  <FileText className="w-4 h-4 mr-2" /> Enregistrer formulaire
                </Button>
              )}

              {/* Validation Direction formulaires en attente */}
              {prospect.statut === 'formulaire_signe' && role === 'direction' && formulaires.filter(f => f.statut_direction === 'en_attente_direction').map(f => (
                <div key={f.id} className="border rounded-lg p-3 bg-orange-50 space-y-2">
                  <p className="text-sm font-medium text-orange-800">📋 Formulaire en attente de validation</p>
                  <p className="text-xs text-gray-600">Signé le {f.date_signature || '—'}</p>
                  <div>
                    <Label className="text-xs">Date de validation Direction (obligatoire)</Label>
                    <input type="date" className="w-full border rounded px-2 py-1 text-sm mt-1"
                      value={dateValidationFormulaire}
                      onChange={e => setDateValidationFormulaire(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={!dateValidationFormulaire || loading}
                      onClick={() => handleValiderFormulaire(f.id, dateValidationFormulaire)}>
                      ✓ Valider
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200" disabled={loading}
                      onClick={() => handleRejeterFormulaire(f.id)}>
                      ✗ Annuler
                    </Button>
                  </div>
                </div>
              ))}

              {/* Étape 6 → Séjour */}
              {prospect.statut === 'formulaire_signe' && (
                <Button className="w-full" onClick={() => setShowSejourDialog(true)}>
                  <Hotel className="w-4 h-4 mr-2" /> Planifier séjour test
                </Button>
              )}

            </CardContent>
          </Card>

          {/* Apporteur */}
          {prospect.apporteur && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#1A3C6E]">Apporteur</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{(prospect.apporteur as {prenom:string;nom:string}).prenom} {(prospect.apporteur as {prenom:string;nom:string}).nom}</p>
                <p className="text-gray-400 text-xs">{(prospect.apporteur as {email:string}).email}</p>
              </CardContent>
            </Card>
          )}

          {/* Lot ciblé */}
          {prospect.lot_cible && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-[#1A3C6E]">Lot ciblé</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium font-mono">{(prospect.lot_cible as Lot).reference}</p>
                <p className="text-gray-500">{LOT_TYPE_LABELS[(prospect.lot_cible as Lot).type]}</p>
                <p className="text-[#C8973A] font-semibold">{formatCurrency((prospect.lot_cible as Lot).prix_individuel)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Visite Dialog */}
      <Dialog open={showVisiteDialog} onOpenChange={setShowVisiteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Planifier une visite</DialogTitle></DialogHeader>
          <form onSubmit={handleVisite} className="space-y-4">
            <div>
              <Label className="mb-2 block">Choisir une date disponible</Label>
              <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {jours.map(j => {
                  const full = (j.nb_visites ?? 0) >= j.capacite
                  const d = new Date(j.date + 'T00:00:00')
                  const label = `${DAY_FR[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`
                  return (
                    <button
                      key={j.id}
                      type="button"
                      disabled={full}
                      onClick={() => setVisiteData(p => ({ ...p, jour_id: j.id }))}
                      className={cn(
                        'flex flex-col items-center px-2 py-2 rounded-lg text-xs border transition-all',
                        full ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed opacity-60' :
                        visiteData.jour_id === j.id ? 'bg-[#1A3C6E] border-[#1A3C6E] text-white' :
                        j.prioritaire ? 'bg-[#C8973A]/10 border-[#C8973A]/50 text-[#8B6420] hover:bg-[#C8973A]/20' :
                        'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {j.prioritaire && <Star className="w-2.5 h-2.5 mb-0.5" />}
                      <span className="font-semibold">{label}</span>
                      <span className="opacity-70">{j.nb_visites ?? 0}/{j.capacite}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label>Notes pour la sécurité (optionnel)</Label>
              <Textarea
                value={visiteData.notes_apporteur}
                onChange={e => setVisiteData(p => ({ ...p, notes_apporteur: e.target.value }))}
                placeholder="Informations particulières..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowVisiteDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={loading || !visiteData.jour_id}>Confirmer la date</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voucher Dialog */}
      <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Émettre un voucher</DialogTitle></DialogHeader>
          <form onSubmit={handleVoucher} className="space-y-4">
            <div>
              <Label>Date de visite</Label>
              <Input type="date" value={voucherData.date_visite} onChange={e => setVoucherData(p => ({ ...p, date_visite: e.target.value }))} required />
            </div>
            <div>
              <Label>Créneau de visite</Label>
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-2xl">🌅</span>
                <div>
                  <p className="font-semibold text-amber-800">Coucher de soleil — 3H</p>
                  <p className="text-xs text-amber-600">Départ 17h00 · Durée 3 heures · Confirmez votre présence</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowVoucherDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>Émettre</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formulaire Dialog */}
      <Dialog open={showFormulaireDialog} onOpenChange={setShowFormulaireDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer formulaire signé</DialogTitle></DialogHeader>
          <form onSubmit={handleFormulaire} className="space-y-4">
            <div>
              <Label>Lots concernés (sélection multiple possible)</Label>
              <div className="space-y-1 mt-1">
                {lots.map(l => (
                  <label key={l.id} className="flex items-center gap-2 cursor-pointer p-2 rounded border hover:bg-gray-50">
                    <input type="checkbox" checked={formulaireData.lot_ids.includes(l.id)}
                      onChange={e => {
                        const ids = e.target.checked
                          ? [...formulaireData.lot_ids, l.id]
                          : formulaireData.lot_ids.filter(id => id !== l.id)
                        setFormulaireData(p => ({ ...p, lot_ids: ids, lot_id: ids[0] || '' }))
                      }}
                    />
                    <span className="text-sm">{l.reference} — {formatCurrency(l.prix_individuel)}</span>
                  </label>
                ))}
              </div>
              {formulaireData.lot_ids.length === 0 && <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un lot</p>}
            </div>
            <div>
              <Label>Type de formulaire</Label>
              <Select value={formulaireData.type} onValueChange={v => setFormulaireData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avec_acompte">Avec acompte</SelectItem>
                  <SelectItem value="sans_acompte">Sans acompte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Programme hôtelier</Label>
              <Select value={formulaireData.programme_hotelier} onValueChange={v => setFormulaireData(p => ({ ...p, programme_hotelier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="investisseur">Investisseur</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de signature</Label>
              <Input type="date" value={formulaireData.date_signature} onChange={e => setFormulaireData(p => ({ ...p, date_signature: e.target.value }))} required />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowFormulaireDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={loading || !formulaireData.lot_id}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Séjour Dialog */}
      <Dialog open={showSejourDialog} onOpenChange={setShowSejourDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Planifier séjour test</DialogTitle></DialogHeader>
          <form onSubmit={handleSejour} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date d'arrivée</Label>
                <Input type="date" value={sejourData.date_arrivee} onChange={e => setSejourData(p => ({ ...p, date_arrivee: e.target.value }))} required />
              </div>
              <div>
                <Label>Date de départ</Label>
                <Input type="date" value={sejourData.date_depart} onChange={e => setSejourData(p => ({ ...p, date_depart: e.target.value }))} required />
              </div>
              <div>
                <Label>Adultes</Label>
                <Input type="number" min={1} max={10} value={sejourData.nb_adultes} onChange={e => setSejourData(p => ({ ...p, nb_adultes: +e.target.value }))} />
              </div>
              <div>
                <Label>Enfants</Label>
                <Input type="number" min={0} max={10} value={sejourData.nb_enfants} onChange={e => setSejourData(p => ({ ...p, nb_enfants: +e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowSejourDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>Planifier</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
