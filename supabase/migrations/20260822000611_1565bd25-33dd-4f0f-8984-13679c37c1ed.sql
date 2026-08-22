-- Promove o usuário atual a admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('2e2f80d2-09e1-42f4-aa20-90eba8289c3c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admins podem ver todos os papéis
CREATE POLICY "Admins leem todos os papeis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem conceder papéis
CREATE POLICY "Admins concedem papeis"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem remover papéis (menos o próprio admin, evita auto-bloqueio)
CREATE POLICY "Admins removem papeis"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND NOT (user_id = auth.uid() AND role = 'admin'));

GRANT INSERT, DELETE ON public.user_roles TO authenticated;

-- Admins podem listar perfis (tela de administração de usuários)
CREATE POLICY "Admins leem todos os perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));