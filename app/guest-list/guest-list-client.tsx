'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Voucher } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { cn, VOUCHER_STATUT_COLORS } from '@/lib/utils'
import { Shield, Search, CheckCircle, QrCode, Phone, Mail } from 'lucide-react'
import { marquerVoucherUtilise } from '@/actions/vouchers'

interface GuestListClientProps {
  vouchers: Voucher[]
  today: string
}

export function GuestListClient({ vouchers: initialVouchers, today }: GuestListClientProps) {
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [search, setSearch] = useState('')
  const [qrInput, setQrInput] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const filtered = vouchers.filter(v => {
    if (!search) return true
    const p = v.prospect as { nom: string; prenom: string } | undefined
    return `${p?.prenom} ${p?.nom} ${v.numero_voucher} ${v.qr_code_token}`.toLowerCase().includes(search.toLowerCase())
  })

  const emis = vouchers.filter(v => v.statut === 'emis').length
  const utilise = vouchers.filter(v => v.statut === 'utilise').length

  async function handleCheck(voucherId: string) {
    setLoading(voucherId)
    const result = await marquerVoucherUtilise(voucherId)
    if (result.success) {
      setVouchers(prev => prev.map(v => v.id === voucherId ? { ...v, statut: 'utilise' } : v))
      toast({ title: '✓ Accès validé', description: 'Voucher marqué comme utilisé.', variant: 'default' })
    } else {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
    }
    setLoading(null)
  }

  async function handleQrScan(e: React.FormEvent) {
    e.preventDefault()
    const voucher = vouchers.find(v => v.qr_code_token === qrInput || v.numero_voucher === qrInput)
    if (!voucher) {
      toast({ title: 'QR code invalide', description: 'Aucun voucher trouvé pour ce code.', variant: 'destructive' })
      return
    }
    if (voucher.statut === 'utilise') {
      toast({ title: 'Déjà utilisé', description: 'Ce voucher a déjà été scanné.', variant: 'destructive' })
      return
    }
    await handleCheck(voucher.id)
    setQrInput('')
  }

  const todayFormatted = new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{vouchers.length}</p>
            <p className="text-white/60 text-xs mt-1">Visites prévues</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#C8973A]">{emis}</p>
            <p className="text-white/60 text-xs mt-1">En attente</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{utilise}</p>
            <p className="text-white/60 text-xs mt-1">Entrées validées</p>
          </div>
        </div>
      </div>

      {/* QR Scanner */}
      <Card className="border-[#C8973A]/30">
        <CardHeader>
          <CardTitle className="text-[#1A3C6E] flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#C8973A]" />
            Scanner / Saisir un QR code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQrScan} className="flex gap-3">
            <Input
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder="Scanner ou saisir le code du voucher..."
              className="font-mono"
              autoFocus
            />
            <Button type="submit" disabled={!qrInput}>Valider</Button>
          </form>
        </CardContent>
      </Card>

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
        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune visite programmée aujourd'hui</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(v => {
            const p = v.prospect as { nom: string; prenom: string; email?: string; telephone?: string } | undefined
            const isUtilise = v.statut === 'utilise'
            return (
              <Card
                key={v.id}
                className={cn(
                  'transition-all',
                  isUtilise ? 'border-green-200 bg-green-50' : 'border-gray-200'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0',
                        isUtilise ? 'bg-green-500 text-white' : 'bg-[#1A3C6E] text-white'
                      )}>
                        {isUtilise ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          `${p?.prenom?.[0] || ''}${p?.nom?.[0] || ''}`
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A3C6E]">{p?.prenom} {p?.nom}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span className="font-mono font-medium">{v.heure_visite?.slice(0,5)}</span>
                          <span className="font-mono text-gray-300">{v.numero_voucher}</span>
                          {p?.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />{p.telephone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', VOUCHER_STATUT_COLORS[v.statut])}>
                        {isUtilise ? '✓ Entré' : 'En attente'}
                      </span>
                      {!isUtilise && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleCheck(v.id)}
                          disabled={loading === v.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Valider l'entrée
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
    </div>
  )
}
