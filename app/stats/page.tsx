import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, LOT_TYPE_LABELS, LOT_STATUT_COLORS } from '@/lib/utils'

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'direction') redirect('/dashboard')

  const [
    { data: lots },
    { data: prospects },
    { data: ventes },
    { data: apporteurs },
  ] = await Promise.all([
    supabase.from('lots').select('*').order('reference'),
    supabase.from('prospects').select('*, apporteur:profiles!apporteur_id(id,nom,prenom)').order('created_at', { ascending: false }),
    supabase.from('ventes').select('*, lot:lots(reference,type,prix_individuel), apporteur:profiles!apporteur_id(nom,prenom)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('role', 'apporteur'),
  ])

  const caNotarie = (ventes || []).filter(v => v.statut === 'acte_signe').reduce((s, v) => s + v.prix_notarie, 0)
  const lotsVendus = (lots || []).filter(l => l.statut === 'vendu').length

  // Stats par apporteur
  const statsApporteur = (apporteurs || []).map(ap => {
    const mesProspects = (prospects || []).filter(p => p.apporteur_id === ap.id)
    const mesVentes = (ventes || []).filter(v => v.apporteur_id === ap.id && v.statut === 'acte_signe')
    return {
      ...ap,
      nbProspects: mesProspects.length,
      nbVentes: mesVentes.length,
      ca: mesVentes.reduce((s, v) => s + v.prix_notarie, 0),
    }
  }).sort((a, b) => b.nbVentes - a.nbVentes)

  return (
    <AppLayout role={profile.role} nom={profile.nom} prenom={profile.prenom}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A3C6E]">Statistiques</h1>
          <p className="text-sm text-gray-500 mt-1">Tableau de bord analytique — Azembay RIPT 1</p>
        </div>

        {/* CA Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">Objectif CA — 40 M MAD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>CA notarié : <strong>{formatCurrency(caNotarie)}</strong></span>
                <span className="text-gray-500">{((caNotarie / 40_000_000) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(caNotarie / 40_000_000) * 100} className="h-4" />
              <p className="text-xs text-gray-400">Restant : {formatCurrency(Math.max(0, 40_000_000 - caNotarie))}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'CA notarié', value: formatCurrency(caNotarie), sub: 'Actes signés' },
            { label: 'Lots vendus', value: `${lotsVendus} / 16`, sub: `${16 - lotsVendus} restants` },
            { label: 'Total prospects', value: (prospects || []).length, sub: `${(prospects || []).filter(p => p.statut === 'vendu').length} convertis` },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-[#1A3C6E] mt-1">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lots status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">État du stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(lots || []).map(lot => (
                <div key={lot.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-[#1A3C6E] w-20">{lot.reference}</span>
                    <span className="text-sm text-gray-500">{LOT_TYPE_LABELS[lot.type as keyof typeof LOT_TYPE_LABELS]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{formatCurrency(lot.prix_individuel)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LOT_STATUT_COLORS[lot.statut as keyof typeof LOT_STATUT_COLORS]}`}>
                      {lot.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance apporteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A3C6E]">Performance Apporteurs</CardTitle>
          </CardHeader>
          <CardContent>
            {statsApporteur.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun apporteur</p>
            ) : (
              <div className="space-y-3">
                {statsApporteur.map(ap => (
                  <div key={ap.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{ap.prenom} {ap.nom}</p>
                      <p className="text-xs text-gray-400">{ap.nbProspects} prospect(s)</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-400">CA</p>
                        <p className="text-sm font-medium">{formatCurrency(ap.ca)}</p>
                      </div>
                      <Badge variant={ap.nbVentes > 0 ? 'gold' : 'gray'}>
                        {ap.nbVentes} vente{ap.nbVentes !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
