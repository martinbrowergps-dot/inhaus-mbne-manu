DROP POLICY IF EXISTS "Usuarios autenticados leem o historico de sincronizacao" ON public.sync_log;

CREATE POLICY "Admins e gestores leem o historico de sincronizacao"
ON public.sync_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor')
  OR user_id = auth.uid()
);