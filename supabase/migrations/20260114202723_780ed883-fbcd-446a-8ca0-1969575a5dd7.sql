-- =====================================================
-- PARTE 1: TRIGGER DE AUTO-CRIAÇÃO DE PROFILES/ROLES
-- =====================================================

-- Função que será chamada ao criar um novo usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir perfil automaticamente
  INSERT INTO public.profiles (id, email, name, is_first_login, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    true,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  -- Inserir role padrão (student) automaticamente
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger vinculado à tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PARTE 2: BACKFILL - Inserir perfis e roles para usuários existentes
-- =====================================================

-- Inserir perfis para usuários que existem no auth mas não em profiles
INSERT INTO public.profiles (id, email, name, is_first_login, points)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  true,
  0
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Inserir roles para usuários que existem no auth mas não em user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'student'::app_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.user_id IS NULL;

-- =====================================================
-- PARTE 3: FUNÇÃO RPC PARA DELEÇÃO COMPLETA (AUTH + DB)
-- =====================================================

-- Função RPC com SECURITY DEFINER para permitir admin deletar usuários
CREATE OR REPLACE FUNCTION public.delete_user_entirely(user_id_to_delete UUID)
RETURNS BOOLEAN AS $$
DECLARE
  calling_user_role app_role;
BEGIN
  -- Verificar se o usuário que está chamando é admin
  SELECT role INTO calling_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  IF calling_user_role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários';
  END IF;

  -- Deletar registros relacionados primeiro (cascade manual)
  DELETE FROM public.favorites WHERE user_id = user_id_to_delete;
  DELETE FROM public.progress WHERE user_id = user_id_to_delete;
  DELETE FROM public.resource_logs WHERE user_id = user_id_to_delete;
  DELETE FROM public.lesson_views WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_sessions WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_points_history WHERE user_id = user_id_to_delete;
  DELETE FROM public.team_hierarchy WHERE supervisor_id = user_id_to_delete OR subordinate_id = user_id_to_delete;
  
  -- Deletar role do usuário
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  
  -- Deletar perfil do usuário
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- Deletar usuário do Auth (requer SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = user_id_to_delete;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PARTE 4: AJUSTE DE RLS - Permissões de DELETE para admin
-- =====================================================

-- Adicionar política de DELETE para profiles (admin only)
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar política de DELETE para user_roles (admin only)
DROP POLICY IF EXISTS "Admin can delete user roles" ON public.user_roles;
CREATE POLICY "Admin can delete user roles"
  ON public.user_roles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Garantir que admin tem SELECT total em user_roles
DROP POLICY IF EXISTS "Admin can view all user roles" ON public.user_roles;
CREATE POLICY "Admin can view all user roles"
  ON public.user_roles
  FOR SELECT
  USING (is_admin_or_coordinator(auth.uid()));

-- Garantir que admin tem UPDATE total em user_roles
DROP POLICY IF EXISTS "Admin can update user roles" ON public.user_roles;
CREATE POLICY "Admin can update user roles"
  ON public.user_roles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- PARTE 5: Adicionar UNIQUE constraint em user_roles.user_id se não existir
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;