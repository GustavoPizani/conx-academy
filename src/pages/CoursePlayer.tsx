import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Play, CheckCircle, Lock, ArrowLeft, Loader2, AlertCircle, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/contexts/AuthContext';

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

const getYouTubeID = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
};

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { awardLessonCompletion } = usePoints();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  
  const playerRef = useRef<any>(null);
  const lessonViewIdRef = useRef<string | null>(null);
  const watchTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLesson = lessons[currentLessonIndex];
  const isLastLesson = currentLessonIndex === lessons.length - 1;
  const videoId = currentLesson ? getYouTubeID(currentLesson.video_url) : '';

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!courseId || !user) return;
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

      const { data: progressData } = await supabase
        .from('progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('is_completed', true);
          
      if (progressData) {
        setCompletedLessonIds(new Set(progressData.map((p: any) => p.lesson_id)));
      }

      setIsLoading(false);
    };

    fetchData();
  }, [courseId, user, navigate, toast]);

  // 2. Auditoria e Heartbeat
  const updateWatchTime = useCallback(async (isFinalUpdate = false) => {
    if (!playerRef.current || !lessonViewIdRef.current) return;

    try {
      const currentTime = Math.floor(playerRef.current.getCurrentTime());
      await supabase
        .from('lesson_views')
        .update({ 
          watch_time_seconds: currentTime,
          completed: isFinalUpdate 
        })
        .eq('id', lessonViewIdRef.current);
    } catch (error) {
      console.error("Erro ao atualizar tempo de tela:", error);
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
      watchTimeIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    watchTimeIntervalRef.current = setInterval(() => updateWatchTime(), 30000); // 30s
  }, [stopHeartbeat, updateWatchTime]);

  const logLessonView = useCallback(async () => {
    if (!user || !currentLesson || lessonViewIdRef.current) return;

    const { data, error } = await supabase
      .from('lesson_views')
      .insert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        course_id: courseId,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (!error && data) {
      lessonViewIdRef.current = data.id;
    }
  }, [user, currentLesson, courseId]);

  // Limpeza
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (lessonViewIdRef.current) updateWatchTime(false);
    };
  }, [stopHeartbeat, updateWatchTime]);

  // 3. Handlers do Player
  const handleLessonChange = (index: number) => {
    stopHeartbeat();
    updateWatchTime(false);
    lessonViewIdRef.current = null;
    setVideoError(false);
    setShowOverlay(false);
    setCurrentLessonIndex(index);
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    logLessonView();
    startHeartbeat();
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) startHeartbeat(); // Playing
    if (event.data === 2) stopHeartbeat();  // Paused
    if (event.data === 0) { // Ended
      stopHeartbeat();
      updateWatchTime(true);
      setShowOverlay(true);
    }
  };

  const handleCompleteManual = async () => {
    if (!currentLesson || !user) return;

    if (awardLessonCompletion) {
        await awardLessonCompletion(courseId!, currentLesson.id);
    }

    const { error } = await supabase.from('progress').upsert({
      user_id: user.id,
      lesson_id: currentLesson.id,
      is_completed: true,
      viewed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });

    if (!error) {
      setCompletedLessonIds(prev => new Set(prev).add(currentLesson.id));
      toast({ title: "Aula Concluída!" });
      if (!isLastLesson) {
        handleLessonChange(currentLessonIndex + 1);
      } else {
        navigate('/courses');
      }
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%', width: '100%',
    playerVars: {
      autoplay: 1, rel: 0, modestbranding: 1, 
      origin: window.location.origin,
    },
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!currentLesson) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Aula não encontrada.</div>;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <header className="h-14 flex items-center px-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="text-zinc-400 hover:text-white mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <h1 className="font-semibold truncate">{course?.title}</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 flex flex-col bg-black relative">
          <div className="w-full aspect-video bg-zinc-900 relative">
            {videoError || !videoId ? (
              <div className="flex flex-col items-center justify-center h-full"><AlertCircle className="w-12 h-12 text-red-500 mb-2" /><p>Erro no vídeo</p></div>
            ) : (
              <>
                <YouTube
                  key={videoId}
                  videoId={videoId}
                  opts={opts}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  className="w-full h-full absolute inset-0"
                />
                
                {/* OVERLAY HACK */}
                {showOverlay && (
                  <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <img src="/Conxlogologin.png" alt="Conx Academy" className="w-48 mb-8 opacity-80" />
                    <div className="flex flex-col gap-4 w-64">
                      {!isLastLesson ? (
                        <Button onClick={() => handleLessonChange(currentLessonIndex + 1)} className="bg-primary text-white">
                          Próxima Aula <FastForward className="ml-2 w-4 h-4" />
                        </Button>
                      ) : (
                        <Button onClick={() => navigate('/courses')} variant="outline">
                          Voltar aos Cursos
                        </Button>
                      )}
                      <Button onClick={handleCompleteManual} variant="ghost" className="text-green-500">
                        Marcar como Concluída <CheckCircle className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-6 max-w-4xl mx-auto w-full">
            <h2 className="text-2xl font-bold mb-2">{currentLessonIndex + 1}. {currentLesson.title}</h2>
            <p className="text-zinc-400">{currentLesson.description || "Sem descrição."}</p>
          </div>
        </main>

        <aside className="w-full lg:w-96 border-l border-zinc-800 bg-zinc-900 flex flex-col h-1/3 lg:h-full">
          <div className="p-4 border-b border-zinc-800"><h3 className="font-bold">Aulas</h3></div>
          <ScrollArea className="flex-1">
            {lessons.map((lesson, idx) => (
              <button key={lesson.id} onClick={() => handleLessonChange(idx)} 
                className={cn("flex items-start gap-3 p-4 w-full text-left border-b border-zinc-800/50 hover:bg-zinc-800/50",
                idx === currentLessonIndex && "bg-zinc-800 border-l-4 border-l-primary")}>
                {completedLessonIds.has(lesson.id) ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-zinc-600" />}
                <span className={cn("text-sm", idx === currentLessonIndex ? "text-white" : "text-zinc-400")}>{idx + 1}. {lesson.title}</span>
              </button>
            ))}
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
};

export default CoursePlayer;