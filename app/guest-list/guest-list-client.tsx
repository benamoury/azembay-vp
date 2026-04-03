'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Visite } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Shield, Search, CheckCircle, User, Phone } from 'lucide-react'
import { validerArriveeClient, validerPresenceManager, marquerVisiteRealisee } from '@/actions/visites'

interface GuestListClientProps {
  visites: Visite[]
  today: string
}

export function GuestListClient({ visites: initialVisites, today }: GuestListClientProps) {
  const [visites, setVisites] = useState(initialVisites)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const filtered = visites.filter(v => {
    if (!search) return true
    const p = v.prospect as { nom: string; prenom: string } | undefined
    return `${p?.prenom} ${p?.nom}`.toLowerCase().includes(search.toLowerCase())
  })

  const arrivees = visites.filter(v => v.arrivee_validee).length
  const total = visites.length

  async function handleArrivee(visiteId: string) {
    setLoading(visiteId + '-arrivee')
    const res = await validerArriveeClient(visiteId)
    if (res.success) {
      setVisites(prev => prev.map(v => v.id === visiteId ? { ...v, arrivee_validee: true, arrivee_validee_at: new Date().toISOString() } : v))
      toast({ title: 'Arrivée validée', description: 'La présence du client a été enregistrée.' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  async function handleManager(visiteId: string) {
    setLoading(visiteId + '-manager')
    const res = await validerPresenceManager(visiteId)
    if (res.success) {
      setVisites(prev => prev.map(v => v.id === visiteId ? { ...v, presence_manager: true, presence_manager_validee_at: new Date().toISOString() } : v))
      toast({ title: 'Présence manager validée', description: 'La présence du manager a été enregistrée.' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  async function handleRealisee(visiteId: string) {
    setLoading(visiteId + '-realisee')
    const res = await marquerVisiteRealisee(visiteId)
    if (res.success) {
      setVisites(prev => prev.map(v => v.id === visiteId ? { ...v, statut: 'realisee' } : v))
      toast({ title: 'Visite réalisée', description: 'La visite a été marquée comme réalisée.' })
    } else {
      toast({ title: 'Erreur', description: res.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  const todayFormatted = new Date(today).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1A3C6E] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-[#C8973A]" />
          <div>
            <h1 className="text-xl font-bold">Guest List — Sécurité</h1>
            <p className="text-white/60 text-sm capitalize">{todayFormatted}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-white/60 text-xs mt-1">Visites prévues</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#C8973A]">{total - arrivees}</p>
            <p className="text-white/60 text-xs mt-1">En attente</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{arrivees}</p>
            <p className="text-white/60 text-xs mt-1">Arrivées validées</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Rechercher un visiteur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Guest list */}
      <div className="space-y-3">
        {total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune visite programmée aujourd'hui</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(v => {
            const p = v.prospect as { nom: string; prenom: string; telephone?: string } | undefined
            const ap = v.apporteur as { nom: string; prenom: string; telephone?: string } | undefined
            const isRealisee = v.statut === 'realisee'
            const canMarkRealisee = v.arrivee_validee && v.presence_manager && !isRealisee

            return (
              <Card
                key={v.id}
                className={cn(
                  'transition-all',
                  isRealisee ? 'border-green-200 bg-green-50' : 'border-gray-200'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4">
                    {/* Identité + heure */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                          isRealisee ? 'bg-green-500 text-white' : 'bg-[#1A3C6E] text-white'
                        )}>
                          {isRealisee
                            ? <CheckCircle className="w-5 h-5" />
                            : `${p?.prenom?.[0] ?? ''}${p?.nom?.[0] ?? ''}`}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A3C6E]">{p?.prenom} {p?.nom}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            {v.heure_visite && (
                              <span className="font-mono font-medium">{v.heure_visite.slice(0, 5)}</span>
                            )}
                            {p?.telephone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />{p.telephone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isRealisee && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-800">
                          Réalisée
                        </span>
                      )}
                    </div>

                    {/* Apporteur contact */}
                    {ap && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <User className="w-3 h-3" />
                        <span>Apporteur : {ap.prenom} {ap.nom}</span>
                        {ap.telephone && (
                          <span className="flex items-center gap-1 ml-2">
                            <Phone className="w-3 h-3" />{ap.telephone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Check-in actions */}
                    {!isRealisee && (
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                        {/* Arrivée client */}
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500 font-medium">Arrivée client</span>
                          {v.arrivee_validee ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Validée
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#C8973A] text-[#C8973A] hover:bg-[#C8973A]/10"
                              onClick={() => handleArrivee(v.id)}
                              disabled={loading === v.id + '-arrivee'}
                            >
                              {loading === v.id + '-arrivee' ? '...' : 'Valider arrivée'}
                            </Button>
                          )}
                        </div>

                        {/* Présence manager */}
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500 font-medium">Présence manager</span>
                          {v.presence_manager ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Confirmée
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#1A3C6E] text-[#1A3C6E] hover:bg-[#1A3C6E]/10"
                              onClick={() => handleManager(v.id)}
                              disabled={loading === v.id + '-manager'}
                            >
                              {loading === v.id + '-manager' ? '...' : 'Valider présence'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Marquer réalisée */}
                    {canMarkRealisee && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 w-full"
                        onClick={() => handleRealisee(v.id)}
                        disabled={loading === v.id + '-realisee'}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {loading === v.id + '-realisee' ? 'Traitement...' : 'Marquer visite réalisée'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
