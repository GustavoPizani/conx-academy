import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { Play, CheckCircle, Lock, ArrowLeft, Loader2, AlertCircle, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface Lesson {
  id: string;
  title: string;
  video_url: string;
  duration: number;
  position: number;
  description?: string;
}

interface Course {
  id: string;
  title: string;
}

// Função auxiliar para extrair o ID do YouTube de qualquer link
const getYouTubeID = (url: string) => {
  if (!url) return '';
  // Expressão regular para pegar ID de links normais, encurtados ou embed
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
};

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { awardLessonCompletion } = usePoints();
  const { user } = useAuth();
  
  // States
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [showNextLessonBtn, setShowNextLessonBtn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Player Ref
  const playerRef = useRef<YouTubePlayer | null>(null);
  const lessonViewIdRef = useRef<string | null>(null);
  const watchTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      setIsLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`*, lessons(*)`)
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        toast({ variant: "destructive", title: "Erro", description: "Curso não encontrado." });
        navigate('/courses');
        return;
      }

      const sortedLessons = (courseData.lessons || []).sort((a: any, b: any) => a.position - b.position);
      setCourse(courseData);
      setLessons(sortedLessons);

      if (user) {
        const { data: progressData } = await supabase
          .from('progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('is_completed', true);
          
        if (progressData) {
          setCompletedLessonIds(new Set(progressData.map((p: any) => p.lesson_id)));
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [courseId, navigate, toast, user]);

  const updateWatchTime = useCallback(async (isFinalUpdate = false) => {
    if (!playerRef.current || !lessonViewIdRef.current) return;

    try {
      const currentTime = await playerRef.current.getCurrentTime();
      if (currentTime > 0) {
        await supabase
          .from('lesson_views')
          .update({ watch_time_seconds: Math.floor(currentTime) })
          .eq('id', lessonViewIdRef.current);
        if (isFinalUpdate) {
          console.log(`Final watch time for lesson view ${lessonViewIdRef.current} is ${Math.floor(currentTime)}s`);
        }
      }
    } catch (error) {
      console.error("Error updating watch time:", error);
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
      watchTimeIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Ensure no multiple intervals
    watchTimeIntervalRef.current = setInterval(() => {
      updateWatchTime();
    }, 30000); // 30 seconds heartbeat
  }, [stopHeartbeat, updateWatchTime]);

  const currentLesson = lessons[currentLessonIndex];

  const logLessonView = useCallback(async () => {
    if (!user || !currentLesson || lessonViewIdRef.current) return;

    const { data, error } = await supabase
      .from('lesson_views')
      .insert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error logging lesson view:", error);
    } else if (data) {
      lessonViewIdRef.current = data.id;
    }
  }, [user, currentLesson]);

  // Cleanup on unmount or when lesson changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lessonViewIdRef.current) {
        updateWatchTime(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopHeartbeat();
      if (lessonViewIdRef.current) {
        updateWatchTime(true);
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [stopHeartbeat, updateWatchTime]);

  const updateWatchTime = useCallback(async (isFinalUpdate = false) => {
    if (!playerRef.current || !lessonViewIdRef.current) return;

    try {
      const currentTime = await playerRef.current.getCurrentTime();
      if (currentTime > 0) {
        await supabase
          .from('lesson_views')
          .update({ watch_time_seconds: Math.floor(currentTime) })
          .eq('id', lessonViewIdRef.current);
        if (isFinalUpdate) {
          console.log(`Final watch time for lesson view ${lessonViewIdRef.current} is ${Math.floor(currentTime)}s`);
        }
      }
    } catch (error) {
      console.error("Error updating watch time:", error);
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
      watchTimeIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Ensure no multiple intervals
    watchTimeIntervalRef.current = setInterval(() => {
      updateWatchTime();
    }, 30000); // 30 seconds heartbeat
  }, [stopHeartbeat, updateWatchTime]);

  const currentLesson = lessons[currentLessonIndex];

  const logLessonView = useCallback(async () => {
    if (!user || !currentLesson || lessonViewIdRef.current) return;

    const { data, error } = await supabase
      .from('lesson_views')
      .insert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error logging lesson view:", error);
    } else if (data) {
      lessonViewIdRef.current = data.id;
    }
  }, [user, currentLesson]);

  // Cleanup on unmount or when lesson changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lessonViewIdRef.current) {
        updateWatchTime(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopHeartbeat();
      if (lessonViewIdRef.current) {
        updateWatchTime(true);
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [stopHeartbeat, updateWatchTime]);

  // 2. Handlers
  const isLastLesson = currentLessonIndex === lessons.length - 1;

  // Extrair o ID do vídeo atual
  const videoId = currentLesson ? getYouTubeID(currentLesson.video_url) : '';

  const handleLessonChange = useCallback((index: number) => {
    if (watchTimeIntervalRef.current) {
      stopHeartbeat();
      updateWatchTime(true);
    }
    lessonViewIdRef.current = null;
    setVideoError(false);
    setShowNextLessonBtn(false);
    setCurrentLessonIndex(index);
  }, [stopHeartbeat, updateWatchTime]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
  };

  const cancelRedirect = useCallback(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
      setIsRedirecting(false);
      toast({ title: "Redirecionamento cancelado." });
      document.removeEventListener('click', cancelRedirect);
      document.removeEventListener('keydown', cancelRedirect);
    }
  }, [toast]);

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // PLAYING
    if (event.data === 1) {
      logLessonView();
      startHeartbeat();
    }
    // PAUSED
    if (event.data === 2) {
      stopHeartbeat();
      updateWatchTime();
    }
    // ENDED
    if (event.data === 0) {
      stopHeartbeat();
      updateWatchTime(true);
      setShowNextLessonBtn(true);
    }
  };

  const onPlayerError: YouTubeProps['onError'] = (event) => {
    console.error("Erro no Player YouTube:", event);
    setVideoError(true);
  };

  const handleCompleteAndAdvance = async () => {
    if (!currentLesson || !courseId) return;

    await awardLessonCompletion(courseId, currentLesson.id);
    setCompletedLessonIds(prev => new Set(prev).add(currentLesson.id));
    toast({ title: "Aula Concluída!", className: "bg-green-600 text-white" });
    setShowNextLessonBtn(false);

    if (isLastLesson) {
      setIsRedirecting(true);
      toast({
        title: 'Curso finalizado!',
        description: 'Você será redirecionado em 3 segundos...',
      });
      redirectTimerRef.current = setTimeout(() => {
        navigate(`/course/${courseId}`);
      }, 3000);
      // Listen for user interaction to cancel
      document.addEventListener('click', cancelRedirect, { once: true });
      document.addEventListener('keydown', cancelRedirect, { once: true });
    } else {
      handleLessonChange(currentLessonIndex + 1);
    }
  };

  // Configurações do Player
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      origin: window.location.origin,
    },
  };

  // 3. Render
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (!currentLesson) {
    return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Este curso ainda não tem aulas.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      
      {/* Header */}
      <header className="h-14 flex items-center px-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="text-zinc-400 hover:text-white mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <h1 className="font-semibold truncate">{course?.title}</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* PLAYER AREA */}
        <main className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden bg-black relative">
          
          <div className="w-full aspect-video bg-zinc-900 relative flex items-center justify-center group">
            {videoError || !videoId ? (
              <div className="text-center p-6 bg-zinc-900 w-full h-full flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                <p className="text-white font-bold">Erro ao carregar vídeo</p>
                <p className="text-zinc-400 text-sm mt-2">ID não encontrado ou link inválido.</p>
                <code className="bg-black/50 p-2 rounded mt-2 text-xs text-yellow-500 break-all select-all">
                  {currentLesson.video_url}
                </code>
              </div>
            ) : (
              // COMPONENTE OFICIAL DO YOUTUBE
              <YouTube
                key={videoId} // Força recriar o player quando muda o vídeo (evita bugs)
                videoId={videoId}
                opts={opts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                onError={onPlayerError}
                className="w-full h-full absolute inset-0"
              />
            )}
          </div>

          {/* Controls & Info */}
          <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {currentLessonIndex + 1}. {currentLesson.title}
                </h2>
                <p className="text-zinc-400 text-sm">{currentLesson.description || "Sem descrição."}</p>
              </div>
              
              {showNextLessonBtn && (
                <Button size="lg" onClick={handleCompleteAndAdvance} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                  {isLastLesson ? "Finalizar Curso" : "Próxima Aula"}
                  <SkipForward className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
            {isRedirecting && (
              <div className="text-center text-sm text-zinc-400 p-2 bg-zinc-800/50 rounded-md">
                Curso finalizado! Redirecionando...
                <p className="text-xs">(Clique em qualquer lugar para cancelar)</p>
              </div>
            )}
          </div>
        </main>

        {/* SIDEBAR LIST */}
        <aside className="w-full lg:w-96 border-l border-zinc-800 bg-zinc-900 flex flex-col h-1/3 lg:h-full shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-bold text-lg">Aulas</h3>
            <p className="text-xs text-zinc-500">{completedLessonIds.size} / {lessons.length} concluídas</p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {lessons.map((lesson, idx) => {
                const isActive = idx === currentLessonIndex;
                const isCompleted = completedLessonIds.has(lesson.id);
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonChange(idx)}
                    className={cn(
                      "flex items-start gap-3 p-4 text-left transition-colors border-b border-zinc-800/50 hover:bg-zinc-800/50",
                      isActive && "bg-zinc-800 border-l-4 border-l-primary"
                    )}
                  >
                    <div className="mt-1">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isActive ? "text-white" : "text-zinc-400")}>
                        {idx + 1}. {lesson.title}
                      </p>
                      <span className="text-xs text-zinc-600">{lesson.duration} min</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

      </div>
    </div>
  );
};

export default CoursePlayer;