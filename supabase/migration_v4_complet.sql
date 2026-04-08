-- ============================================================
-- MIGRATION V4 COMPLÈTE
-- Sources rémunérées, formulaire multi-lots, validation Direction,
-- liste d'attente, cycle post-séjour, statut orange
-- ============================================================

-- 1. TABLE sources_remunerees
CREATE TABLE IF NOT EXISTS public.sources_remunerees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  taux_commission NUMERIC(5,2) DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COLONNES SOURCES SUR PROSPECTS
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'apporteur'
    CHECK (source IN ('apporteur', 'public', 'acquereur', 'source_remuneree', 'direct')),
  ADD COLUMN IF NOT EXISTS source_remuneree_id UUID REFERENCES public.sources_remunerees(id),
  ADD COLUMN IF NOT EXISTS source_modifie_par UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS source_modifie_at TIMESTAMPTZ;

-- 3. STATUT ORANGE + LISTE ATTENTE SUR PROSPECTS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'prospect_statut' AND e.enumlabel = 'orange'
  ) THEN
    ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'orange';
    ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'liste_attente';
    ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'closing';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ajout colonnes statut étendu prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS statut_orange_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liste_attente_delai_mois INTEGER,
  ADD COLUMN IF NOT EXISTS liste_attente_relance_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liste_attente_relance_envoyee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_sejour_note_j1 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j1_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j2_midi_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j2_soir_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sejour_realise_at TIMESTAMPTZ;

-- 4. FORMULAIRES MULTI-LOTS + VALIDATION DIRECTION
ALTER TABLE public.formulaires
  ADD COLUMN IF NOT EXISTS lot_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prix_total NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS statut_direction TEXT DEFAULT 'en_attente_direction'
    CHECK (statut_direction IN ('en_attente_direction', 'valide_direction', 'rejete_direction')),
  ADD COLUMN IF NOT EXISTS valide_par_direction_at DATE,
  ADD COLUMN IF NOT EXISTS valide_par_direction_id UUID REFERENCES auth.users(id);

-- Backfill lot_ids
UPDATE public.formulaires 
SET lot_ids = ARRAY[lot_id] 
WHERE (lot_ids = '{}' OR lot_ids IS NULL) AND lot_id IS NOT NULL;

-- 5. LISTE D'ATTENTE - table séparée pour historique
CREATE TABLE IF NOT EXISTS public.liste_attente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  apporteur_id UUID NOT NULL REFERENCES auth.users(id),
  delai_mois INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  relance_at TIMESTAMPTZ,
  relance_envoyee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS
ALTER TABLE public.sources_remunerees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sources_select" ON public.sources_remunerees;
DROP POLICY IF EXISTS "sources_all" ON public.sources_remunerees;
CREATE POLICY "sources_select" ON public.sources_remunerees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sources_all" ON public.sources_remunerees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direction', 'manager')));

ALTER TABLE public.liste_attente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la_select" ON public.liste_attente;
DROP POLICY IF EXISTS "la_all" ON public.liste_attente;
CREATE POLICY "la_select" ON public.liste_attente
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "la_all" ON public.liste_attente
  FOR ALL TO authenticated USING (true);

