'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, LOT_TYPE_LABELS } from '@/lib/utils'
import { soumettreProspect } from '@/actions/prospects'
import { PlusCircle, Info } from 'lucide-react'

interface SoumettreClientProps {
  lots: { id: string; reference: string; type: string; prix_individuel: number }[]
  apporteurId: string
}

export function SoumettreClient({ lots, apporteurId }: SoumettreClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    ville: '', pays: 'Maroc', nationalite: '',
    profil: '', localisation: '',
    budget_estime: '', capacite_financiere: '',
    reference_personnelle: '', valeur_ajoutee: '',
    lot_cible_id: '', notes: '',
  })

  function set(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      apporteur_id: apporteurId,
      budget_estime: form.budget_estime ? parseFloat(form.budget_estime) : undefined,
      lot_cible_id: form.lot_cible_id || undefined,
    }

    const result = await soumettreProspect(payload as never)
    if (result.success) {
      toast({ title: 'Prospect soumis', description: 'Votre prospect a été soumis pour validation.' })
      router.push('/mes-prospects')
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Soumettre un prospect</h1>
        <p className="text-sm text-gray-500 mt-1">Tous les prospects soumis seront validés par le Manager ou la Direction.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Rappel :</strong> Les prospects avec un budget ≥ 5M MAD seront soumis à la validation du Directeur.
          Vous serez notifié par email dès que votre prospect est validé.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-[#1A3C6E]">Informations personnelles</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={e => set('prenom', e.target.value)} required />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => set('nom', e.target.value)} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.ville} onChange={e => set('ville', e.target.value)} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.pays} onChange={e => set('pays', e.target.value)} />
            </div>
            <div>
              <Label>Nationalité</Label>
              <Input value={form.nationalite} onChange={e => set('nationalite', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-[#1A3C6E]">Profil investisseur</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Profil</Label>
              <Select value={form.profil} onValueChange={v => set('profil', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="investisseur_pur">Investisseur pur</SelectItem>
                  <SelectItem value="residence_secondaire">Résidence secondaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localisation</Label>
              <Select value={form.localisation} onValueChange={v => set('localisation', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hors_casa">Hors Casa</SelectItem>
                  <SelectItem value="nmr">NMR (Non-résident marocain)</SelectItem>
                  <SelectItem value="casablanca">Casablanca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget estimé (MAD)</Label>
              <Input
                type="number"
                value={form.budget_estime}
                onChange={e => set('budget_estime', e.target.value)}
                placeholder="ex: 2100000"
              />
            </div>
            <div>
              <Label>Capacité financière</Label>
              <Input value={form.capacite_financiere} onChange={e => set('capacite_financiere', e.target.value)} placeholder="Ex: Fonds propres, financement..." />
            </div>
            <div>
              <Label>Lot ciblé (optionnel)</Label>
              <Select value={form.lot_cible_id} onValueChange={v => set('lot_cible_id', v)}>
                <SelectTrigger><SelectValue placeholder="Aucune préférence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune préférence</SelectItem>
                  {lots.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.reference} — {LOT_TYPE_LABELS[l.type as keyof typeof LOT_TYPE_LABELS]} — {formatCurrency(l.prix_individuel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-[#1A3C6E]">Contexte de la relation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Référence personnelle (comment connaissez-vous ce prospect ?)</Label>
              <Textarea value={form.reference_personnelle} onChange={e => set('reference_personnelle', e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Valeur ajoutée de ce prospect</Label>
              <Textarea value={form.valeur_ajoutee} onChange={e => set('valeur_ajoutee', e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Notes complémentaires</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" />
            {loading ? 'Soumission en cours...' : 'Soumettre le prospect'}
          </Button>
        </div>
      </form>
    </div>
  )
}
