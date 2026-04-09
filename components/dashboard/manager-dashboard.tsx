'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROSPECT_STATUT_LABELS, SEJOUR_STATUT_COLORS, SEJOUR_STATUT_LABELS, formatDate } from '@/lib/utils'
import type { Prospect, LienSecurise, Sejour } from '@/lib/types'
import { Users, Link2, AlertTriangle, Hotel, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type VisiteAujourdhui = {
  id: string
  statut: string
  heure_visite?: string
  arrivee_validee?: boolean
  prospect?: { nom: string; prenom: string; telephone?: string } | null
}

interface ManagerDashboardProps {
  prospects: Prospect[]
  visitesAujourdhui: VisiteAujourdhui[]
  liens: LienSecurise[]
  sejours: Sejour[]
  nonQualifies: { id: string; nom: string; prenom: string; created_at: string }[]
  prochainesVisites?: any[]
  prochainsWeekends?: any[]
}

export function ManagerDashboard({ prospects, visitesAujourdhui, liens, sejours, nonQualifies, prochainesVisites = [], prochainsWeekends = [] }: ManagerDashboardProps) {
  const liensActifs = liens.filter(l => new Date(l.expires_at) > new Date())
  const aQualifier = prospects.filter(p => p.statut === 'soumis').length
  const aValider = prospects.filter(p => p.statut === 'qualifie').length

  const now = new Date()
  const alertes7j = prospects.filter(p => {
    if (p.statut !== 'visite_realisee') return false
    return (now.getTime() - new Date(p.updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
  })

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

      <ProchainesVisitesWidget visites={prochainesVisites} weekends={prochainsWeekends} />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Visites aujourd\'hui', value: visitesAujourdhui.length, icon: Calendar, color: 'bg-orange-50 text-orange-600' },
          { label: 'À qualifier', value: aQualifier, icon: Users, color: aQualifier > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-400' },
          { label: 'À valider (direction)', value: aValider, icon: Users, color: aValider > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400' },
          { label: 'Liens actifs', value: liensActifs.length, icon: Link2, color: 'bg-purple-50 text-purple-600' },
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

      {/* Alerte >48h non qualifiés */}
      {nonQualifies.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {nonQualifies.length} prospect(s) non qualifié(s) depuis plus de 48h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nonQualifies.map(p => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div className="flex justify-between bg-white rounded px-3 py-2 border border-red-100 hover:border-red-300 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                    <span className="text-xs text-red-600">Soumis le {formatDate(p.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Visites du jour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Visites du jour</span>
              <Link href="/visites" className="text-xs text-[#C8973A] hover:underline font-normal">Toutes →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitesAujourdhui.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune visite programmée aujourd'hui</p>
            ) : (
              <div className="space-y-2">
                {visitesAujourdhui.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {v.prospect?.prenom} {v.prospect?.nom}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.heure_visite?.slice(0, 5) ?? '—'}
                        {v.prospect?.telephone ? ` · ${v.prospect.telephone}` : ''}
                      </p>
                    </div>
                    <Badge variant={v.arrivee_validee ? 'green' : 'orange'}>
                      {v.arrivee_validee ? 'Arrivé' : 'En attente'}
                    </Badge>
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
                .filter(([key]) => !['non_concluant'].includes(key))
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

      {/* Séjours à traiter */}
      {sejours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E] flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Hotel className="w-4 h-4" /> Séjours à traiter</span>
              <Link href="/sejours" className="text-xs text-[#C8973A] hover:underline">Voir tous →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sejours.slice(0, 5).map(s => {
                const p = s.prospect as { nom: string; prenom: string } | undefined
                return (
                  <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p?.prenom} {p?.nom}</p>
                      <p className="text-xs text-gray-400">{s.date_arrivee} → {s.date_depart}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', SEJOUR_STATUT_COLORS[s.statut as keyof typeof SEJOUR_STATUT_COLORS])}>
                      {SEJOUR_STATUT_LABELS[s.statut as keyof typeof SEJOUR_STATUT_LABELS]}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes +7j sans formulaire */}
      {alertes7j.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {alertes7j.length} prospect(s) sans avancement depuis +7j (visite réalisée)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes7j.map(p => (
                <Link key={p.id} href={`/prospects/${p.id}`}>
                  <div className="flex justify-between bg-white rounded px-3 py-2 border border-orange-100 hover:border-orange-300 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">{p.prenom} {p.nom}</span>
                    <span className="text-xs text-orange-600">Depuis {formatDate(p.updated_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )


// ─── Widget Prochaines Visites + Weekends ─────────────────────────────────────

function ProchainesVisitesWidget({ visites, weekends, roleLabel }: {
  visites: any[]
  weekends: any[]
  roleLabel?: string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Prochaines visites */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1A3C6E] flex items-center gap-2">
            🌅 Prochaines visites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visites.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune visite à venir.</p>
          ) : (
            <div className="space-y-2">
              {visites.map((v: any) => {
                const p = Array.isArray(v.prospect) ? v.prospect[0] : v.prospect
                const ap = Array.isArray(v.apporteur) ? v.apporteur[0] : v.apporteur
                const date = new Date(v.date_visite + 'T00:00:00')
                const isToday = v.date_visite === new Date().toISOString().split('T')[0]
                return (
                  <div key={v.id} className={cn("flex items-center justify-between py-2 px-3 rounded-lg border", isToday ? "bg-amber-50 border-amber-200" : "bg-white")}>
                    <div>
                      <p className="text-sm font-medium text-[#1A3C6E]">
                        {p?.prenom} {p?.nom}
                      </p>
                      {ap && <p className="text-xs text-gray-400">{ap.prenom} {ap.nom}</p>}
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xs font-semibold", isToday ? "text-amber-700" : "text-gray-600")}>
                        {isToday ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-amber-600">🌅 17h (prévoir 3h)</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prochains weekends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1A3C6E] flex items-center gap-2">
            🏕️ Prochains weekends confirmés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weekends.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun weekend ouvert.</p>
          ) : (
            <div className="space-y-2">
              {weekends.map((w: any) => {
                const date = new Date(w.date_vendredi + 'T00:00:00')
                const places = w.seuil_guests - (w.nb_guests_confirmes || 0)
                return (
                  <div key={w.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#1A3C6E]">
                        {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-gray-400">Vendredi → Dimanche</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        w.statut === 'valide' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {w.statut === 'valide' ? '✓ Validé' : 'Ouvert'}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{places} place(s)</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

}
