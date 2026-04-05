-- ============================================================
-- AZEMBAY RIPT 1 — Migration V2
-- Séjours test lifecycle complet + Fiche vivante + Factures
-- ============================================================

-- ============================================================
-- 1. NOUVEAUX TYPES ENUM
-- ============================================================

CREATE TYPE weekend_statut AS ENUM ('pre_liste', 'ouvert', 'validation', 'confirme', 'ferme');

-- Ajouter no_show au sejour_statut existant
ALTER TYPE sejour_statut ADD VALUE IF NOT EXISTS 'no_show';

-- ============================================================
-- 2. MODIFICATIONS TABLE weekends_actives (lifecycle)
-- ============================================================

ALTER TABLE weekends_actives
  ADD COLUMN IF NOT EXISTS statut weekend_statut NOT NULL DEFAULT 'ouvert',
  ADD COLUMN IF NOT EXISTS nb_sejours_confirmes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_dimanche DATE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Calculer date_dimanche = date_samedi + 1 jour
UPDATE weekends_actives SET date_dimanche = date_samedi + INTERVAL '1 day'
WHERE date_dimanche IS NULL;

-- Mettre les weekends passés en ferme
UPDATE weekends_actives SET statut = 'ferme'
WHERE date_samedi < CURRENT_DATE AND statut = 'ouvert';

-- ============================================================
-- 3. MODIFICATIONS TABLE lots (capacités)
-- ============================================================

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS adultes_max INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS enfants_max INTEGER DEFAULT 2;

-- Mettre à jour les capacités par type
UPDATE lots SET adultes_max = 2, enfants_max = 2 WHERE type = 'appart_1ch';
UPDATE lots SET adultes_max = 4, enfants_max = 2 WHERE type = 'appart_2ch';
UPDATE lots SET adultes_max = 4, enfants_max = 2 WHERE type = 'villa_e';

-- ============================================================
-- 4. MODIFICATIONS TABLE prospects
-- ============================================================

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS temperature INTEGER DEFAULT 3 CHECK (temperature BETWEEN 1 AND 5);

-- ============================================================
-- 5. MODIFICATIONS TABLE sejours (lifecycle complet)
-- ============================================================

ALTER TABLE sejours
  ADD COLUMN IF NOT EXISTS apporteur_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS weekend_id UUID REFERENCES weekends_actives(id),
  ADD COLUMN IF NOT EXISTS date_souhaitee_1 DATE,
  ADD COLUMN IF NOT EXISTS date_souhaitee_2 DATE,
  ADD COLUMN IF NOT EXISTS date_souhaitee_3 DATE,
  ADD COLUMN IF NOT EXISTS noshow BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS noshow_declared_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS noshow_declared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS facture_envoyee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recouvre_confirme_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS recouvre_confirme_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lot_libere_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes_manager TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger updated_at sur sejours
CREATE OR REPLACE FUNCTION sejours_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sejours_updated_at ON sejours;
CREATE TRIGGER sejours_updated_at
  BEFORE UPDATE ON sejours
  FOR EACH ROW EXECUTE FUNCTION sejours_updated_at_fn();

-- ============================================================
-- 6. TABLE client_notes (fiche vivante)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES profiles(id),
  contenu TEXT NOT NULL,
  temperature INTEGER CHECK (temperature BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON client_notes
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );

CREATE POLICY "notes_insert" ON client_notes
  FOR INSERT WITH CHECK (
    get_user_role() IN ('direction', 'manager', 'apporteur')
  );

CREATE POLICY "notes_delete" ON client_notes
  FOR DELETE USING (
    auteur_id = auth.uid() OR get_user_role() = 'direction'
  );

-- ============================================================
-- 7. TABLE factures (no-show invoices)
-- ============================================================

CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sejour_id UUID NOT NULL REFERENCES sejours(id),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  numero_facture TEXT UNIQUE,
  montant_ht NUMERIC NOT NULL,
  tva_pct NUMERIC DEFAULT 20,
  montant_ttc NUMERIC NOT NULL,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  statut TEXT NOT NULL DEFAULT 'emise' CHECK (statut IN ('emise', 'payee', 'avoir')),
  pdf_path TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-numéro facture
CREATE OR REPLACE FUNCTION generate_facture_numero()
RETURNS TRIGGER AS $$
DECLARE seq_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM factures;
  NEW.numero_facture := 'FAC-AZB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_facture_numero ON factures;
CREATE TRIGGER set_facture_numero
  BEFORE INSERT ON factures
  FOR EACH ROW WHEN (NEW.numero_facture IS NULL)
  EXECUTE FUNCTION generate_facture_numero();

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_select" ON factures
  FOR SELECT USING (get_user_role() IN ('direction', 'manager'));

CREATE POLICY "factures_insert" ON factures
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager'));

CREATE POLICY "factures_update" ON factures
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager'));

-- ============================================================
-- 8. TABLE liste_attente
-- ============================================================

CREATE TABLE IF NOT EXISTS liste_attente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  apporteur_id UUID NOT NULL REFERENCES profiles(id),
  lot_type lot_type NOT NULL,
  priorite INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prospect_id)
);

ALTER TABLE liste_attente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attente_select" ON liste_attente
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager') OR
    (get_user_role() = 'apporteur' AND apporteur_id = auth.uid())
  );

CREATE POLICY "attente_insert" ON liste_attente
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager', 'apporteur'));

CREATE POLICY "attente_delete" ON liste_attente
  FOR DELETE USING (get_user_role() IN ('direction', 'manager'));

-- ============================================================
-- 9. FONCTION: auto-libérer lots après 30 jours sans recouvrement
-- (appelée par un cron job Supabase ou pg_cron)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_liberer_lots()
RETURNS void AS $$
BEGIN
  -- Libérer les lots bloqués sur séjours no-show non recouvrés depuis 30 jours
  UPDATE lots
  SET statut = 'disponible'
  WHERE id IN (
    SELECT s.lot_assigne_id
    FROM sejours s
    WHERE s.noshow = TRUE
      AND s.recouvre = FALSE
      AND s.noshow_declared_at IS NOT NULL
      AND s.noshow_declared_at < NOW() - INTERVAL '30 days'
      AND s.lot_libere_at IS NULL
      AND s.lot_assigne_id IS NOT NULL
  );

  -- Marquer les séjours comme lot libéré
  UPDATE sejours
  SET lot_libere_at = NOW()
  WHERE noshow = TRUE
    AND recouvre = FALSE
    AND noshow_declared_at IS NOT NULL
    AND noshow_declared_at < NOW() - INTERVAL '30 days'
    AND lot_libere_at IS NULL
    AND lot_assigne_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. FONCTION: compter séjours apporteur (quota 6)
-- ============================================================

CREATE OR REPLACE FUNCTION count_sejours_apporteur(p_apporteur_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM sejours s
  JOIN prospects p ON s.prospect_id = p.id
  WHERE p.apporteur_id = p_apporteur_id
    AND s.statut NOT IN ('annule')
    AND s.date_arrivee <= '2026-06-30';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 11. NOTES: Mettre à jour weekends ouvert (pas fermé)
-- Les weekends futurs restent "ouvert" par défaut
-- ============================================================

UPDATE weekends_actives
SET statut = 'ouvert'
WHERE date_samedi >= CURRENT_DATE AND statut = 'ouvert';
