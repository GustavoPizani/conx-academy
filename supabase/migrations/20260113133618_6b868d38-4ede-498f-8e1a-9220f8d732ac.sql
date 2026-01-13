-- 1. Tabela para favoritos (cursos e recursos)
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT favorites_course_or_resource CHECK (
    (course_id IS NOT NULL AND resource_id IS NULL) OR 
    (course_id IS NULL AND resource_id IS NOT NULL)
  )
);

-- Index para consultas por usuário
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE UNIQUE INDEX idx_favorites_user_course ON public.favorites(user_id, course_id) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX idx_favorites_user_resource ON public.favorites(user_id, resource_id) WHERE resource_id IS NOT NULL;

-- RLS para favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Tabela de configuração de ranking (singleton)
CREATE TABLE public.ranking_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_completion_points INTEGER NOT NULL DEFAULT 100,
  rewatch_course_points INTEGER NOT NULL DEFAULT 10,
  podcast_access_points INTEGER NOT NULL DEFAULT 5,
  book_access_points INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.ranking_config (course_completion_points, rewatch_course_points, podcast_access_points, book_access_points)
VALUES (100, 10, 5, 5);

-- RLS para ranking_config (apenas admins podem modificar, todos podem ler)
ALTER TABLE public.ranking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view ranking config"
  ON public.ranking_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update ranking config"
  ON public.ranking_config FOR UPDATE
  USING (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Only admins can insert ranking config"
  ON public.ranking_config FOR INSERT
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- 3. Tabela de histórico de pontos do usuário
CREATE TABLE public.user_points_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- 'lesson', 'resource', 'bonus', etc.
  reference_id UUID, -- ID da aula, recurso, etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_points_history_user_id ON public.user_points_history(user_id);
CREATE INDEX idx_user_points_history_created_at ON public.user_points_history(created_at);
CREATE INDEX idx_user_points_history_source ON public.user_points_history(user_id, source_type, reference_id);

-- RLS para user_points_history
ALTER TABLE public.user_points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points history"
  ON public.user_points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
  ON public.user_points_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all points history"
  ON public.user_points_history FOR SELECT
  USING (public.is_admin_or_coordinator(auth.uid()));

-- 4. Tabela de sessões de usuário (LOG de acesso)
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- Calculado ao encerrar sessão
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_info TEXT,
  ip_address TEXT
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at);

-- RLS para user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.is_admin_or_coordinator(auth.uid()));

-- 5. Tabela de visualização de aulas (detalhado para métricas)
CREATE TABLE public.lesson_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.user_sessions(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  watch_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

CREATE INDEX idx_lesson_views_user_id ON public.lesson_views(user_id);
CREATE INDEX idx_lesson_views_lesson_id ON public.lesson_views(lesson_id);
CREATE INDEX idx_lesson_views_course_id ON public.lesson_views(course_id);
CREATE INDEX idx_lesson_views_started_at ON public.lesson_views(started_at);

-- RLS para lesson_views
ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lesson views"
  ON public.lesson_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson views"
  ON public.lesson_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson views"
  ON public.lesson_views FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lesson views"
  ON public.lesson_views FOR SELECT
  USING (public.is_admin_or_coordinator(auth.uid()));

-- 6. Função RPC para incrementar pontos do usuário
CREATE OR REPLACE FUNCTION public.increment_user_points(user_id_to_update UUID, points_to_add INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + points_to_add,
      updated_at = now()
  WHERE id = user_id_to_update;
END;
$$;

-- 7. Trigger para atualizar updated_at no ranking_config
CREATE TRIGGER update_ranking_config_updated_at
  BEFORE UPDATE ON public.ranking_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();