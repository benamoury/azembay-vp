'use client'

import { useState } from 'react'
import { annulerVisiteParToken } from '@/actions/visites'
import { annulerSejourParToken, confirmerAnnulationTardive } from '@/actions/sejours'

interface Props {
  token: string
  type: 'visite' | 'sejour'
  date: string
  dateFin?: string
  heure?: string
  isLate?: boolean
}

export function AnnulationClient({ token, type, date, dateFin, heure, isLate }: Props) {
  const [step, setStep] = useState<'confirm' | 'popup_tardive' | 'success' | 'error'>('confirm')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const typeLabel = type === 'visite' ? 'visite' : 'séjour test'
  const dateLabel = type === 'visite'
    ? `${date}${heure ? ` à ${heure}` : ''}`
    : `du ${date} au ${dateFin ?? ''}`

  async function handleAnnuler() {
    setLoading(true)
    try {
      if (type === 'visite') {
        const res = await annulerVisiteParToken(token)
        if (res.success) setStep('success')
        else setErrorMsg(res.error ?? 'Erreur inattendue')
      } else {
        const res = await annulerSejourParToken(token)
        if (res.success) {
          setStep('success')
        } else if ('tardive' in res && res.tardive) {
          setStep('popup_tardive')
        } else {
          setErrorMsg(res.error ?? 'Erreur inattendue')
          setStep('error')
        }
      }
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez réessayer.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmerTardive() {
    setLoading(true)
    try {
      const res = await confirmerAnnulationTardive(token)
      if (res.success) setStep('success')
      else {
        setErrorMsg(res.error ?? 'Erreur inattendue')
        setStep('error')
      }
    } catch {
      setErrorMsg('Erreur de connexion.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <PageShell>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1A3C6E] mb-2">Annulation confirmée</h1>
        <p className="text-gray-600">
          Votre {typeLabel} du <strong>{dateLabel}</strong> a bien été annulé(e).
          Vous recevrez une confirmation par email.
        </p>
      </PageShell>
    )
  }

  if (step === 'error') {
    return (
      <PageShell>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A3C6E] mb-2">Erreur</h1>
        <p className="text-gray-600">{errorMsg}</p>
      </PageShell>
    )
  }

  if (step === 'popup_tardive') {
    return (
      <PageShell>
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1A3C6E] mb-2">Annulation tardive</h1>
        <p className="text-gray-600 mb-4">
          Votre séjour est prévu dans moins de 72 heures. Conformément aux conditions de participation,
          une facture correspondante vous sera adressée.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-amber-800 font-medium">Conditions d&apos;annulation tardive</p>
          <p className="text-sm text-amber-700 mt-1">
            Une facture sera émise pour le séjour annulé. Si vous concrétisez votre acquisition
            dans les délais de votre formulaire de réservation, un avoir du même montant vous sera accordé.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStep('confirm')}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirmerTardive}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Traitement...' : 'Confirmer l\'annulation'}
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-[#1A3C6E] mb-2">
        Annulation de {typeLabel}
      </h1>
      <p className="text-gray-600 mb-6">
        Vous êtes sur le point d&apos;annuler votre {typeLabel} prévu(e) le{' '}
        <strong>{dateLabel}</strong>.
      </p>

      {isLate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-amber-800 font-semibold">Annulation tardive (&lt;72h)</p>
          <p className="text-sm text-amber-700 mt-1">
            Une facture sera émise conformément aux conditions de participation.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          disabled={loading}
          onClick={() => window.history.back()}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Ne pas annuler
        </button>
        <button
          onClick={handleAnnuler}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Traitement...' : 'Confirmer l\'annulation'}
        </button>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1A3C6E] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-xl">
        {children}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">AZEMBAY — RIPT 1 — Vente Privée Off-Market</p>
          <p className="text-xs text-gray-300 mt-1">Sidi Bou Naim, Maroc</p>
        </div>
      </div>
    </div>
  )
}
