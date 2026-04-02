import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ProspectStatut, LotType, LotStatut, VoucherStatut, SejourStatut, WeekendStatut } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} M MAD`
  }
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' MAD'
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const PROSPECT_STATUT_LABELS: Record<ProspectStatut, string> = {
  soumis: 'Soumis',
  valide: 'Validé',
  visite_programmee: 'Visite programmée',
  visite_realisee: 'Visite réalisée',
  dossier_envoye: 'Dossier envoyé',
  formulaire_signe: 'Formulaire signé',
  sejour_confirme: 'Séjour confirmé',
  sejour_realise: 'Séjour réalisé',
  vendu: 'Vendu',
  non_concluant: 'Non concluant',
}

export const PROSPECT_STATUT_COLORS: Record<ProspectStatut, string> = {
  soumis: 'bg-gray-100 text-gray-700 border-gray-200',
  valide: 'bg-green-100 text-green-700 border-green-200',
  visite_programmee: 'bg-blue-100 text-blue-700 border-blue-200',
  visite_realisee: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  dossier_envoye: 'bg-purple-100 text-purple-700 border-purple-200',
  formulaire_signe: 'bg-orange-100 text-orange-700 border-orange-200',
  sejour_confirme: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  sejour_realise: 'bg-teal-100 text-teal-700 border-teal-200',
  vendu: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  non_concluant: 'bg-red-100 text-red-600 border-red-200',
}

export const LOT_TYPE_LABELS: Record<LotType, string> = {
  villa_e: 'Villa Parc type E',
  appart_2ch: 'Appartement 2 chambres',
  appart_1ch: 'Appartement 1 chambre',
}

export const LOT_STATUT_LABELS: Record<LotStatut, string> = {
  disponible: 'Disponible',
  bloque: 'Bloqué',
  vendu: 'Vendu',
}

export const LOT_STATUT_COLORS: Record<LotStatut, string> = {
  disponible: 'bg-green-100 text-green-700',
  bloque: 'bg-orange-100 text-orange-700',
  vendu: 'bg-yellow-100 text-yellow-800',
}

export const VOUCHER_STATUT_LABELS: Record<VoucherStatut, string> = {
  emis: 'Émis',
  utilise: 'Utilisé',
  annule: 'Annulé',
  expire: 'Expiré',
}

export const VOUCHER_STATUT_COLORS: Record<VoucherStatut, string> = {
  emis: 'bg-orange-100 text-orange-700',
  utilise: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  expire: 'bg-gray-100 text-gray-500',
}

export const CRM_ETAPES: { value: ProspectStatut; label: string; step: number }[] = [
  { value: 'soumis', label: 'Soumis', step: 1 },
  { value: 'valide', label: 'Validé', step: 2 },
  { value: 'visite_programmee', label: 'Visite programmée', step: 3 },
  { value: 'visite_realisee', label: 'Visite réalisée', step: 4 },
  { value: 'dossier_envoye', label: 'Dossier envoyé', step: 5 },
  { value: 'formulaire_signe', label: 'Formulaire signé', step: 6 },
  { value: 'vendu', label: 'Vendu', step: 7 },
]

export const ROLE_LABELS: Record<string, string> = {
  direction: 'Direction',
  manager: 'Manager',
  apporteur: 'Apporteur',
  securite: 'Sécurité',
}

export const SEJOUR_STATUT_LABELS: Record<SejourStatut, string> = {
  demande: 'Demandé',
  confirme: 'Confirmé',
  realise: 'Réalisé',
  no_show: 'No-show',
  annule: 'Annulé',
}

export const SEJOUR_STATUT_COLORS: Record<SejourStatut, string> = {
  demande: 'bg-yellow-100 text-yellow-700',
  confirme: 'bg-green-100 text-green-700',
  realise: 'bg-blue-100 text-blue-700',
  no_show: 'bg-red-100 text-red-700',
  annule: 'bg-gray-100 text-gray-500',
}

export const WEEKEND_STATUT_LABELS: Record<WeekendStatut, string> = {
  pre_liste: 'Pré-listé',
  ouvert: 'Ouvert',
  validation: 'En validation',
  confirme: 'Confirmé',
  ferme: 'Fermé',
}

export const WEEKEND_STATUT_COLORS: Record<WeekendStatut, string> = {
  pre_liste: 'bg-gray-100 text-gray-500',
  ouvert: 'bg-green-100 text-green-700',
  validation: 'bg-orange-100 text-orange-700',
  confirme: 'bg-blue-100 text-blue-700',
  ferme: 'bg-gray-100 text-gray-400',
}

export const TEMPERATURE_LABELS: Record<number, string> = {
  1: 'Froid',
  2: 'Tiède',
  3: 'Neutre',
  4: 'Chaud',
  5: 'Brûlant',
}

export const TEMPERATURE_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-blue-600',
  3: 'text-gray-500',
  4: 'text-orange-500',
  5: 'text-red-500',
}

export const LOT_TYPE_PRIORITY: Record<string, number> = {
  villa_e: 3,
  appart_2ch: 2,
  appart_1ch: 1,
}
