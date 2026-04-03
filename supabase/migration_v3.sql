-- ============================================================
-- AZEMBAY RIPT 1 — Migration V3
-- Corrections enums + nouvelles tables + données réelles
-- À exécuter APRÈS schema.sql + migration_v2.sql + migration_visites.sql
-- ============================================================

-- ============================================================
-- 1. CORRECTIONS ENUM prospect_statut
-- Ajouter 'qualifie' entre 'soumis' et 'valide'
-- ============================================================

ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'qualifie' AFTER 'soumis';

-- ============================================================
-- 2. CORRECTIONS ENUM visite_statut
-- Ancien : 'demandee','confirmee_manager','confirmee_securite','realisee','annulee'
-- Nouveau : 'confirmee','realisee','annulee'
-- ============================================================

-- Migrer les données existantes vers les nouveaux statuts
UPDATE visites SET statut = 'confirmee_manager'
  WHERE statut = 'demandee';

-- Créer nouveau type
ALTER TYPE visite_statut RENAME TO visite_statut_old;
CREATE TYPE visite_statut AS ENUM ('confirmee', 'realisee', 'annulee');

-- Mettre à jour la colonne
ALTER TABLE visites
  ALTER COLUMN statut DROP DEFAULT,
  ALTER COLUMN statut TYPE visite_statut
    USING (
      CASE statut::text
        WHEN 'demandee'            THEN 'confirmee'
        WHEN 'confirmee_manager'   THEN 'confirmee'
        WHEN 'confirmee_securite'  THEN 'confirmee'
        WHEN 'realisee'            THEN 'realisee'
        WHEN 'annulee'             THEN 'annulee'
        ELSE 'confirmee'
      END
    )::visite_statut,
  ALTER COLUMN statut SET DEFAULT 'confirmee';

DROP TYPE visite_statut_old;

-- ============================================================
-- 3. CORRECTIONS ENUM weekend_statut
-- Ancien : 'pre_liste','ouvert','validation','confirme','ferme'
-- Nouveau : 'ouvert','valide','complet','passe'
-- ============================================================

ALTER TYPE weekend_statut RENAME TO weekend_statut_old;
CREATE TYPE weekend_statut AS ENUM ('ouvert', 'valide', 'complet', 'passe');

ALTER TABLE weekends_actives
  ALTER COLUMN statut DROP DEFAULT,
  ALTER COLUMN statut TYPE weekend_statut
    USING (
      CASE statut::text
        WHEN 'pre_liste'   THEN 'ouvert'
        WHEN 'ouvert'      THEN 'ouvert'
        WHEN 'validation'  THEN 'ouvert'
        WHEN 'confirme'    THEN 'valide'
        WHEN 'ferme'       THEN 'passe'
        ELSE 'ouvert'
      END
    )::weekend_statut,
  ALTER COLUMN statut SET DEFAULT 'ouvert';

DROP TYPE weekend_statut_old;

-- ============================================================
-- 4. CORRECTIONS TABLE weekends_actives
-- Ajouter valide_at, valide_by (remplace confirmed_at)
-- ============================================================

ALTER TABLE weekends_actives
  ADD COLUMN IF NOT EXISTS valide_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valide_by UUID REFERENCES profiles(id);

-- Migrer confirmed_at → valide_at
UPDATE weekends_actives SET valide_at = confirmed_at WHERE confirmed_at IS NOT NULL;

-- ============================================================
-- 5. CORRECTIONS TABLE visites
-- Ajouter apporteur_id, heure_visite, check-in sécurité
-- ============================================================

ALTER TABLE visites
  ADD COLUMN IF NOT EXISTS apporteur_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS heure_visite TIME,
  ADD COLUMN IF NOT EXISTS arrivee_validee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS arrivee_validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence_manager BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS presence_manager_validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS annulation_token UUID;

-- Remplir apporteur_id depuis le prospect
UPDATE visites v
  SET apporteur_id = p.apporteur_id
  FROM prospects p
  WHERE v.prospect_id = p.id
  AND v.apporteur_id IS NULL;

-- ============================================================
-- 6. TABLE annulation_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS annulation_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('visite', 'sejour')),
  reference_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE annulation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tokens_public_select" ON annulation_tokens
  FOR SELECT USING (TRUE);

CREATE POLICY "tokens_insert" ON annulation_tokens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tokens_update" ON annulation_tokens
  FOR UPDATE USING (TRUE);

-- ============================================================
-- 7. TABLE prospect_lots (multi-lots par prospect)
-- ============================================================

CREATE TABLE IF NOT EXISTS prospect_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prospect_id, lot_id)
);

ALTER TABLE prospect_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_lots_select" ON prospect_lots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "prospect_lots_insert" ON prospect_lots
  FOR INSERT WITH CHECK (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );

