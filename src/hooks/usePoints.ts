import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export function usePoints() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  /**
   * Awards points for the first-time completion of a lesson.
   * This function checks the user_points_history to prevent awarding points multiple times for the same lesson.
   */
  const awardLessonCompletion = useCallback(async (courseId: string, lessonId: string) => {
    if (!user) return;

    // 1. Check if points for this lesson have already been awarded
    const { count, error: checkError } = await supabase
      .from('user_points_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source_type', 'lesson')
      .eq('reference_id', lessonId);

    if (checkError) {
      console.error('Error checking points history:', checkError);
      return; // Do not proceed if we can't verify history
    }

    if ((count ?? 0) > 0) {
      console.log(`Points for lesson ${lessonId} already awarded.`);
      return;
    }

    try {
      // 2. Fetch ranking config
      const { data: config, error: configError } = await supabase
        .from('ranking_config')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (configError || !config) {
        console.warn('Ranking config not found, using defaults.');
      }
      
      const courseCompletionPoints = (config as any)?.course_completion_points ?? 100;

      // 3. Fetch course to get lesson count
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);
        
      if (lessonsError) throw new Error('Course lessons not found.');

      const totalLessons = lessonsData?.length || 1;
      const points = Math.round(courseCompletionPoints / totalLessons);

      if (points <= 0) return;

      // 4. Insert into history and update profile points via RPC
      await supabase.from('user_points_history').insert({ 
        user_id: user.id, 
        points, 
        source_type: 'lesson', 
        reference_id: lessonId 
      });
      
      await supabase.rpc('increment_user_points', { 
        user_id_to_update: user.id, 
        points_to_add: points 
      });

      toast({ title: `+${points} pontos!`, description: 'Aula concluída.' });
      await refreshProfile(); // Refresh user context to show new points
    } catch (error: any) {
      console.error('Error awarding lesson points:', error);
      toast({ title: 'Erro ao registrar pontos', description: 'Não foi possível registrar sua pontuação.', variant: 'destructive' });
    }
  }, [user, toast, refreshProfile]);

  /**
   * Awards points for the first-time access of a resource (book or podcast).
   */
  const awardResourceAccess = useCallback(async (resourceId: string, type: 'book_pdf' | 'podcast_audio') => {
    if (!user) return;

    // 1. Check if points for this resource have already been awarded
    const { count, error: checkError } = await supabase
      .from('user_points_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source_type', 'resource')
      .eq('reference_id', resourceId);

    if (checkError) {
      console.error('Error checking resource points history:', checkError);
      return;
    }

    if ((count ?? 0) > 0) {
      console.log(`Points for resource ${resourceId} already awarded.`);
      return;
    }

    try {
      const { data: config, error: configError } = await supabase
        .from('ranking_config')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      const bookPoints = (config as any)?.book_access_points ?? 5;
      const podcastPoints = (config as any)?.podcast_access_points ?? 5;
      const points = type === 'book_pdf' ? bookPoints : podcastPoints;

      if (points <= 0) return;

      await supabase.from('user_points_history').insert({ 
        user_id: user.id, 
        points, 
        source_type: 'resource', 
        reference_id: resourceId 
      });
      
      await supabase.rpc('increment_user_points', { 
        user_id_to_update: user.id, 
        points_to_add: points 
      });

      toast({ title: `+${points} pontos!`, description: 'Material acessado.' });
      await refreshProfile();
    } catch (error: any) {
      console.error('Error awarding resource points:', error);
      toast({ title: 'Erro ao registrar pontos', description: 'Não foi possível registrar sua pontuação.', variant: 'destructive' });
    }
  }, [user, toast, refreshProfile]);

  return { awardLessonCompletion, awardResourceAccess };
}
