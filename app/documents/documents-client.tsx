'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Document, UserRole } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { FileText, Upload, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { uploadDocument, toggleDocumentActif } from '@/actions/documents'

interface DocumentsClientProps {
  documents: Document[]
  uploaderId: string
  role: UserRole
}

const CATEGORIES = [
  { value: 'presentation_pre_visite', label: 'Présentation pré-visite' },
  { value: 'presentation_post_visite', label: 'Présentation post-visite (avec prix)' },
  { value: 'forwardable', label: 'Forwardable (transmissible)' },
  { value: 'interne', label: 'Interne (Direction + Manager)' },
]

const PROFILS = ['direction', 'manager', 'apporteur']

export function DocumentsClient({ documents: initDocs, uploaderId, role }: DocumentsClientProps) {
  const [documents, setDocuments] = useState(initDocs)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    nom: '', description: '', categorie: 'interne',
    etape_disponibilite: '', profils_autorises: [] as string[],
    forward_autorise: false,
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!fileRef.current?.files?.[0]) return
    setUploading(true)

    const fd = new FormData()
    fd.append('file', fileRef.current.files[0])
    fd.append('nom', formData.nom)
    fd.append('description', formData.description)
    fd.append('categorie', formData.categorie)
    fd.append('etape_disponibilite', formData.etape_disponibilite)
    fd.append('profils_autorises', JSON.stringify(formData.profils_autorises))
    fd.append('forward_autorise', String(formData.forward_autorise))
    fd.append('uploaded_by', uploaderId)

    const result = await uploadDocument(fd)
    if (result.success && result.document) {
      setDocuments(prev => [result.document as Document, ...prev])
      setShowUpload(false)
      toast({ title: 'Document uploadé', description: formData.nom })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setUploading(false)
  }

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleDocumentActif(id, !current)
    if (result.success) {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, actif: !current } : d))
      toast({ title: `Document ${!current ? 'activé' : 'désactivé'}` })
    }
  }

  const catColors: Record<string, string> = {
    presentation_pre_visite: 'bg-blue-100 text-blue-700',
    presentation_post_visite: 'bg-purple-100 text-purple-700',
    forwardable: 'bg-green-100 text-green-700',
    interne: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{documents.length} document(s)</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4 mr-2" /> Uploader un document
        </Button>
      </div>

      {/* Categories info */}
      <div className="grid grid-cols-4 gap-3">
        {CATEGORIES.map(c => (
          <Card key={c.value} className="border-0 shadow-none bg-gray-50">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {c.label.split(' ')[0]}
              </p>
              <p className="text-2xl font-bold text-[#1A3C6E]">
                {documents.filter(d => d.categorie === c.value).length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document list */}
      <Card>
        <CardContent className="divide-y divide-gray-50">
          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">Aucun document uploadé</p>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#C8973A] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{doc.nom}</p>
                    {doc.description && <p className="text-xs text-gray-400">{doc.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${catColors[doc.categorie] || 'bg-gray-100'}`}>
                        {CATEGORIES.find(c => c.value === doc.categorie)?.label}
                      </span>
                      {doc.forward_autorise && (
                        <span className="text-[10px] text-green-600">Transmissible</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.actif ? 'green' : 'gray'}>
                    {doc.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                  {role === 'direction' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(doc.id, doc.actif)}
                    >
                      {doc.actif ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uploader un document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Fichier PDF</Label>
              <Input type="file" accept=".pdf" ref={fileRef} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du document</Label>
                <Input value={formData.nom} onChange={e => setFormData(p => ({ ...p, nom: e.target.value }))} required />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.categorie} onValueChange={v => setFormData(p => ({ ...p, categorie: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Étape de disponibilité (ex: visite_realisee)</Label>
              <Input value={formData.etape_disponibilite} onChange={e => setFormData(p => ({ ...p, etape_disponibilite: e.target.value }))} placeholder="valide, visite_realisee..." />
            </div>
            <div>
              <Label>Profils autorisés</Label>
              <div className="flex gap-2 mt-1">
                {PROFILS.map(pr => (
                  <label key={pr} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.profils_autorises.includes(pr)}
                      onChange={e => setFormData(p => ({
                        ...p,
                        profils_autorises: e.target.checked
                          ? [...p.profils_autorises, pr]
                          : p.profils_autorises.filter(x => x !== pr)
                      }))}
                    />
                    {pr}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="forward"
                checked={formData.forward_autorise}
                onChange={e => setFormData(p => ({ ...p, forward_autorise: e.target.checked }))}
              />
              <Label htmlFor="forward">Forward autorisé (transmissible)</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Annuler</Button>
              <Button type="submit" disabled={uploading}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Upload...' : 'Uploader'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
