-- ============================================================
-- AZEMBAY RIPT 1 — Schéma Supabase complet
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('direction', 'manager', 'apporteur', 'securite');
CREATE TYPE lot_type AS ENUM ('villa_e', 'appart_2ch', 'appart_1ch');
CREATE TYPE lot_statut AS ENUM ('disponible', 'bloque', 'vendu');
CREATE TYPE prospect_profil AS ENUM ('investisseur_pur', 'residence_secondaire');
CREATE TYPE prospect_localisation AS ENUM ('hors_casa', 'nmr', 'casablanca');
CREATE TYPE prospect_statut AS ENUM (
  'soumis', 'valide', 'visite_programmee', 'visite_realisee',
  'dossier_envoye', 'formulaire_signe', 'sejour_confirme',
  'sejour_realise', 'vendu', 'non_concluant'
);
CREATE TYPE voucher_statut AS ENUM ('emis', 'utilise', 'annule', 'expire');
CREATE TYPE document_categorie AS ENUM (
  'presentation_pre_visite', 'presentation_post_visite', 'forwardable', 'interne'
);
CREATE TYPE formulaire_type AS ENUM ('avec_acompte', 'sans_acompte');
CREATE TYPE programme_hotelier_type AS ENUM ('standard', 'investisseur', 'flexible');
CREATE TYPE formulaire_statut AS ENUM ('signe', 'retracte', 'expire', 'converti');
CREATE TYPE sejour_statut AS ENUM ('demande', 'confirme', 'realise', 'annule');
CREATE TYPE vente_statut AS ENUM ('en_cours', 'acte_signe', 'annule');

-- ============================================================
-- TABLES
-- ============================================================

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'apporteur',
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOTS
CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  type lot_type NOT NULL,
  surface_hab NUMERIC,
  surface_terrain NUMERIC,
  prix_bloc NUMERIC,
  prix_individuel NUMERIC NOT NULL,
  statut lot_statut NOT NULL DEFAULT 'disponible',
  programme_hotelier TEXT,
  loyer_fixe NUMERIC,
  forfait_amenagement NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROSPECTS
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apporteur_id UUID NOT NULL REFERENCES profiles(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'Maroc',
  nationalite TEXT,
  profil prospect_profil,
  localisation prospect_localisation,
  capacite_financiere TEXT,
  budget_estime NUMERIC,
  reference_personnelle TEXT,
  valeur_ajoutee TEXT,
  statut prospect_statut NOT NULL DEFAULT 'soumis',
  lot_cible_id UUID REFERENCES lots(id),
  notes TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VOUCHERS
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  apporteur_id UUID NOT NULL REFERENCES profiles(id),
  manager_id UUID NOT NULL REFERENCES profiles(id),
  date_visite DATE NOT NULL,
  heure_visite TIME NOT NULL,
  statut voucher_statut NOT NULL DEFAULT 'emis',
  qr_code_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  numero_voucher TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  categorie document_categorie NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'application/pdf',
  etape_disponibilite TEXT,
  profils_autorises TEXT[] DEFAULT '{}',
  forward_autorise BOOLEAN DEFAULT FALSE,
  actif BOOLEAN DEFAULT TRUE,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LIENS SECURISES
CREATE TABLE liens_securises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  nb_consultations INTEGER DEFAULT 0,
  derniere_consultation TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORMULAIRES
CREATE TABLE formulaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  type formulaire_type NOT NULL,
  programme_hotelier programme_hotelier_type,
  acompte_recu BOOLEAN DEFAULT FALSE,
  reference_paiement TEXT,
  date_signature DATE,
  date_retractation_expire DATE,
  sejour_test_souhaite BOOLEAN DEFAULT FALSE,
  sejour_dates JSONB,
  statut formulaire_statut NOT NULL DEFAULT 'signe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEJOURS
CREATE TABLE sejours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  formulaire_id UUID REFERENCES formulaires(id),
  date_arrivee DATE NOT NULL,
  date_depart DATE NOT NULL,
  nb_adultes INTEGER DEFAULT 2,
  nb_enfants INTEGER DEFAULT 0,
  lot_assigne_id UUID REFERENCES lots(id),
  statut sejour_statut NOT NULL DEFAULT 'demande',
  gratuit BOOLEAN DEFAULT TRUE,
  montant_facturable NUMERIC,
  recouvre BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WEEKENDS ACTIVES
CREATE TABLE weekends_actives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_vendredi DATE NOT NULL,
  date_samedi DATE NOT NULL,
  seuil_guests INTEGER DEFAULT 3,
  nb_guests_confirmes INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VENTES
CREATE TABLE ventes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  formulaire_id UUID REFERENCES formulaires(id),
  apporteur_id UUID NOT NULL REFERENCES profiles(id),
  prix_notarie NUMERIC NOT NULL,
  date_acte_notarie DATE,
  commission_apporteur NUMERIC,
  commission_manager NUMERIC,
  statut vente_statut NOT NULL DEFAULT 'en_cours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-generate voucher numero
CREATE OR REPLACE FUNCTION generate_voucher_numero()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM vouchers;
  NEW.numero_voucher := 'AZB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_voucher_numero
  BEFORE INSERT ON vouchers
  FOR EACH ROW
  WHEN (NEW.numero_voucher IS NULL)
  EXECUTE FUNCTION generate_voucher_numero();

-- Auto-update updated_at on prospects
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'apporteur')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE liens_securises ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE sejours ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekends_actives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR get_user_role() IN ('direction', 'manager')
  );
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (get_user_role() = 'direction');
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR get_user_role() = 'direction');
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (get_user_role() = 'direction');

