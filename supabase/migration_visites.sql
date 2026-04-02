-- ============================================================
-- MIGRATION : Remplacement weekends_actives par jours_disponibles
-- + Table visites avec workflow de confirmation
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Nouveau type statut visite
CREATE TYPE visite_statut AS ENUM (
  'demandee', 'confirmee_manager', 'confirmee_securite', 'realisee', 'annulee'
);

-- 2. Table jours_disponibles (remplace weekends_actives)
CREATE TABLE IF NOT EXISTS jours_disponibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  capacite INTEGER NOT NULL DEFAULT 2,
  actif BOOLEAN NOT NULL DEFAULT true,
  prioritaire BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table visites
CREATE TABLE IF NOT EXISTS visites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  jour_id UUID NOT NULL REFERENCES jours_disponibles(id),
  date_visite DATE NOT NULL,
  statut visite_statut NOT NULL DEFAULT 'demandee',
  notes_apporteur TEXT,
  notes_securite TEXT,
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_securite_by UUID REFERENCES profiles(id),
  confirmed_manager_at TIMESTAMPTZ,
  confirmed_securite_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE jours_disponibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jours_select" ON jours_disponibles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "jours_manage" ON jours_disponibles
  FOR ALL USING (get_user_role() IN ('direction', 'manager'));

CREATE POLICY "visites_select" ON visites
  FOR SELECT USING (
    get_user_role() IN ('direction', 'manager', 'securite') OR
    (get_user_role() = 'apporteur' AND
      prospect_id IN (SELECT id FROM prospects WHERE apporteur_id = auth.uid()))
  );
CREATE POLICY "visites_insert" ON visites
  FOR INSERT WITH CHECK (get_user_role() IN ('direction', 'manager', 'apporteur'));
CREATE POLICY "visites_update" ON visites
  FOR UPDATE USING (get_user_role() IN ('direction', 'manager', 'securite'));

-- 5. Trigger updated_at
CREATE TRIGGER visites_updated_at
  BEFORE UPDATE ON visites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Seed : tous les jours disponibles
-- AVRIL 2026
INSERT INTO jours_disponibles (date, capacite, prioritaire) VALUES
('2026-04-01', 2, false), ('2026-04-02', 2, false), ('2026-04-03', 2, false),
('2026-04-04', 2, false), ('2026-04-05', 2, false),
('2026-04-11', 2, false), ('2026-04-12', 2, false), ('2026-04-13', 2, false),
('2026-04-14', 2, false),
('2026-04-15', 2, true),  ('2026-04-16', 2, true),  ('2026-04-17', 2, true),
('2026-04-18', 2, true),  ('2026-04-19', 2, false), ('2026-04-20', 2, false),
('2026-04-26', 2, false), ('2026-04-27', 2, false),
('2026-04-28', 2, true),  ('2026-04-29', 2, true),  ('2026-04-30', 2, true);

-- MAI 2026
INSERT INTO jours_disponibles (date, capacite, prioritaire) VALUES
('2026-05-01', 2, false), ('2026-05-02', 2, false), ('2026-05-03', 2, false),
('2026-05-04', 2, false), ('2026-05-05', 2, false),
('2026-05-08', 2, false), ('2026-05-09', 2, false), ('2026-05-10', 2, false),
('2026-05-13', 2, false),
('2026-05-14', 2, true),  ('2026-05-15', 2, true),  ('2026-05-16', 2, true),
('2026-05-17', 2, false), ('2026-05-18', 2, false),
('2026-05-22', 2, false), ('2026-05-23', 2, false), ('2026-05-24', 2, false),
('2026-05-27', 2, false),
('2026-05-28', 2, true),  ('2026-05-29', 2, true),
('2026-05-30', 2, false), ('2026-05-31', 2, false);

-- JUIN 2026
INSERT INTO jours_disponibles (date, capacite, prioritaire) VALUES
('2026-06-01', 2, false),
('2026-06-04', 2, false), ('2026-06-05', 2, false), ('2026-06-06', 2, false),
('2026-06-09', 2, false),
('2026-06-10', 2, true),  ('2026-06-11', 2, true),
('2026-06-12', 2, false), ('2026-06-13', 2, false), ('2026-06-14', 2, false),
('2026-06-17', 2, false), ('2026-06-18', 2, false), ('2026-06-19', 2, false),
('2026-06-20', 2, false),
('2026-06-22', 2, false), ('2026-06-23', 2, false), ('2026-06-24', 2, false),
('2026-06-25', 2, false), ('2026-06-26', 2, false),
('2026-06-29', 2, false), ('2026-06-30', 2, false);
