'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, ROLE_LABELS, LOT_TYPE_LABELS } from '@/lib/utils'
import type { Profile, Lot, Document } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { Users, Home, FileText, Plus, Calendar, Hotel, Trash2, Star, ToggleLeft, ToggleRight } from 'lucide-react'
import { creerUtilisateur, modifierStatutLot } from '@/actions/prospects'
import { creerJourDisponible, supprimerJourDisponible, toggleJourActif, creerWeekend, supprimerWeekend } from '@/actions/planning'
import { cn } from '@/lib/utils'

interface JourDisponible {
  id: string
  date: string
  capacite: number
  prioritaire: boolean
  actif: boolean
}

interface WeekendActif {
  id: string
  date_vendredi: string
  date_samedi: string
  date_dimanche?: string
  capacite_max: number
  statut: string
  nb_sejours_confirmes: number
}

interface ParametrageClientProps {
  utilisateurs: Profile[]
  lots: Lot[]
  documents: Document[]
  jours: JourDisponible[]
  weekends: WeekendActif[]
}

const WEEKEND_STATUT_COLORS: Record<string, string> = {
  pre_liste: 'bg-gray-100 text-gray-600',
  ouvert: 'bg-green-100 text-green-700',
  validation: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-blue-100 text-blue-700',
  ferme: 'bg-red-100 text-red-600',
}

const WEEKEND_STATUT_LABELS: Record<string, string> = {
  pre_liste: 'Pré-liste',
  ouvert: 'Ouvert',
  validation: 'En validation',
  confirme: 'Confirmé',
  ferme: 'Fermé',
}

