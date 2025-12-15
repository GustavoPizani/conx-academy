-- Adiciona a coluna 'videos' na tabela 'courses' para armazenar uma lista de objetos JSON.
-- Cada objeto terá um título e uma URL. O valor padrão é uma lista vazia '[]'.
ALTER TABLE public.courses
ADD COLUMN videos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Habilita a Segurança em Nível de Linha (RLS) para a tabela, se ainda não estiver ativa.
-- Isso garante que nossas políticas de acesso sejam aplicadas.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas de update/delete se existirem, para evitar conflitos.
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;

-- Cria uma nova política que permite que usuários com a role 'admin' atualizem qualquer curso.
CREATE POLICY "Admins can update courses" ON public.courses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Cria uma nova política que permite que usuários com a role 'admin' excluam qualquer curso.
CREATE POLICY "Admins can delete courses" ON public.courses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);
