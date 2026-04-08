export type UserRole = 'direction' | 'manager' | 'apporteur' | 'securite'
export type LotType = 'villa_e' | 'appart_2ch' | 'appart_1ch'
export type LotStatut = 'disponible' | 'bloque' | 'vendu'
export type ProspectProfil = 'investisseur_pur' | 'residence_secondaire'
export type ProspectLocalisation = 'hors_casa' | 'nmr' | 'casablanca'
export type ProspectStatut =
  | 'soumis'
  | 'qualifie'
  | 'valide'
  | 'visite_programmee'
  | 'visite_realisee'
  | 'dossier_envoye'
  | 'formulaire_signe'
  | 'sejour_confirme'
  | 'sejour_realise'
  | 'vendu'
  | 'non_concluant'
  | 'orange'
  | 'liste_attente'
  | 'orange'
  | 'liste_attente'
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
export type VisiteStatut = 'confirmee' | 'realisee' | 'annulee'
export type VenteStatut = 'en_cours' | 'acte_signe' | 'annule'
export type WeekendStatut = 'ouvert' | 'valide' | 'complet' | 'passe'
export type FactureStatut = 'emise' | 'payee' | 'avoir'

export interface Profile {
  id: string
  email: string
  role: UserRole
  nom: string
  prenom: string
  telephone?: string
  quota_sejours_utilise?: number
  quota_sejours_max?: number
  created_at: string
}

export interface Lot {
  id: string
  reference: string
  type: LotType
  surface_hab?: number
  surface_terrain?: number
  loggias?: number
  terrasses?: number
  jardin?: number
  surface_cadastrale?: number
  surface_hab_ajustee?: number
  titre_foncier?: string
  prix_bloc?: number
  prix_individuel: number
  statut: LotStatut
  programme_hotelier?: string
  loyer_fixe?: number
  forfait_amenagement?: number
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
  source?: ProspectSource
  source_remuneree_id?: string
  source_remuneree?: SourceRemuneree
  liste_attente_delai?: string
  liste_attente_notes?: string
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
  statut_direction?: FormulaireStatutDirection
  valide_par_direction_at?: string
  valide_par_direction_id?: string
  lot_ids?: string[]
  lots?: Lot[]
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
  valide_at?: string
  valide_by?: string
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
  preferences_weekends?: { rank: number; weekend_id: string }[]
  nb_adultes: number
  nb_enfants_total?: number
  nb_enfants_plus_6: number
  nb_enfants_moins_6: number
  stock_hebergement_id?: string
  annulation_token_id?: string
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
  notes_manager?: string
  created_at: string
  updated_at?: string
  prospect?: Prospect
  stock_hebergement?: StockHebergement
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
  apporteur_id?: string
  jour_id: string
  date_visite: string
  heure_visite?: string
  statut: VisiteStatut
  arrivee_validee: boolean
  arrivee_validee_at?: string
  presence_manager: boolean
  presence_manager_validee_at?: string
  annulation_token?: string
  notes_apporteur?: string
  created_at: string
  updated_at: string
  prospect?: Prospect
  jour?: JourDisponible
  apporteur?: Profile
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

export interface StockHebergement {
  id: string
  reference: string
  type: LotType
  adultes_max: number
  enfants_max: number
  disponible: boolean
  notes?: string
  created_at: string
}

export interface AnnulationToken {
  id: string
  token: string
  type: 'visite' | 'sejour'
  reference_id: string
  expires_at: string
  used_at?: string
  created_at: string
}

export interface ProspectLot {
  id: string
  prospect_id: string
  lot_id: string
  created_at: string
  lot?: Lot
}

export type ProspectSource = 'public' | 'acquereur' | 'source_remuneree'

export type FormulaireStatutDirection = 'en_attente_direction' | 'valide_direction' | 'rejete_direction'

export interface SourceRemuneree {
  id: string
  nom: string
  description?: string
  actif: boolean
  created_by: string
  created_at: string
}
