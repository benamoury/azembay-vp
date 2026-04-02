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
import { Users, Home, FileText, Plus } from 'lucide-react'
import { creerUtilisateur, modifierStatutLot } from '@/actions/prospects'

interface ParametrageClientProps {
  utilisateurs: Profile[]
  lots: Lot[]
  documents: Document[]
}

export function ParametrageClient({ utilisateurs: initUsers, lots: initLots, documents }: ParametrageClientProps) {
  const [utilisateurs, setUtilisateurs] = useState(initUsers)
  const [lots, setLots] = useState(initLots)
  const [newUser, setNewUser] = useState({ email: '', prenom: '', nom: '', telephone: '', role: 'apporteur' as const })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Paramétrage</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des utilisateurs, lots et documents</p>
      </div>

      <Tabs defaultValue="utilisateurs">
        <TabsList>
          <TabsTrigger value="utilisateurs" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="lots" className="flex items-center gap-2">
            <Home className="w-4 h-4" /> Lots
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
                      <p className="text-xs text-gray-400">{u.email}</p>
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
