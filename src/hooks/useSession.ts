import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_HEARTBEAT_INTERVAL = 60000; // 1 minute

export function useSession() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user) return;

    try {
      // Get device info
      const deviceInfo = `${navigator.userAgent}`;

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          device_info: deviceInfo,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return;
      }

      sessionIdRef.current = data.id;
      console.log('Session started:', data.id);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, [user]);

  // Update session heartbeat
  const updateHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !user) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionIdRef.current);
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  }, [user]);

  // End the session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('started_at')
        .eq('id', sessionIdRef.current)
        .single();

      if (session) {
        const startedAt = new Date(session.started_at);
        const endedAt = new Date();
        const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

        await supabase
          .from('user_sessions')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
            last_activity_at: endedAt.toISOString(),
          })
          .eq('id', sessionIdRef.current);

        console.log('Session ended:', sessionIdRef.current, 'Duration:', durationSeconds, 'seconds');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }

    sessionIdRef.current = null;
  }, []);

  // Log lesson view
  const logLessonView = useCallback(async (lessonId: string, courseId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('lesson_views')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          session_id: sessionIdRef.current,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error logging lesson view:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error logging lesson view:', error);
      return null;
    }
  }, [user]);

  // Update lesson view with watch time
  const updateLessonView = useCallback(async (viewId: string, watchTimeSeconds: number, completed: boolean) => {
    if (!viewId) return;

    try {
      await supabase
        .from('lesson_views')
        .update({
          watch_time_seconds: watchTimeSeconds,
          completed,
          ended_at: new Date().toISOString(),
        })
        .eq('id', viewId);
    } catch (error) {
      console.error('Error updating lesson view:', error);
    }
  }, []);

  // Setup session on mount
  // useEffect(() => {
  //   if (!user) return;

  //   startSession();

  //   // Setup heartbeat
  //   heartbeatIntervalRef.current = setInterval(updateHeartbeat, SESSION_HEARTBEAT_INTERVAL);

  //   // Handle page unload
  //   const handleBeforeUnload = () => {
  //     endSession();
  //   };

  //   // Handle visibility change (tab switching)
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'hidden') {
  //       updateHeartbeat();
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     if (heartbeatIntervalRef.current) {
  //       clearInterval(heartbeatIntervalRef.current);
  //     }
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     endSession();
  //   };
  // }, [user, startSession, updateHeartbeat, endSession]);

  return {
    sessionId: sessionIdRef.current,
    logLessonView,
    updateLessonView,
  };
}