export function ParametrageClient({ utilisateurs: initUsers, lots: initLots, documents, jours: initJours, weekends: initWeekends }: ParametrageClientProps) {
  const [utilisateurs, setUtilisateurs] = useState(initUsers)
  const [lots, setLots] = useState(initLots)
  const [jours, setJours] = useState(initJours)
  const [weekends, setWeekends] = useState(initWeekends)
  const [newUser, setNewUser] = useState({ email: '', prenom: '', nom: '', telephone: '', role: 'apporteur' as const })
  const [newJour, setNewJour] = useState({ date: '', capacite: 3, prioritaire: false, actif: true })
  const [newWeekend, setNewWeekend] = useState({ date_vendredi: '', date_samedi: '', date_dimanche: '', capacite_max: 6 })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Auto-fill samedi et dimanche quand vendredi est saisi
  function handleVendrediChange(date: string) {
    if (!date) { setNewWeekend(p => ({ ...p, date_vendredi: '' })); return }
    const d = new Date(date + 'T00:00:00')
    const samedi = new Date(d); samedi.setDate(d.getDate() + 1)
    const dimanche = new Date(d); dimanche.setDate(d.getDate() + 2)
    setNewWeekend({
      date_vendredi: date,
      date_samedi: samedi.toISOString().split('T')[0],
      date_dimanche: dimanche.toISOString().split('T')[0],
      capacite_max: newWeekend.capacite_max,
    })
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerUtilisateur(newUser)
    if (result.success) {
      toast({ title: 'Utilisateur créé', description: `${newUser.prenom} ${newUser.nom} a été ajouté.` })
      setNewUser({ email: '', prenom: '', nom: '', telephone: '', role: 'apporteur' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleLotStatut(lotId: string, statut: string) {
    const result = await modifierStatutLot(lotId, statut as 'disponible' | 'bloque' | 'vendu')
    if (result.success) {
      setLots(prev => prev.map(l => l.id === lotId ? { ...l, statut: statut as never } : l))
      toast({ title: 'Lot mis à jour' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  async function handleCreateJour(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerJourDisponible(newJour)
    if (result.success && result.jour) {
      setJours(prev => [...prev, result.jour!].sort((a, b) => a.date.localeCompare(b.date)))
      setNewJour({ date: '', capacite: 3, prioritaire: false, actif: true })
      toast({ title: '✓ Date ajoutée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleSupprimerJour(id: string) {
    const result = await supprimerJourDisponible(id)
    if (result.success) {
      setJours(prev => prev.filter(j => j.id !== id))
      toast({ title: 'Date supprimée' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  async function handleToggleJour(id: string, actif: boolean) {
    const result = await toggleJourActif(id, !actif)
    if (result.success) {
      setJours(prev => prev.map(j => j.id === id ? { ...j, actif: !actif } : j))
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  async function handleCreateWeekend(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeekend.date_vendredi || !newWeekend.date_samedi) return
    setLoading(true)
    const result = await creerWeekend({
      date_vendredi: newWeekend.date_vendredi,
      date_samedi: newWeekend.date_samedi,
      date_dimanche: newWeekend.date_dimanche,
      capacite_max: newWeekend.capacite_max,
    })
    if (result.success && result.weekend) {
      setWeekends(prev => [...prev, result.weekend!].sort((a, b) => a.date_vendredi.localeCompare(b.date_vendredi)))
      setNewWeekend({ date_vendredi: '', date_samedi: '', date_dimanche: '', capacite_max: 6 })
      toast({ title: '✓ Weekend ajouté' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function handleSupprimerWeekend(id: string) {
    const result = await supprimerWeekend(id)
    if (result.success) {
      setWeekends(prev => prev.filter(w => w.id !== id))
      toast({ title: 'Weekend supprimé' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
  }

  function formatDate(date: string) {
    return new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Paramétrage</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des utilisateurs, lots, visites et weekends</p>
      </div>

      <Tabs defaultValue="utilisateurs">
        <TabsList>
          <TabsTrigger value="utilisateurs" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="lots" className="flex items-center gap-2">
            <Home className="w-4 h-4" /> Lots
          </TabsTrigger>
          <TabsTrigger value="visites" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Jours de visite
          </TabsTrigger>
          <TabsTrigger value="weekends" className="flex items-center gap-2">
            <Hotel className="w-4 h-4" /> Weekends séjours
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* Utilisateurs */}
        <TabsContent value="utilisateurs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                <Plus className="w-4 h-4" /> Créer un utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Prénom</Label>
                  <Input value={newUser.prenom} onChange={e => setNewUser(p => ({ ...p, prenom: e.target.value }))} required />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={newUser.nom} onChange={e => setNewUser(p => ({ ...p, nom: e.target.value }))} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={newUser.telephone} onChange={e => setNewUser(p => ({ ...p, telephone: e.target.value }))} />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v as never }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading} className="w-full">Créer</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E]">Utilisateurs ({utilisateurs.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {utilisateurs.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-400">{u.email}{u.telephone ? ` · ${u.telephone}` : ''}</p>
                    </div>
                    <Badge variant={u.role === 'direction' ? 'default' : u.role === 'manager' ? 'green' : u.role === 'apporteur' ? 'orange' : 'gray'}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lots */}
        <TabsContent value="lots" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E]">Gestion des 16 lots</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lots.map(lot => (
                  <div key={lot.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-bold text-[#1A3C6E] w-24">{lot.reference}</span>
                      <div>
                        <p className="text-sm">{LOT_TYPE_LABELS[lot.type]}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(lot.prix_individuel)}</p>
                      </div>
                    </div>
                    <Select value={lot.statut} onValueChange={v => handleLotStatut(lot.id, v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="bloque">Bloqué</SelectItem>
                        <SelectItem value="vendu">Vendu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jours de visite */}
        <TabsContent value="visites" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter un jour de visite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateJour} className="flex items-end gap-4 flex-wrap">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={newJour.date} onChange={e => setNewJour(p => ({ ...p, date: e.target.value }))} required className="w-44" />
                </div>
                <div>
                  <Label>Capacité (max / jour)</Label>
                  <Input type="number" min={1} max={10} value={newJour.capacite} onChange={e => setNewJour(p => ({ ...p, capacite: +e.target.value }))} className="w-24" />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <input
                    type="checkbox"
                    id="prioritaire"
                    checked={newJour.prioritaire}
                    onChange={e => setNewJour(p => ({ ...p, prioritaire: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="prioritaire" className="cursor-pointer flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#C8973A]" /> Prioritaire
                  </Label>
                </div>
                <Button type="submit" disabled={loading || !newJour.date}>Ajouter</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E]">Dates planifiées ({jours.length})</CardTitle></CardHeader>
            <CardContent>
              {jours.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aucune date de visite configurée.</p>
              ) : (
                <div className="space-y-1">
                  {jours.map(j => (
                    <div key={j.id} className={cn('flex items-center justify-between py-2.5 px-3 rounded-lg border', j.actif ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60')}>
                      <div className="flex items-center gap-3">
                        {j.prioritaire && <Star className="w-3.5 h-3.5 text-[#C8973A] fill-[#C8973A]" />}
                        <div>
                          <p className="text-sm font-medium capitalize">{formatDate(j.date)}</p>
                          <p className="text-xs text-gray-400">Capacité : {j.capacite} visite(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={j.actif ? 'green' : 'gray'}>{j.actif ? 'Actif' : 'Inactif'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleJour(j.id, j.actif)} title={j.actif ? 'Désactiver' : 'Activer'}>
                          {j.actif ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerJour(j.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekends séjours */}
        <TabsContent value="weekends" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                <Plus className="w-4 h-4" /> Créer un weekend séjour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWeekend} className="flex items-end gap-4 flex-wrap">
                <div>
                  <Label>Vendredi</Label>
                  <Input
                    type="date"
                    value={newWeekend.date_vendredi}
                    onChange={e => handleVendrediChange(e.target.value)}
                    required
                    className="w-44"
                  />
                </div>
                <div>
                  <Label>Samedi</Label>
                  <Input type="date" value={newWeekend.date_samedi} readOnly className="w-44 bg-gray-50" />
                </div>
                <div>
                  <Label>Dimanche</Label>
                  <Input type="date" value={newWeekend.date_dimanche} readOnly className="w-44 bg-gray-50" />
                </div>
                <div>
                  <Label>Capacité max</Label>
                  <Input type="number" min={1} max={20} value={newWeekend.capacite_max} onChange={e => setNewWeekend(p => ({ ...p, capacite_max: +e.target.value }))} className="w-24" />
                </div>
                <Button type="submit" disabled={loading || !newWeekend.date_vendredi}>Créer</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E]">Weekends planifiés ({weekends.length})</CardTitle></CardHeader>
            <CardContent>
              {weekends.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aucun weekend séjour configuré.</p>
              ) : (
                <div className="space-y-2">
                  {weekends.map(w => (
                    <div key={w.id} className="flex items-center justify-between py-3 px-3 rounded-lg border bg-white">
                      <div>
                        <p className="text-sm font-medium">
                          Ven. {formatDate(w.date_vendredi)} → Dim. {w.date_dimanche ? formatDate(w.date_dimanche) : '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {w.nb_sejours_confirmes}/{w.capacite_max} séjour(s) · Capacité max {w.capacite_max}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', WEEKEND_STATUT_COLORS[w.statut])}>
                          {WEEKEND_STATUT_LABELS[w.statut] || w.statut}
                        </span>
                        {w.nb_sejours_confirmes === 0 && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerWeekend(w.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-[#1A3C6E]">Documents ({documents.length})</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun document — uploadez des documents depuis la page Documents.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{d.nom}</p>
                        <p className="text-xs text-gray-400">{d.categorie.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge variant={d.actif ? 'green' : 'gray'}>
                        {d.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
