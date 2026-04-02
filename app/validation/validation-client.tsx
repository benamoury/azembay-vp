'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Prospect } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle, XCircle, AlertTriangle, User, Phone, Mail, MapPin } from 'lucide-react'
import { validerProspect, rejeterProspect } from '@/actions/prospects'

interface ValidationClientProps {
  prospects: Prospect[]
}

export function ValidationClient({ prospects: initialProspects }: ValidationClientProps) {
  const [prospects, setProspects] = useState(initialProspects)
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleValider(id: string) {
    setLoading(id)
    const result = await validerProspect(id)
    if (result.success) {
      setProspects(prev => prev.filter(p => p.id !== id))
      toast({ title: 'Prospect validé', description: 'Le prospect a été validé avec succès.', variant: 'default' })
    } else {
      toast({ title: 'Erreur', description: result.error || 'Une erreur est survenue.', variant: 'destructive' })
    }
    setLoading(null)
  }

  async function handleRejeter(id: string) {
    setLoading(`reject-${id}`)
    const result = await rejeterProspect(id)
    if (result.success) {
      setProspects(prev => prev.filter(p => p.id !== id))
      toast({ title: 'Prospect rejeté', description: 'Le prospect a été marqué non concluant.' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Validation des prospects</h1>
        <p className="text-sm text-gray-500 mt-1">{prospects.length} prospect(s) en attente de validation</p>
      </div>

      {prospects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun prospect en attente de validation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prospects.map(p => {
            const isHighValue = (p.budget_estime || 0) >= 5_000_000
            return (
              <Card key={p.id} className={isHighValue ? 'border-orange-300' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
                        {p.prenom} {p.nom}
                        {isHighValue && (
                          <Badge variant="orange" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Budget ≥ 5M MAD
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-gray-400 mt-1">Soumis le {formatDate(p.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejeter(p.id)}
                        disabled={!!loading}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleValider(p.id)}
                        disabled={!!loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Valider
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3.5 h-3.5" />
                        {p.email}
                      </div>
                      {p.telephone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-3.5 h-3.5" />
                          {p.telephone}
                        </div>
                      )}
                      {p.ville && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-3.5 h-3.5" />
                          {p.ville}, {p.pays}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {p.budget_estime && (
                        <div>
                          <span className="text-gray-400 text-xs">Budget estimé</span>
                          <p className={`font-semibold ${isHighValue ? 'text-orange-600' : 'text-[#1A3C6E]'}`}>
                            {formatCurrency(p.budget_estime)}
                          </p>
                        </div>
                      )}
                      {p.profil && (
                        <div>
                          <span className="text-gray-400 text-xs">Profil</span>
                          <p className="font-medium capitalize">{p.profil.replace('_', ' ')}</p>
                        </div>
                      )}
                      {p.localisation && (
                        <div>
                          <span className="text-gray-400 text-xs">Localisation</span>
                          <p className="font-medium uppercase">{p.localisation.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {p.apporteur && (
                        <div>
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Apporteur
                          </span>
                          <p className="font-medium">{(p.apporteur as {prenom:string;nom:string}).prenom} {(p.apporteur as {prenom:string;nom:string}).nom}</p>
                        </div>
                      )}
                      {p.reference_personnelle && (
                        <div>
                          <span className="text-gray-400 text-xs">Référence</span>
                          <p className="text-sm">{p.reference_personnelle}</p>
                        </div>
                      )}
                      {p.valeur_ajoutee && (
                        <div>
                          <span className="text-gray-400 text-xs">Valeur ajoutée</span>
                          <p className="text-sm">{p.valeur_ajoutee}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {p.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-600">{p.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
