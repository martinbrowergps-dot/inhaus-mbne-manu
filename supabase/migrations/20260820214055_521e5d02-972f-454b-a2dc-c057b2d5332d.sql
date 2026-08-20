CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL DEFAULT 'manual',
  user_id uuid,
  user_email text,
  sucesso boolean NOT NULL,
  erro text,
  duracao_ms integer,
  counts jsonb,
  warnings jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_created_at ON public.sync_log (created_at DESC);

GRANT SELECT ON public.sync_log TO authenticated;
GRANT ALL ON public.sync_log TO service_role;

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leem o historico de sincronizacao"
ON public.sync_log FOR SELECT TO authenticated USING (true);