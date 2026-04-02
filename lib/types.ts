export type UserRole = 'direction' | 'manager' | 'apporteur' | 'securite'
export type LotType = 'villa_e' | 'appart_2ch' | 'appart_1ch'
export type LotStatut = 'disponible' | 'bloque' | 'vendu'
export type ProspectProfil = 'investisseur_pur' | 'residence_secondaire'
export type ProspectLocalisation = 'hors_casa' | 'nmr' | 'casablanca'
export type ProspectStatut =
  | 'soumis'
  | 'valide'
  | 'visite_programmee'
  | 'visite_realisee'
  | 'dossier_envoye'
  | 'formulaire_signe'
  | 'sejour_confirme'
  | 'sejour_realise'
  | 'vendu'
  | 'non_concluant'
export type VoucherStatut = 'emis' | 'utilise' | 'annule' | 'expire'
export type DocumentCategorie =
  | 'presentation_pre_visite'
  | 'presentation_post_visite'
  | 'forwardable'
  | 'interne'
export type FormulaireType = 'avec_acompte' | 'sans_acompte'
export type ProgrammeHotelier = 'standard' | 'investisseur' | 'flexible'
export type FormulaireStatut = 'signe' | 'retracte' | 'expire' | 'converti'
export type SejourStatut = 'demande' | 'confirme' | 'realise' | 'no_show' | 'annule'
export type VisiteStatut = 'demandee' | 'confirmee_manager' | 'confirmee_securite' | 'realisee' | 'annulee'
export type VenteStatut = 'en_cours' | 'acte_signe' | 'annule'
export type WeekendStatut = 'pre_liste' | 'ouvert' | 'validation' | 'confirme' | 'ferme'
export type FactureStatut = 'emise' | 'payee' | 'avoir'

export interface Profile {
  id: string
  email: string
  role: UserRole
  nom: string
  prenom: string
  telephone?: string
  created_at: string
}

export interface Lot {
  id: string
  reference: string
  type: LotType
  surface_hab?: number
  surface_terrain?: number
  prix_bloc?: number
  prix_individuel: number
  statut: LotStatut
  programme_hotelier?: string
  loyer_fixe?: number
  forfait_amenagement?: number
  adultes_max?: number
  enfants_max?: number
  created_at: string
}

export interface Prospect {
  id: string
  apporteur_id: string
  nom: string
  prenom: string
  email: string
  telephone?: string
  ville?: string
  pays?: string
  nationalite?: string
  profil?: ProspectProfil
  localisation?: ProspectLocalisation
  capacite_financiere?: string
  budget_estime?: number
  reference_personnelle?: string
  valeur_ajoutee?: string
  statut: ProspectStatut
  lot_cible_id?: string
  notes?: string
  temperature?: number
  validated_by?: string
  validated_at?: string
  created_at: string
  updated_at: string
  apporteur?: Profile
  lot_cible?: Lot
}

export interface Voucher {
  id: string
  prospect_id: string
  apporteur_id: string
  manager_id: string
  date_visite: string
  heure_visite: string
  statut: VoucherStatut
  qr_code_token: string
  numero_voucher?: string
  created_at: string
  prospect?: Prospect
  apporteur?: Profile
  manager?: Profile
}

export interface Document {
  id: string
  nom: string
  description?: string
  categorie: DocumentCategorie
  file_path: string
  file_type?: string
  etape_disponibilite?: string
  profils_autorises: string[]
  forward_autorise: boolean
  actif: boolean
  uploaded_by?: string
  created_at: string
}

export interface LienSecurise {
  id: string
  prospect_id: string
  document_id: string
  token: string
  expires_at: string
  nb_consultations: number
  derniere_consultation?: string
  created_by?: string
  created_at: string
  prospect?: Prospect
  document?: Document
}

export interface Formulaire {
  id: string
  prospect_id: string
  lot_id: string
  type: FormulaireType
  programme_hotelier?: ProgrammeHotelier
  acompte_recu: boolean
  reference_paiement?: string
  date_signature?: string
  date_retractation_expire?: string
  sejour_test_souhaite: boolean
  sejour_dates?: unknown
  statut: FormulaireStatut
  created_at: string
  prospect?: Prospect
  lot?: Lot
}

export interface Weekend {
  id: string
  date_vendredi: string
  date_samedi: string
  date_dimanche?: string
  seuil_guests: number
  nb_guests_confirmes: number
  nb_sejours_confirmes: number
  statut: WeekendStatut
  actif: boolean
  notes?: string
  confirmed_at?: string
  created_at: string
}

export interface Sejour {
  id: string
  prospect_id: string
  formulaire_id?: string
  apporteur_id?: string
  weekend_id?: string
  date_arrivee: string
  date_depart: string
  date_souhaitee_1?: string
  date_souhaitee_2?: string
  date_souhaitee_3?: string
  nb_adultes: number
  nb_enfants: number
  lot_assigne_id?: string
  statut: SejourStatut
  gratuit: boolean
  montant_facturable?: number
  recouvre: boolean
  noshow: boolean
  noshow_declared_by?: string
  noshow_declared_at?: string
  facture_envoyee: boolean
  recouvre_confirme_by?: string
  recouvre_confirme_at?: string
  lot_libere_at?: string
  notes_manager?: string
  created_at: string
  updated_at?: string
  prospect?: Prospect
  lot_assigne?: Lot
  weekend?: Weekend
}

export interface ClientNote {
  id: string
  prospect_id: string
  auteur_id: string
  contenu: string
  temperature?: number
  created_at: string
  auteur?: Profile
}

export interface Facture {
  id: string
  sejour_id: string
  prospect_id: string
  numero_facture?: string
  montant_ht: number
  tva_pct: number
  montant_ttc: number
  date_emission: string
  statut: FactureStatut
  pdf_path?: string
  created_by?: string
  created_at: string
  sejour?: Sejour
  prospect?: Prospect
}

export interface ListeAttente {
  id: string
  prospect_id: string
  apporteur_id: string
  lot_type: LotType
  priorite: number
  created_at: string
  prospect?: Prospect
}

export interface JourDisponible {
  id: string
  date: string
  capacite: number
  actif: boolean
  prioritaire: boolean
  notes?: string
  nb_visites?: number
  created_at: string
}

export interface Visite {
  id: string
  prospect_id: string
  jour_id: string
  date_visite: string
  statut: VisiteStatut
  notes_apporteur?: string
  notes_securite?: string
  confirmed_by?: string
  confirmed_securite_by?: string
  confirmed_manager_at?: string
  confirmed_securite_at?: string
  created_at: string
  updated_at: string
  prospect?: Prospect
  jour?: JourDisponible
}

export interface Vente {
  id: string
  prospect_id: string
  lot_id: string
  formulaire_id?: string
  apporteur_id: string
  prix_notarie: number
  date_acte_notarie?: string
  commission_apporteur?: number
  commission_manager?: number
  statut: VenteStatut
  created_at: string
  prospect?: Prospect
  lot?: Lot
  apporteur?: Profile
}
