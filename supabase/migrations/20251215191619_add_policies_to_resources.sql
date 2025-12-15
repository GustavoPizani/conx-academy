-- Habilita a Segurança em Nível de Linha (RLS) para a tabela 'resources'.
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Permite que todos os usuários autenticados leiam os recursos.
-- Se os recursos devem ser públicos, troque auth.role() = 'authenticated' por 'true'.
DROP POLICY IF EXISTS "Authenticated users can view resources" ON public.resources;
CREATE POLICY "Authenticated users can view resources" ON public.resources
FOR SELECT USING (auth.role() = 'authenticated');

-- Remove políticas antigas de CUD se existirem, para evitar conflitos.
DROP POLICY IF EXISTS "Admins can create resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can update resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;

-- Cria uma nova política que permite que usuários com a role 'admin' criem recursos.
CREATE POLICY "Admins can create resources" ON public.resources
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Cria uma nova política que permite que usuários com a role 'admin' atualizem qualquer recurso.
CREATE POLICY "Admins can update resources" ON public.resources
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Cria uma nova política que permite que usuários com a role 'admin' excluam qualquer recurso.
CREATE POLICY "Admins can delete resources" ON public.resources
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);