CREATE POLICY "prospect_lots_delete" ON prospect_lots
  FOR DELETE USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );

-- ============================================================
-- 8. TABLE stock_hebergement (unités séjours — distinctes des lots à vendre)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_hebergement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  type lot_type NOT NULL,
  adultes_max INTEGER NOT NULL DEFAULT 2,
  enfants_max INTEGER NOT NULL DEFAULT 2,
  disponible BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_hebergement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hebergement_select" ON stock_hebergement
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "hebergement_manage" ON stock_hebergement
  FOR ALL USING (get_user_role() IN ('direction', 'manager'));

-- Données pré-chargées (4 unités réelles)
INSERT INTO stock_hebergement (reference, type, adultes_max, enfants_max) VALUES
  ('AH108', 'appart_1ch', 2, 2),
  ('AH105', 'appart_2ch', 4, 2),
  ('AH107', 'appart_2ch', 4, 2),
  ('VPH8',  'villa_e',    4, 2)
ON CONFLICT (reference) DO NOTHING;

-- ============================================================
-- 9. CORRECTIONS TABLE sejours
-- Ajouter champs enfants détaillés, stock_hebergement_id, token, préférences
-- ============================================================

ALTER TABLE sejours
  ADD COLUMN IF NOT EXISTS nb_enfants_plus_6 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_enfants_moins_6 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_hebergement_id UUID REFERENCES stock_hebergement(id),
  ADD COLUMN IF NOT EXISTS annulation_token_id UUID REFERENCES annulation_tokens(id),
  ADD COLUMN IF NOT EXISTS preferences_weekends JSONB;

-- Renommer nb_enfants → nb_enfants_total (si la colonne existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sejours' AND column_name = 'nb_enfants'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sejours' AND column_name = 'nb_enfants_total'
  ) THEN
    ALTER TABLE sejours RENAME COLUMN nb_enfants TO nb_enfants_total;
  END IF;
END $$;

-- Initialiser les nouveaux champs depuis nb_enfants_total
UPDATE sejours
  SET nb_enfants_plus_6 = COALESCE(nb_enfants_total, 0),
      nb_enfants_moins_6 = 0
  WHERE nb_enfants_plus_6 = 0 AND nb_enfants_moins_6 = 0;

-- ============================================================
-- 10. CORRECTIONS TABLE profiles (quota séjours)
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quota_sejours_utilise INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_sejours_max INTEGER DEFAULT 6;

-- Calculer quota utilisé pour les apporteurs existants
UPDATE profiles p
  SET quota_sejours_utilise = (
    SELECT COUNT(*)
    FROM sejours s
    JOIN prospects pr ON s.prospect_id = pr.id
    WHERE pr.apporteur_id = p.id
    AND s.statut NOT IN ('annule')
  )
  WHERE p.role = 'apporteur';

-- ============================================================
-- 11. CORRECTIONS TABLE lots
-- Ajouter champs TF + surfaces manquantes
-- ============================================================

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS titre_foncier TEXT,
  ADD COLUMN IF NOT EXISTS loggias NUMERIC,
  ADD COLUMN IF NOT EXISTS terrasses NUMERIC,
  ADD COLUMN IF NOT EXISTS jardin NUMERIC,
  ADD COLUMN IF NOT EXISTS surface_cadastrale NUMERIC,
  ADD COLUMN IF NOT EXISTS surface_hab_ajustee NUMERIC;

-- ============================================================
-- 12. PURGE ET RECHARGEMENT DES LOTS AVEC DONNÉES RÉELLES
-- ATTENTION : supprime les anciens lots fictifs
-- ============================================================

-- Supprimer les dépendances d'abord
DELETE FROM prospect_lots;
DELETE FROM formulaires;
DELETE FROM sejours;
DELETE FROM vouchers;
DELETE FROM lots;

-- Insérer les 16 lots réels
INSERT INTO lots (reference, type, surface_hab, surface_terrain, loggias, terrasses,
  jardin, surface_cadastrale, surface_hab_ajustee, titre_foncier,
  prix_individuel, prix_bloc, statut) VALUES

-- Appartements 1 chambre
('AH13',  'appart_1ch', 74,  NULL, 22, 0,  NULL, 96,  96,  '212261/08', 1768900, 1610630, 'disponible'),
('AH14',  'appart_1ch', 62,  NULL, 11, 0,  NULL, 73,  73,  '212262/08', 1428800, 1300960, 'disponible'),
('AH24',  'appart_1ch', 73,  NULL, 0,  22, 0,    95,  73,  '212272/08', 1596000, 1453200, 'disponible'),
('AH25',  'appart_1ch', 61,  NULL, 0,  11, 0,    72,  61,  '212273/08', 1263500, 1150450, 'disponible'),

