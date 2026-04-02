'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROSPECT_STATUT_LABELS, formatDate } from '@/lib/utils'
import type { Prospect, Voucher, LienSecurise } from '@/lib/types'
import { Users, Ticket, Link2, AlertTriangle } from 'lucide-react'

interface ManagerDashboardProps {
  prospects: Prospect[]
  vouchers: Voucher[]
  liens: LienSecurise[]
}

export function ManagerDashboard({ prospects, vouchers, liens }: ManagerDashboardProps) {
  const today = new Date().toISOString().split('T')[0]
  const vouchersToday = vouchers.filter(v => v.date_visite === today && v.statut === 'emis')
  const vouchersActifs = vouchers.filter(v => v.statut === 'emis')
  const liensActifs = liens.filter(l => new Date(l.expires_at) > new Date())

  const now = new Date()
  const alertes = prospects.filter(p => {
    if (p.statut !== 'visite_realisee') return false
    return (now.getTime() - new Date(p.updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
  })

  const soumis = prospects.filter(p => p.statut === 'soumis')
  const pipeline = prospects.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A3C6E]">Tableau de bord Manager</h1>
        <p className="text-sm text-gray-500 mt-1">Activité en temps réel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Visites aujourd\'hui', value: vouchersToday.length, icon: Ticket, color: 'bg-orange-50 text-orange-600' },
          { label: 'Vouchers actifs', value: vouchersActifs.length, icon: Ticket, color: 'bg-blue-50 text-blue-600' },
          { label: 'Liens envoyés (actifs)', value: liensActifs.length, icon: Link2, color: 'bg-purple-50 text-purple-600' },
          { label: 'En attente validation', value: soumis.length, icon: Users, color: 'bg-yellow-50 text-yellow-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className="text-xl font-bold text-[#1A3C6E]">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Guest list du jour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">Visites du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {vouchersToday.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune visite programmée aujourd'hui</p>
            ) : (
              <div className="space-y-2">
                {vouchersToday.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {v.prospect?.prenom} {v.prospect?.nom}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.heure_visite?.slice(0, 5)} — {v.numero_voucher}
                      </p>
                    </div>
                    <Badge variant="orange">{v.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">Pipeline prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(PROSPECT_STATUT_LABELS)
                .filter(([key]) => key !== 'non_concluant')
                .map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">{label}</span>
                    <Badge variant={pipeline[key] > 0 ? 'green' : 'gray'}>
                      {pipeline[key] || 0}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {alertes.length} prospect(s) sans action depuis +7 jours (étape Visite réalisée)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes.map(p => (
                <div key={p.id} className="flex justify-between bg-white rounded px-3 py-2 border border-orange-100">
                  <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                  <span className="text-xs text-orange-600">Depuis {formatDate(p.updated_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
