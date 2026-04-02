'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'
import type { LienSecurise } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { Link2, Plus, Eye, Clock, Copy } from 'lucide-react'
import { creerLienSecurise } from '@/actions/liens'

interface LiensClientProps {
  liens: LienSecurise[]
  prospects: { id: string; nom: string; prenom: string; statut: string }[]
  documents: { id: string; nom: string; categorie: string }[]
  createdBy: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

export function LiensClient({ liens: initLiens, prospects, documents, createdBy }: LiensClientProps) {
  const [liens, setLiens] = useState(initLiens)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({ prospect_id: '', document_id: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const now = new Date()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await creerLienSecurise({ ...formData, created_by: createdBy })
    if (result.success && result.lien) {
      setLiens(prev => [result.lien as LienSecurise, ...prev])
      setShowCreate(false)
      toast({ title: 'Lien sécurisé créé', description: 'Valable 7 jours.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${APP_URL}/view/${token}`)
    toast({ title: 'Lien copié' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Liens sécurisés</h1>
          <p className="text-sm text-gray-500 mt-1">{liens.length} lien(s) généré(s)</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Générer un lien
        </Button>
      </div>

      <div className="space-y-3">
        {liens.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">Aucun lien sécurisé généré</p>
            </CardContent>
          </Card>
        ) : (
          liens.map(l => {
            const isExpired = new Date(l.expires_at) < now
            const p = l.prospect as { nom: string; prenom: string } | undefined
            const d = l.document as { nom: string } | undefined
            return (
              <Card key={l.id} className={isExpired ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link2 className={`w-4 h-4 ${isExpired ? 'text-gray-400' : 'text-[#C8973A]'}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {p?.prenom} {p?.nom}
                          <span className="text-gray-400 mx-2">·</span>
                          {d?.nom}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {l.nb_consultations} consultation(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expire : {formatDateTime(l.expires_at)}
                          </span>
                          {l.derniere_consultation && (
                            <span>Dernière : {formatDateTime(l.derniere_consultation)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isExpired ? 'gray' : 'green'}>
                        {isExpired ? 'Expiré' : 'Actif'}
                      </Badge>
                      {!isExpired && (
                        <Button size="sm" variant="outline" onClick={() => copyLink(l.token)}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copier
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Générer un lien sécurisé</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Prospect</label>
              <Select value={formData.prospect_id} onValueChange={v => setFormData(p => ({ ...p, prospect_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un prospect" /></SelectTrigger>
                <SelectContent>
                  {prospects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Document</label>
              <Select value={formData.document_id} onValueChange={v => setFormData(p => ({ ...p, document_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un document" /></SelectTrigger>
                <SelectContent>
                  {documents.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-400">
              Le lien sera valable 7 jours. Chaque consultation est enregistrée.
              Le document sera affiché avec watermark nominatif (nom + date + CONFIDENTIEL).
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={loading || !formData.prospect_id || !formData.document_id}>
                Générer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