-- ---- LOTS ----
CREATE POLICY "lots_select" ON lots
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND statut = 'disponible')
  );
CREATE POLICY "lots_insert" ON lots
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "lots_update" ON lots
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "lots_delete" ON lots
  FOR DELETE USING (get_user_role() = 'direction');

-- ---- PROSPECTS ----
CREATE POLICY "prospects_select" ON prospects
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND apporteur_id = auth.uid())
  );
CREATE POLICY "prospects_insert" ON prospects
  FOR INSERT WITH CHECK (
    get_user_role() IN ('direction', 'manager', 'apporteur')
  );
CREATE POLICY "prospects_update" ON prospects
  FOR UPDATE USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND apporteur_id = auth.uid() AND statut = 'soumis')
  );
CREATE POLICY "prospects_delete" ON prospects
  FOR DELETE USING (get_user_role() = 'direction');

-- ---- VOUCHERS ----
CREATE POLICY "vouchers_select" ON vouchers
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND apporteur_id = auth.uid()) OR
    (get_user_role() = 'securite' AND date_visite = CURRENT_DATE)
  );
CREATE POLICY "vouchers_insert" ON vouchers
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "vouchers_update" ON vouchers
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ---- DOCUMENTS ----
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (
      get_user_role() = 'apporteur' AND actif = TRUE AND
      categorie != 'interne' AND
      get_user_role() = ANY(profils_autorises)
    )
  );
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (get_user_role() = 'direction');

-- ---- LIENS SECURISES ----
CREATE POLICY "liens_select" ON liens_securises
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );
CREATE POLICY "liens_insert" ON liens_securises
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "liens_update" ON liens_securises
  FOR UPDATE USING (TRUE); -- service role updates consultation count

-- ---- FORMULAIRES ----
CREATE POLICY "formulaires_select" ON formulaires
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );
CREATE POLICY "formulaires_insert" ON formulaires
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "formulaires_update" ON formulaires
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ---- SEJOURS ----
CREATE POLICY "sejours_select" ON sejours
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );
CREATE POLICY "sejours_insert" ON sejours
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager', 'apporteur'));
CREATE POLICY "sejours_update" ON sejours
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ---- WEEKENDS ACTIVES ----
CREATE POLICY "weekends_select" ON weekends_actives
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "weekends_insert" ON weekends_actives
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "weekends_update" ON weekends_actives
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ---- VENTES ----
CREATE POLICY "ventes_select" ON ventes
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND apporteur_id = auth.uid())
  );
CREATE POLICY "ventes_insert" ON ventes
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));
CREATE POLICY "ventes_update" ON ventes
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ============================================================
-- DONNÉES INITIALES — LOTS (16 lots)
-- ============================================================

