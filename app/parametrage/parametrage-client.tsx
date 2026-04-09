'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Home, FileText, Plus, Trash2, Pencil, Check, X, Upload, Calendar, Tag } from 'lucide-react'
import { creerUtilisateur, modifierUtilisateur, supprimerUtilisateur, modifierStatutLot, modifierPrixLot } from '@/actions/prospects'
import { uploadDocument, toggleDocumentActif, supprimerDocument } from '@/actions/documents'
import { creerWeekend, supprimerWeekend, creerJourDisponible, supprimerJourDisponible, toggleJourActif } from '@/actions/planning'
import { creerSourceRemuneree, supprimerSourceRemuneree, creerAcquereur, supprimerAcquereur, getAcquereurs } from '@/actions/prospects'
import { formatCurrency } from '@/lib/utils'
import type { Profile, Lot, Document } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  direction: 'Direction',
  manager: 'Manager',
  apporteur: 'Apporteur',
  securite: 'Sécurité',
}

const ROLE_COLORS: Record<string, string> = {
  direction: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  apporteur: 'bg-orange-100 text-orange-800',
  securite: 'bg-gray-100 text-gray-800',
}

const CATEGORIE_LABELS: Record<string, string> = {
  presentation_pre_visite: 'Présentation pré-visite',
  presentation_post_visite: 'Présentation post-visite',
  forwardable: 'Transférable',
  interne: 'Interne',
}

interface Props {
  utilisateurs: Profile[]
  lots: Lot[]
  documents: Document[]
  jours: any[]
  weekends: any[]
  sources: any[]
}