-- Appartements 2 chambres
('AH10',  'appart_2ch', 110, NULL, 34, 0,  NULL, 144, 144, '212258/08', 2571650, 2341555, 'disponible'),
('AH12',  'appart_2ch', 105, NULL, 23, 0,  NULL, 128, 128, '212260/08', 2213500, 2015450, 'disponible'),
('AH15',  'appart_2ch', 93,  NULL, 0,  22, NULL, 115, 93,  '212263/08', 2094750, 1907325, 'disponible'),
('AH21',  'appart_2ch', 99,  NULL, 0,  22, NULL, 121, 99,  '212269/08', 1964600, 1788820, 'disponible'),
('AH23',  'appart_2ch', 105, NULL, 0,  22, NULL, 127, 105, '212271/08', 2005450, 1826015, 'disponible'),

-- Villas Parc Type E
('E-VPH1',  'villa_e', 166, 407, 20, 92, 131, 544, 186, '212227/08', 4733349, 4211382, 'disponible'),
('E-VPH2',  'villa_e', 172, 363, 20, 86, 107, 502, 192, '212228/08', 4589734, 4086856, 'disponible'),
('E-VPH6',  'villa_e', 172, 357, 20, 86, 110, 496, 192, '212232/08', 4269303, 3801173, 'disponible'),
('E-VPH9',  'villa_e', 172, 361, 20, 86, 95,  499, 192, '212235/08', 3969959, 3536343, 'disponible'),
('E-VPH12', 'villa_e', 166, 379, 20, 86, 93,  519, 186, '212238/08', 3956761, 3524537, 'disponible'),
('E-VPH17', 'villa_e', 172, 451, 20, 86, 190, 591, 192, '212243/08', 4425000, 3930500, 'disponible'),
('E-VPH18', 'villa_e', 166, 315, 20, 86, 62,  456, 186, '212244/08', 3976596, 3545943, 'disponible');

-- ============================================================
-- 13. SUPPRESSION auto_liberer_lots (remplacé par alerte J+30 manuelle)
-- ============================================================

DROP TRIGGER IF EXISTS auto_liberer_lots_trigger ON sejours;
DROP FUNCTION IF EXISTS auto_liberer_lots();

-- Supprimer aussi les alertes J+15/J+23/J+28 si elles existent
DROP FUNCTION IF EXISTS sendAlerteNoShow(UUID, INTEGER);

-- ============================================================
-- 14. INDEX UTILES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_annulation_tokens_token ON annulation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_annulation_tokens_reference ON annulation_tokens(reference_id);
CREATE INDEX IF NOT EXISTS idx_prospect_lots_prospect ON prospect_lots(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_lots_lot ON prospect_lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_visites_apporteur ON visites(apporteur_id);
CREATE INDEX IF NOT EXISTS idx_sejours_stock ON sejours(stock_hebergement_id);

-- ============================================================
-- 15. UTILISATEURS RÉELS
-- À exécuter APRÈS création des comptes dans Supabase Auth Dashboard
-- Format mot de passe : Prenom2026!
-- ============================================================

-- INSERT profiles (les comptes auth.users doivent exister avant)
-- Décommenter et exécuter après création des comptes Auth :

/*
INSERT INTO profiles (id, email, nom, prenom, telephone, role)
SELECT id, 'anasderraji@gmail.com', 'Derraji', 'Anas', '0663123727', 'apporteur'
  FROM auth.users WHERE email = 'anasderraji@gmail.com'
ON CONFLICT (id) DO UPDATE SET nom='Derraji', prenom='Anas', telephone='0663123727', role='apporteur';

INSERT INTO profiles (id, email, nom, prenom, telephone, role)
SELECT id, 'haba@gmail.com', 'Aba', 'Hicham', '0661965652', 'manager'
  FROM auth.users WHERE email = 'haba@gmail.com'
ON CONFLICT (id) DO UPDATE SET nom='Aba', prenom='Hicham', telephone='0661965652', role='manager';

INSERT INTO profiles (id, email, nom, prenom, telephone, role)
SELECT id, 'khaoulameynaoui@gmail.com', 'Meynaoui', 'Khaoula', '0673457761', 'apporteur'
  FROM auth.users WHERE email = 'khaoulameynaoui@gmail.com'
ON CONFLICT (id) DO UPDATE SET nom='Meynaoui', prenom='Khaoula', telephone='0673457761', role='apporteur';

INSERT INTO profiles (id, email, nom, prenom, telephone, role)
SELECT id, 'linajconnect@gmail.com', 'Jaidi', 'Lina', '0660400107', 'apporteur'
  FROM auth.users WHERE email = 'linajconnect@gmail.com'
ON CONFLICT (id) DO UPDATE SET nom='Jaidi', prenom='Lina', telephone='0660400107', role='apporteur';
*/

-- ============================================================
-- FIN MIGRATION V3
-- ============================================================
