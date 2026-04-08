-- Migration V4: sources_remunerees, formulaire multi-lots, validation direction

-- Table sources_remunerees
CREATE TABLE IF NOT EXISTS public.sources_remunerees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter colonnes source au prospect
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('public', 'acquereur', 'source_remuneree')),
  ADD COLUMN IF NOT EXISTS source_remuneree_id UUID REFERENCES public.sources_remunerees(id);

-- Ajouter colonnes multi-lots et validation direction aux formulaires
ALTER TABLE public.formulaires
  ADD COLUMN IF NOT EXISTS lot_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS statut_direction TEXT DEFAULT 'en_attente_direction'
    CHECK (statut_direction IN ('en_attente_direction', 'valide_direction', 'rejete_direction')),
  ADD COLUMN IF NOT EXISTS valide_par_direction_at DATE,
  ADD COLUMN IF NOT EXISTS valide_par_direction_id UUID REFERENCES auth.users(id);

-- Mettre à jour lot_ids existants avec lot_id
UPDATE public.formulaires SET lot_ids = ARRAY[lot_id] WHERE lot_ids = '{}' OR lot_ids IS NULL;

-- RLS sources_remunerees
ALTER TABLE public.sources_remunerees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sources lisibles" ON public.sources_remunerees;
DROP POLICY IF EXISTS "Sources gestion direction" ON public.sources_remunerees;
CREATE POLICY "Sources lisibles" ON public.sources_remunerees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sources gestion direction" ON public.sources_remunerees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direction', 'manager')));

-- Nouveaux statuts prospects orange et liste_attente
-- (PostgreSQL enum update)
ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'orange';
ALTER TYPE prospect_statut ADD VALUE IF NOT EXISTS 'liste_attente';

-- Champs liste d'attente sur prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS liste_attente_delai DATE,
  ADD COLUMN IF NOT EXISTS liste_attente_notes TEXT;