export function ParametrageClient({ utilisateurs: initUsers, lots: initLots, documents: initDocs, jours: initJours, weekends: initWeekends, sources: initSources }: Props) {
  const { toast } = useToast()

  // UTILISATEURS
  const [users, setUsers] = useState(initUsers)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserData, setEditUserData] = useState<any>({})
  const [newUser, setNewUser] = useState({ prenom: '', nom: '', email: '', telephone: '', role: 'apporteur' })
  const [creatingUser, setCreatingUser] = useState(false)

  async function handleCreerUtilisateur() {
    if (!newUser.prenom || !newUser.nom || !newUser.email) {
      toast({ title: 'Champs obligatoires manquants', variant: 'destructive' })
      return
    }
    setCreatingUser(true)
    const res = await creerUtilisateur(newUser as any)
    setCreatingUser(false)
    if (res.success) {
      toast({ title: 'Utilisateur créé', description: `Invitation envoyée à ${newUser.email}` })
      setNewUser({ prenom: '', nom: '', email: '', telephone: '', role: 'apporteur' })
      window.location.reload()
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  function startEditUser(user: Profile) {
    setEditingUserId(user.id)
    setEditUserData({ nom: user.nom, prenom: user.prenom, telephone: user.telephone || '', role: user.role })
  }

  async function handleModifierUtilisateur(userId: string) {
    const res = await modifierUtilisateur(userId, editUserData)
    if (res.success) {
      toast({ title: 'Utilisateur modifié' })
      setUsers(users.map(u => u.id === userId ? { ...u, ...editUserData } : u))
      setEditingUserId(null)
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  async function handleSupprimerUtilisateur(userId: string, nom: string) {
    if (!confirm(`Supprimer ${nom} ? Cette action est irréversible.`)) return
    const res = await supprimerUtilisateur(userId)
    if (res.success) {
      toast({ title: 'Utilisateur supprimé' })
      setUsers(users.filter(u => u.id !== userId))
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  // LOTS
  const [lots, setLots] = useState(initLots)
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [editLotPrix, setEditLotPrix] = useState<{ prix_individuel: string; prix_bloc: string }>({ prix_individuel: '', prix_bloc: '' })

  async function handleStatutLot(lotId: string, statut: 'disponible' | 'bloque' | 'vendu') {
    const res = await modifierStatutLot(lotId, statut)
    if (res.success) {
      setLots(lots.map(l => l.id === lotId ? { ...l, statut } : l))
      toast({ title: 'Statut mis à jour' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  function startEditLot(lot: Lot) {
    setEditingLotId(lot.id)
    setEditLotPrix({
      prix_individuel: lot.prix_individuel?.toString() || '',
      prix_bloc: lot.prix_bloc?.toString() || '',
    })
  }

  async function handleModifierPrixLot(lotId: string) {
    const data: { prix_individuel?: number; prix_bloc?: number } = {}
    if (editLotPrix.prix_individuel) data.prix_individuel = parseFloat(editLotPrix.prix_individuel)
    if (editLotPrix.prix_bloc) data.prix_bloc = parseFloat(editLotPrix.prix_bloc)
    const res = await modifierPrixLot(lotId, data)
    if (res.success) {
      toast({ title: 'Prix mis à jour' })
      setLots(lots.map(l => l.id === lotId ? { ...l, ...data } : l))
      setEditingLotId(null)
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  // DOCUMENTS
  const [docs, setDocs] = useState(initDocs)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [newDoc, setNewDoc] = useState({
    nom: '',
    description: '',
    categorie: 'presentation_pre_visite',
    etape_disponibilite: '',
    profils_autorises: [] as string[],
    forward_autorise: false,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // PLANNING
  const [jours, setJours] = useState<any[]>(initJours || [])
  const [weekends, setWeekends] = useState<any[]>(initWeekends || [])
  const [newJour, setNewJour] = useState({ date: '', capacite: 6, prioritaire: false, actif: true })
  const [newWeekend, setNewWeekend] = useState({ date_vendredi: '', date_samedi: '', date_dimanche: '', capacite_max: 10 })
  const [addingJour, setAddingJour] = useState(false)
  const [addingWeekend, setAddingWeekend] = useState(false)

  // SOURCES REMUNEREES
  const [sources, setSources] = useState<any[]>(initSources || [])
  const [acquereurs, setAcquereurs] = useState<any[]>([])

  // Charger les acquéreurs (appelé une fois au premier render via useEffect pattern)
  const [acqueureursLoaded, setAcqueureursLoaded] = useState(false)
  if (!acqueureursLoaded) {
    setAcqueureursLoaded(true)
    getAcquereurs().then((data: any[]) => setAcquereurs(data))
  }
  const [loadingAcquereurs, setLoadingAcquereurs] = useState(false)
  const [newAcquereur, setNewAcquereur] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [addingAcquereur, setAddingAcquereur] = useState(false)

  async function handleCreerAcquereur() {
    if (!newAcquereur.nom.trim() || !newAcquereur.prenom.trim()) return
    setAddingAcquereur(true)
    const res = await creerAcquereur({ ...newAcquereur })
    if (res.success && res.acquereur) {
      setAcquereurs(prev => [...prev, res.acquereur])
      setNewAcquereur({ nom: '', prenom: '', email: '', telephone: '' })
      toast({ title: '✓ Acquéreur ajouté' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
    setAddingAcquereur(false)
  }

  async function handleSupprimerAcquereur(id: string) {
    const res = await supprimerAcquereur(id)
    if (res.success) {
      setAcquereurs(prev => prev.filter((a: any) => a.id !== id))
      toast({ title: 'Acquéreur supprimé' })
    }
  }
  const [newSource, setNewSource] = useState({ nom: '', description: '' })
  const [addingSource, setAddingSource] = useState(false)

  async function handleCreerSource() {
    if (!newSource.nom.trim()) return
    setAddingSource(true)
    try {
      const res = await creerSourceRemuneree(newSource)
      if (res.success) {
        setSources(prev => [...prev, res.source])
        setNewSource({ nom: '', description: '' })
        toast({ title: 'Source ajoutée' })
      } else {
        toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
      }
    } finally { setAddingSource(false) }
  }

  async function handleSupprimerSource(id: string) {
    const res = await supprimerSourceRemuneree(id)
    if (res.success) {
      setSources(prev => prev.filter(s => s.id !== id))
      toast({ title: 'Source supprimée' })
    }
  }

  async function handleCreerJour() {
    if (!newJour.date) return
    setAddingJour(true)
    try {
      const res = await creerJourDisponible(newJour)
      if (res.success) {
        setJours(prev => [...prev, res.jour])
        setNewJour({ date: '', capacite: 6, prioritaire: false, actif: true })
        toast({ title: 'Jour ajouté' })
      } else {
        toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
      }
    } finally { setAddingJour(false) }
  }

  async function handleSupprimerJour(id: string) {
    const res = await supprimerJourDisponible(id)
    if (res.success) {
      setJours(prev => prev.filter(j => j.id !== id))
      toast({ title: 'Jour supprimé' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  async function handleToggleJour(id: string, actif: boolean) {
    const res = await toggleJourActif(id, !actif)
    if (res.success) {
      setJours(prev => prev.map(j => j.id === id ? { ...j, actif: !actif } : j))
    }
  }

  async function handleCreerWeekend() {
    if (!newWeekend.date_vendredi) return
    setAddingWeekend(true)
    try {
      const res = await creerWeekend(newWeekend)
      if (res.success) {
        setWeekends(prev => [...prev, res.weekend])
        setNewWeekend({ date_vendredi: '', date_samedi: '', date_dimanche: '', capacite_max: 10 })
        toast({ title: 'Weekend ajouté' })
      } else {
        toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
      }
    } finally { setAddingWeekend(false) }
  }

  async function handleSupprimerWeekend(id: string) {
    const res = await supprimerWeekend(id)
    if (res.success) {
      setWeekends(prev => prev.filter(w => w.id !== id))
      toast({ title: 'Weekend supprimé' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  async function handleUploadDocument() {
    if (!selectedFile || !newDoc.nom || !newDoc.categorie) {
      toast({ title: 'Fichier, nom et catégorie obligatoires', variant: 'destructive' })
      return
    }
    setUploadingDoc(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('nom', newDoc.nom)
    formData.append('description', newDoc.description)
    formData.append('categorie', newDoc.categorie)
    formData.append('etape_disponibilite', newDoc.etape_disponibilite)
    formData.append('profils_autorises', JSON.stringify(newDoc.profils_autorises))
    formData.append('forward_autorise', String(newDoc.forward_autorise))
    formData.append('uploaded_by', '')
    const res = await uploadDocument(formData)
    setUploadingDoc(false)
    if (res.success) {
      toast({ title: 'Document uploadé' })
      setNewDoc({ nom: '', description: '', categorie: 'presentation_pre_visite', etape_disponibilite: '', profils_autorises: [], forward_autorise: false })
      setSelectedFile(null)
      window.location.reload()
    } else {
      toast({ title: 'Erreur upload', description: res.error, variant: 'destructive' })
    }
  }

  async function handleToggleDoc(docId: string, actif: boolean) {
    const res = await toggleDocumentActif(docId, !actif)
    if (res.success) {
      setDocs(docs.map(d => d.id === docId ? { ...d, actif: !actif } : d))
      toast({ title: actif ? 'Document désactivé' : 'Document activé' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  async function handleSupprimerDoc(docId: string, nom: string) {
    if (!confirm(`Supprimer "${nom}" ? Cette action est irréversible.`)) return
    const res = await supprimerDocument(docId)
    if (res.success) {
      setDocs(docs.filter(d => d.id !== docId))
      toast({ title: 'Document supprimé' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
  }

  function toggleProfilAutorise(profil: string) {
    setNewDoc(d => ({
      ...d,
      profils_autorises: d.profils_autorises.includes(profil)
        ? d.profils_autorises.filter(p => p !== profil)
        : [...d.profils_autorises, profil],
    }))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Paramétrage</h1>
        <p className="text-gray-500 mt-1">Gestion des utilisateurs, lots et documents</p>
      </div>

      <Tabs defaultValue="utilisateurs">
        <TabsList className="mb-6">
          <TabsTrigger value="utilisateurs"><Users className="w-4 h-4 mr-2" />Utilisateurs</TabsTrigger>
          <TabsTrigger value="lots"><Home className="w-4 h-4 mr-2" />Lots</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" />Documents</TabsTrigger>
          <TabsTrigger value="planning"><Calendar className="w-4 h-4 mr-2" />Planning</TabsTrigger>
          <TabsTrigger value="sources"><Tag className="w-4 h-4 mr-2" />Sources rémunérées</TabsTrigger>
          <TabsTrigger value="acquereurs"><Users className="w-4 h-4 mr-2" />Acquéreurs</TabsTrigger>
        </TabsList>

        {/* UTILISATEURS */}
        <TabsContent value="utilisateurs">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="w-4 h-4" /> Créer un utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Prénom</Label>
                  <Input value={newUser.prenom} onChange={e => setNewUser({ ...newUser, prenom: e.target.value })} placeholder="Prénom" />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={newUser.nom} onChange={e => setNewUser({ ...newUser, nom: e.target.value })} placeholder="Nom" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@example.com" type="email" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={newUser.telephone} onChange={e => setNewUser({ ...newUser, telephone: e.target.value })} placeholder="+212 6xx xxx xxx" />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreerUtilisateur} disabled={creatingUser} className="w-full">
                    {creatingUser ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilisateurs ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    {editingUserId === user.id ? (
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 mr-4">
                        <Input value={editUserData.prenom} onChange={e => setEditUserData({ ...editUserData, prenom: e.target.value })} placeholder="Prénom" />
                        <Input value={editUserData.nom} onChange={e => setEditUserData({ ...editUserData, nom: e.target.value })} placeholder="Nom" />
                        <Input value={editUserData.telephone} onChange={e => setEditUserData({ ...editUserData, telephone: e.target.value })} placeholder="Téléphone" />
                        <Select value={editUserData.role} onValueChange={v => setEditUserData({ ...editUserData, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.prenom} {user.nom}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.telephone && <p className="text-sm text-gray-400">{user.telephone}</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {editingUserId === user.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleModifierUtilisateur(user.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || ''}`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => startEditUser(user)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerUtilisateur(user.id, `${user.prenom} ${user.nom}`)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOTS */}
        <TabsContent value="lots">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestion des {lots.length} lots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lots.map(lot => (
                  <div key={lot.id} className="flex items-center justify-between py-3 border-b last:border-0 gap-4">
                    <div className="w-16 font-bold text-blue-900">{lot.reference}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {lot.type === 'villa_e' ? 'Villa' : lot.type === 'appart_2ch' ? 'Appartement 2 chambres' : 'Appartement 1 chambre'}
                      </p>
                      {editingLotId === lot.id ? (
                        <div className="flex gap-3 mt-2">
                          <div>
                            <Label className="text-xs">Prix individuel (MAD)</Label>
                            <Input type="number" value={editLotPrix.prix_individuel} onChange={e => setEditLotPrix({ ...editLotPrix, prix_individuel: e.target.value })} placeholder="ex: 1770000" className="w-40" />
                          </div>
                          <div>
                            <Label className="text-xs">Prix bloc (MAD)</Label>
                            <Input type="number" value={editLotPrix.prix_bloc} onChange={e => setEditLotPrix({ ...editLotPrix, prix_bloc: e.target.value })} placeholder="optionnel" className="w-40" />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {lot.prix_individuel
                            ? formatCurrency(lot.prix_individuel)
                            : <span className="text-orange-500 font-medium">Prix manquant</span>}
                          {lot.prix_bloc && <span className="text-gray-400"> · Bloc : {formatCurrency(lot.prix_bloc)}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingLotId === lot.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleModifierPrixLot(lot.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingLotId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Select value={lot.statut} onValueChange={v => handleStatutLot(lot.id, v as any)}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disponible">Disponible</SelectItem>
                              <SelectItem value="bloque">Bloqué</SelectItem>
                              <SelectItem value="vendu">Vendu</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" onClick={() => startEditLot(lot)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4" /> Ajouter un document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Nom du document</Label>
                  <Input value={newDoc.nom} onChange={e => setNewDoc({ ...newDoc, nom: e.target.value })} placeholder="ex: Présentation Azembay RIPT 1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newDoc.description} onChange={e => setNewDoc({ ...newDoc, description: e.target.value })} placeholder="Description courte" />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={newDoc.categorie} onValueChange={v => setNewDoc({ ...newDoc, categorie: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Étape de disponibilité</Label>
                  <Input value={newDoc.etape_disponibilite} onChange={e => setNewDoc({ ...newDoc, etape_disponibilite: e.target.value })} placeholder="ex: post_visite" />
                </div>
                <div>
                  <Label>Profils autorisés</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => toggleProfilAutorise(k)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${newDoc.profils_autorises.includes(k) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Label>Transférable au client</Label>
                  <button type="button" onClick={() => setNewDoc({ ...newDoc, forward_autorise: !newDoc.forward_autorise })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newDoc.forward_autorise ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newDoc.forward_autorise ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-500">{newDoc.forward_autorise ? 'Oui' : 'Non'}</span>
                </div>
              </div>
              <div className="mb-4">
                <Label>Fichier</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleUploadDocument} disabled={uploadingDoc}>
                {uploadingDoc ? 'Upload en cours...' : 'Ajouter le document'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents ({docs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Aucun document. Ajoutez-en un ci-dessus.</p>
                )}
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{doc.nom}</p>
                      <p className="text-sm text-gray-500">{doc.description}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                          {CATEGORIE_LABELS[doc.categorie] || doc.categorie}
                        </span>
                        {doc.forward_autorise && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700">Transférable</span>
                        )}
                        {doc.profils_autorises?.map((p: string) => (
                          <span key={p} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{ROLE_LABELS[p] || p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {doc.actif ? 'Actif' : 'Inactif'}
                      </span>
                      <button type="button" onClick={() => handleToggleDoc(doc.id, doc.actif)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${doc.actif ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${doc.actif ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerDoc(doc.id, doc.nom)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="planning">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* JOURS DE VISITE */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ajouter un jour de visite</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={newJour.date} onChange={e => setNewJour({ ...newJour, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Capacité (nb visites max)</Label>
                    <Input type="number" min={1} max={20} value={newJour.capacite} onChange={e => setNewJour({ ...newJour, capacite: parseInt(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label>Prioritaire</Label>
                    <button type="button" onClick={() => setNewJour({ ...newJour, prioritaire: !newJour.prioritaire })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newJour.prioritaire ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newJour.prioritaire ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <Button onClick={handleCreerJour} disabled={addingJour || !newJour.date} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />{addingJour ? 'Ajout...' : 'Ajouter le jour'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Jours de visite ({jours.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {jours.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun jour de visite configuré.</p>}
                  <div className="space-y-2">
                    {jours.map(j => (
                      <div key={j.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500">Capacité : {j.capacite} {j.prioritaire && <span className="text-orange-600 font-medium">· Prioritaire</span>}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleToggleJour(j.id, j.actif)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${j.actif ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${j.actif ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerJour(j.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* WEEKENDS SEJOURS */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ajouter un weekend de séjour</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Vendredi</Label>
                    <Input type="date" value={newWeekend.date_vendredi}
                      onChange={e => {
                        const ven = e.target.value
                        if (ven) {
                          const d = new Date(ven)
                          const sam = new Date(d); sam.setDate(d.getDate() + 1)
                          const dim = new Date(d); dim.setDate(d.getDate() + 2)
                          setNewWeekend({
                            ...newWeekend,
                            date_vendredi: ven,
                            date_samedi: sam.toISOString().split('T')[0],
                            date_dimanche: dim.toISOString().split('T')[0],
                          })
                        } else {
                          setNewWeekend({ ...newWeekend, date_vendredi: '', date_samedi: '', date_dimanche: '' })
                        }
                      }} />
                  </div>
                  <div>
                    <Label>Samedi (auto)</Label>
                    <Input type="date" value={newWeekend.date_samedi} onChange={e => setNewWeekend({ ...newWeekend, date_samedi: e.target.value })} />
                  </div>
                  <div>
                    <Label>Dimanche (auto)</Label>
                    <Input type="date" value={newWeekend.date_dimanche} onChange={e => setNewWeekend({ ...newWeekend, date_dimanche: e.target.value })} />
                  </div>
                  <div>
                    <Label>Capacité max (séjours)</Label>
                    <Input type="number" min={1} max={50} value={newWeekend.capacite_max} onChange={e => setNewWeekend({ ...newWeekend, capacite_max: parseInt(e.target.value) })} />
                  </div>
                  <Button onClick={handleCreerWeekend} disabled={addingWeekend || !newWeekend.date_vendredi} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />{addingWeekend ? 'Ajout...' : 'Ajouter le weekend'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekends de séjour ({weekends.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {weekends.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun weekend configuré.</p>}
                  <div className="space-y-2">
                    {weekends.map(w => (
                      <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(w.date_vendredi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(w.date_dimanche).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            Capacité : {w.capacite_max} · {w.nb_sejours_confirmes || 0} confirmé(s) · <span className={w.statut === 'ouvert' ? 'text-green-600' : 'text-red-500'}>{w.statut}</span>
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerWeekend(w.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="sources">
          <div className="max-w-xl space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter une source rémunérée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nom de la source</Label>
                  <Input value={newSource.nom} onChange={e => setNewSource(s => ({ ...s, nom: e.target.value }))} placeholder="ex: Agence Benali, Magazine Immo..." />
                </div>
                <div>
                  <Label>Description (optionnel)</Label>
                  <Input value={newSource.description} onChange={e => setNewSource(s => ({ ...s, description: e.target.value }))} placeholder="Conditions, commission..." />
                </div>
                <Button onClick={handleCreerSource} disabled={addingSource || !newSource.nom.trim()} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />{addingSource ? 'Ajout...' : 'Ajouter la source'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sources rémunérées ({sources.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {sources.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucune source rémunérée configurée.</p>}
                <div className="space-y-2">
                  {sources.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{s.nom}</p>
                        {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerSource(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACQUÉREURS */}
        <TabsContent value="acquereurs">
          <div className="max-w-xl space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <strong>Sources acquéreurs :</strong> Un acquéreur est un client qui apporte d'autres prospects. La commission est partagée entre l'apporteur et l'acquéreur selon les conditions convenues.
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter un acquéreur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prénom *</Label>
                    <Input value={newAcquereur.prenom} onChange={e => setNewAcquereur(a => ({ ...a, prenom: e.target.value }))} placeholder="Prénom" />
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input value={newAcquereur.nom} onChange={e => setNewAcquereur(a => ({ ...a, nom: e.target.value }))} placeholder="Nom" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={newAcquereur.email} onChange={e => setNewAcquereur(a => ({ ...a, email: e.target.value }))} placeholder="email@exemple.com" />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={newAcquereur.telephone} onChange={e => setNewAcquereur(a => ({ ...a, telephone: e.target.value }))} placeholder="+212..." />
                  </div>
                </div>
                <Button onClick={handleCreerAcquereur} disabled={addingAcquereur || !newAcquereur.nom.trim() || !newAcquereur.prenom.trim()} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />{addingAcquereur ? 'Ajout...' : "Ajouter l'acquéreur"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acquéreurs enregistrés ({acquereurs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {acquereurs.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">Aucun acquéreur enregistré.</p>
                )}
                <div className="space-y-2">
                  {acquereurs.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-3 px-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1A3C6E]/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-[#1A3C6E]">{a.prenom?.[0]}{a.nom?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.prenom} {a.nom}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {a.email && <p className="text-xs text-gray-500">✉️ {a.email}</p>}
                            {a.telephone && <p className="text-xs text-gray-500">📞 {a.telephone}</p>}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleSupprimerAcquereur(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
