import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function usePoints() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Função 1: Dar pontos por completar aula
  const awardLessonCompletion = useCallback(async (courseId: string, lessonId: string) => {
    if (!user) return;

    try {
      // Verifica se já pontuou
      const { count } = await supabase
        .from('user_points_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source_type', 'lesson')
        .eq('reference_id', lessonId);

      if (count && count > 0) return; // Já pontuou

      // Busca pontos na config
      const { data: config } = await supabase
        .from('ranking_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      const coursePoints = (config as any)?.course_completion_points ?? 100;
      const points = Math.round(coursePoints / 10); 

      // Registra histórico
      const { error: historyError } = await supabase.from('user_points_history').insert({
        user_id: user.id,
        points,
        source_type: 'lesson',
        reference_id: lessonId
      });

      if (historyError) throw historyError;

      // Incrementa RPC (Sintaxe Corrigida: sem .catch direto)
      const { error: rpcError } = await supabase.rpc('increment_user_points', { 
        user_id_to_update: user.id, 
        points_to_add: points 
      });

      if (rpcError) console.warn("Aviso: Falha ao atualizar cache de pontos (RPC)", rpcError);

      toast({ title: `+${points} pontos!`, description: 'Aula concluída.' });

    } catch (error) {
      console.error('Erro silencioso (Aula):', error);
    }
  }, [user, toast]);

  // Função 2: Dar pontos por acessar material (Podcast/Livro)
  const awardResourceAccess = useCallback(async (resourceId: string, type: 'book_pdf' | 'podcast_audio') => {
    if (!user) return;

    try {
      // Verifica histórico
      const { count } = await supabase
        .from('user_points_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source_type', 'resource')
        .eq('reference_id', resourceId);

      if (count && count > 0) return;

      // Define pontos fixos
      const points = 5;

      // Registra
      await supabase.from('user_points_history').insert({
        user_id: user.id,
        points,
        source_type: 'resource',
        reference_id: resourceId
      });

      // Incrementa RPC
      await supabase.rpc('increment_user_points', { 
        user_id_to_update: user.id, 
        points_to_add: points 
      }).catch(() => null);

      toast({ title: `+${points} pontos!`, description: 'Material acessado.' });

    } catch (error) {
      console.error('Erro silencioso nos pontos (Recurso):', error);
      // IMPORTANTE: O erro é capturado aqui, permitindo que o Library.tsx continue e abra o link
    }
  }, [user, toast]);

  return { awardLessonCompletion, awardResourceAccess };
}
