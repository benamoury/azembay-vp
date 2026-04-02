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
  VOUCHER_STATUT_LABELS, VOUCHER_STATUT_COLORS,
} from '@/lib/utils'
import type { Prospect, Voucher, Formulaire, Sejour, Lot, UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Ticket, FileText,
  Hotel, CheckCircle, XCircle, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  avancerEtapeProspect, marquerNonConcluant, emettreLienSecurise,
  creerVoucher, creerFormulaire, creerSejour,
} from '@/actions/prospects'

interface Props {
  prospect: Prospect
  vouchers: Voucher[]
  formulaires: Formulaire[]
  sejours: Sejour[]
  lots: Lot[]
  managerId: string
  managerNom: string
  role: UserRole
}

const ETAPE_ACTIONS: Partial<Record<string, { label: string; nextStatut: string }>> = {
  valide: { label: 'Émettre un voucher', nextStatut: 'visite_programmee' },
  visite_programmee: { label: 'Marquer visite réalisée', nextStatut: 'visite_realisee' },
  visite_realisee: { label: 'Envoyer lien post-visite', nextStatut: 'dossier_envoye' },
  dossier_envoye: { label: 'Enregistrer formulaire signé', nextStatut: 'formulaire_signe' },
  formulaire_signe: { label: 'Planifier séjour / acte notarié', nextStatut: 'sejour_confirme' },
}

export function ProspectDetailClient({
  prospect: initialProspect,
  vouchers: initialVouchers,
  formulaires: initialFormulaires,
  sejours: initialSejours,
  lots,
  managerId,
  role,
}: Props) {
  const [prospect, setProspect] = useState(initialProspect)
  const [vouchers] = useState(initialVouchers)
  const [loading, setLoading] = useState(false)
  const [showVoucherDialog, setShowVoucherDialog] = useState(false)
  const [showFormulaireDialog, setShowFormulaireDialog] = useState(false)
  const [showSejourDialog, setShowSejourDialog] = useState(false)
  const [voucherData, setVoucherData] = useState({ date_visite: '', heure_visite: '10:00' })
  const [formulaireData, setFormulaireData] = useState({ lot_id: '', type: 'avec_acompte', programme_hotelier: 'standard', date_signature: '', sejour_test_souhaite: false })
  const [sejourData, setSejourData] = useState({ date_arrivee: '', date_depart: '', nb_adultes: 2, nb_enfants: 0 })
  const { toast } = useToast()
  const router = useRouter()

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

  async function handleFormulaire(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerFormulaire({ prospect_id: prospect.id, ...formulaireData })
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1A3C6E]">{prospect.prenom} {prospect.nom}</h1>
            {isHighValue && <Badge variant="orange">≥ 5M MAD</Badge>}
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PROSPECT_STATUT_COLORS[prospect.statut])}>
              {PROSPECT_STATUT_LABELS[prospect.statut]}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Créé le {formatDate(prospect.created_at)}</p>
        </div>
        {prospect.statut !== 'non_concluant' && prospect.statut !== 'vendu' && (
          <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={handleNonConcluant} disabled={loading}>
            <XCircle className="w-4 h-4 mr-1" /> Non concluant
          </Button>
        )}
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
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Card className="border-[#1A3C6E]/20 bg-[#1A3C6E]/5">
            <CardHeader><CardTitle className="text-[#1A3C6E] text-sm">Actions CRM</CardTitle></CardHeader>
            <CardContent className="space-y-3">

              {/* Étape 2 → Voucher */}
              {prospect.statut === 'valide' && (
                <Button className="w-full" onClick={() => setShowVoucherDialog(true)}>
                  <Ticket className="w-4 h-4 mr-2" /> Émettre un voucher
                </Button>
              )}

              {/* Étape 3 → Marquer visite réalisée */}
              {prospect.statut === 'visite_programmee' && (
                <Button className="w-full" onClick={handleAvancer} disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Visite réalisée
                </Button>
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

              {/* Étape 6 → Séjour */}
              {prospect.statut === 'formulaire_signe' && (
                <Button className="w-full" onClick={() => setShowSejourDialog(true)}>
                  <Hotel className="w-4 h-4 mr-2" /> Planifier séjour test
                </Button>
              )}

              {prospect.statut !== 'non_concluant' && prospect.statut !== 'vendu' && (
                <Button variant="outline" className="w-full text-xs" size="sm" onClick={handleAvancer} disabled={loading || !action}>
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  {action?.label || 'Étape suivante'}
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
              <Label>Heure</Label>
              <Input type="time" value={voucherData.heure_visite} onChange={e => setVoucherData(p => ({ ...p, heure_visite: e.target.value }))} required />
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
              <Label>Lot</Label>
              <Select value={formulaireData.lot_id} onValueChange={v => setFormulaireData(p => ({ ...p, lot_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un lot" /></SelectTrigger>
                <SelectContent>
                  {lots.map(l => <SelectItem key={l.id} value={l.id}>{l.reference} — {formatCurrency(l.prix_individuel)}</SelectItem>)}
                </SelectContent>
              </Select>
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
