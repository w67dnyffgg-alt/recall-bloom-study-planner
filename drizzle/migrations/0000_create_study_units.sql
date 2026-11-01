CREATE TABLE public.study_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL,
  material text NOT NULL DEFAULT '',
  unit_name text NOT NULL,
  pages text NOT NULL DEFAULT '',
  studied_at timestamptz NOT NULL DEFAULT now(),
  memo text NOT NULL DEFAULT '',
  stage int NOT NULL DEFAULT 0,
  next_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_units TO authenticated;
GRANT ALL ON public.study_units TO service_role;
ALTER TABLE public.study_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own units" ON public.study_units FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.study_units (user_id, next_review_at);

CREATE TABLE public.review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  unit_id uuid NOT NULL REFERENCES public.study_units(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('good','unsure','forgot')),
  stage_before int NOT NULL,
  stage_after int NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_logs TO authenticated;
GRANT ALL ON public.review_logs TO service_role;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.review_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.review_logs (user_id, reviewed_at);