INSERT INTO lots (reference, type, surface_hab, surface_terrain, prix_individuel, statut, loyer_fixe, forfait_amenagement) VALUES
-- 4 Appartements 1 chambre
('APT-1CH-01', 'appart_1ch', 52, NULL, 1300000, 'disponible', 45000, 80000),
('APT-1CH-02', 'appart_1ch', 54, NULL, 1320000, 'disponible', 45000, 80000),
('APT-1CH-03', 'appart_1ch', 51, NULL, 1280000, 'disponible', 45000, 80000),
('APT-1CH-04', 'appart_1ch', 55, NULL, 1350000, 'disponible', 45000, 80000),
-- 5 Appartements 2 chambres
('APT-2CH-01', 'appart_2ch', 78, NULL, 2100000, 'disponible', 65000, 120000),
('APT-2CH-02', 'appart_2ch', 80, NULL, 2150000, 'disponible', 65000, 120000),
('APT-2CH-03', 'appart_2ch', 76, NULL, 2080000, 'disponible', 65000, 120000),
('APT-2CH-04', 'appart_2ch', 82, NULL, 2200000, 'disponible', 65000, 120000),
('APT-2CH-05', 'appart_2ch', 79, NULL, 2120000, 'disponible', 65000, 120000),
-- 7 Villas Parc type E
('VIL-E-01', 'villa_e', 180, 350, 4200000, 'disponible', 120000, 250000),
('VIL-E-02', 'villa_e', 185, 360, 4350000, 'disponible', 120000, 250000),
('VIL-E-03', 'villa_e', 178, 340, 4150000, 'disponible', 120000, 250000),
('VIL-E-04', 'villa_e', 190, 380, 4500000, 'disponible', 120000, 250000),
('VIL-E-05', 'villa_e', 182, 355, 4250000, 'disponible', 120000, 250000),
('VIL-E-06', 'villa_e', 188, 370, 4400000, 'disponible', 120000, 250000),
('VIL-E-07', 'villa_e', 195, 400, 4650000, 'disponible', 120000, 250000);

-- ============================================================
-- DONNÉES INITIALES — WEEKENDS GOLDEN HOUR 2026
-- ============================================================

-- Avril 2026 (dates prioritaires : 15-18 et 28-30 avril)
INSERT INTO weekends_actives (date_vendredi, date_samedi, actif, notes) VALUES
('2026-04-03', '2026-04-04', true, NULL),
('2026-04-10', '2026-04-11', true, NULL),
('2026-04-17', '2026-04-18', true, 'PRIORITAIRE — Golden Hour'),
('2026-04-24', '2026-04-25', true, NULL),
('2026-04-29', '2026-04-30', true, 'PRIORITAIRE — Golden Hour');

-- Mai 2026 (dates prioritaires : 14-16 et 28-29 mai)
INSERT INTO weekends_actives (date_vendredi, date_samedi, actif, notes) VALUES
('2026-05-01', '2026-05-02', true, NULL),
('2026-05-08', '2026-05-09', true, NULL),
('2026-05-15', '2026-05-16', true, 'PRIORITAIRE — Golden Hour'),
('2026-05-22', '2026-05-23', true, NULL),
('2026-05-28', '2026-05-29', true, 'PRIORITAIRE — Golden Hour');

-- Juin 2026 (dates prioritaires : 10-11 juin)
INSERT INTO weekends_actives (date_vendredi, date_samedi, actif, notes) VALUES
('2026-06-05', '2026-06-06', true, NULL),
('2026-06-10', '2026-06-11', true, 'PRIORITAIRE — Golden Hour'),
('2026-06-12', '2026-06-13', true, NULL),
('2026-06-19', '2026-06-20', true, NULL),
('2026-06-26', '2026-06-27', true, NULL);

-- ============================================================
-- NOTES DE DÉPLOIEMENT
-- ============================================================
-- Après exécution de ce script :
-- 1. Créer les 4 utilisateurs test via Supabase Auth Dashboard
--    direction@azembay.ma / Direction2026!
--    manager@azembay.ma  / Manager2026!
--    apporteur@azembay.ma / Apporteur2026!
--    securite@azembay.ma / Securite2026!
-- 2. Activer Supabase Storage bucket "documents" (public: false)
-- 3. Configurer les policies Storage pour les rôles autorisés
