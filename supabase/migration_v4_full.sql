-- ═══════════════════════════════════════════════════════════════
-- MIGRATION V4 — Sources, Acquéreurs, Multi-lots, Post-séjour
-- ═══════════════════════════════════════════════════════════════

-- 1. TABLE ACQUÉREURS
CREATE TABLE IF NOT EXISTS public.acquereurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  description TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE SOURCES RÉMUNÉRÉES
CREATE TABLE IF NOT EXISTS public.sources_remunerees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COLONNES PROSPECT
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('public', 'acquereur', 'source_remuneree')),
  ADD COLUMN IF NOT EXISTS source_remuneree_id UUID REFERENCES public.sources_remunerees(id),
  ADD COLUMN IF NOT EXISTS acquereur_id UUID REFERENCES public.acquereurs(id),
  ADD COLUMN IF NOT EXISTS assignation_validee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assignation_validee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignation_validee_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j1_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j2_midi_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sejour_rappel_j2_soir_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sejour_j7_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_sejour_j60_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS orange_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liste_attente_notes TEXT,
  ADD COLUMN IF NOT EXISTS liste_attente_delai TEXT;

-- 4. COLONNES FORMULAIRE (multi-lots + validation direction)
ALTER TABLE public.formulaires
  ADD COLUMN IF NOT EXISTS lot_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS statut_direction TEXT DEFAULT 'en_attente_direction'
    CHECK (statut_direction IN ('en_attente_direction', 'valide_direction', 'rejete_direction')),
  ADD COLUMN IF NOT EXISTS valide_par_direction_at DATE,
  ADD COLUMN IF NOT EXISTS valide_par_direction_id UUID REFERENCES auth.users(id);

-- Remplir lot_ids pour les formulaires existants
UPDATE public.formulaires 
SET lot_ids = ARRAY[lot_id] 
WHERE (lot_ids IS NULL OR lot_ids = '{}') AND lot_id IS NOT NULL;

-- 5. RLS ACQUÉREURS
ALTER TABLE public.acquereurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acquereurs lecture" ON public.acquereurs;
DROP POLICY IF EXISTS "Acquereurs gestion" ON public.acquereurs;
CREATE POLICY "Acquereurs lecture" ON public.acquereurs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acquereurs gestion" ON public.acquereurs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direction', 'manager')));

-- 6. RLS SOURCES RÉMUNÉRÉES
ALTER TABLE public.sources_remunerees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sources lecture" ON public.sources_remunerees;
DROP POLICY IF EXISTS "Sources gestion" ON public.sources_remunerees;
CREATE POLICY "Sources lecture" ON public.sources_remunerees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sources gestion" ON public.sources_remunerees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direction', 'manager')));

