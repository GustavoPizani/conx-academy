import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import screenfull from 'screenfull';
import { Play, CheckCircle, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Refs & States
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

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

      // Ordenar aulas
      const sortedLessons = (courseData.lessons || []).sort((a: any, b: any) => a.position - b.position);
      setCourse(courseData);
      setLessons(sortedLessons);

      // Buscar Progresso
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('is_completed', true);
        
      if (progressData) {
        setCompletedLessonIds(new Set(progressData.map(p => p.lesson_id)));
      }

      setIsLoading(false);
    };

    fetchData();
  }, [courseId, navigate, toast]);

  // 2. Handlers
  const currentLesson = lessons[currentLessonIndex];
  const isLastLesson = currentLessonIndex === lessons.length - 1;

  // Garante que a URL não tenha espaços extras que quebram o player
  const cleanVideoUrl = currentLesson?.video_url?.trim() || "";

  const handleLessonChange = (index: number) => {
    setVideoError(false);
    setCanComplete(false);
    setCurrentLessonIndex(index);
  };

  const handleVideoError = (e: any) => {
    console.error("Erro CRÍTICO no Player:", e);
    console.log("Tentando reproduzir URL:", cleanVideoUrl);
    setVideoError(true);
  };

  const handleComplete = async () => {
    if (!currentLesson) return;

    // Award points for completing the lesson
    await awardLessonCompletion(courseId!, currentLesson.id);

    const { error } = await supabase.from('lesson_progress').upsert({
      lesson_id: currentLesson.id,
      is_completed: true,
      viewed_at: new Date().toISOString(),
    });

    if (!error) {
      setCompletedLessonIds(prev => new Set(prev).add(currentLesson.id));
      toast({ title: "Aula Concluída!", className: "bg-green-600 text-white" });
      
      if (!isLastLesson) {
        handleLessonChange(currentLessonIndex + 1);
      }
    }
  };

  const handlePlay = () => {
    // Mobile Fullscreen Logic
    if (isMobile && screenfull.isEnabled && playerWrapperRef.current) {
      try {
        screenfull.request(playerWrapperRef.current);
      } catch (err) {
        console.warn("Fullscreen error:", err);
      }
    }
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
          
          <div 
            ref={playerWrapperRef} 
            className="w-full aspect-video bg-zinc-900 relative flex items-center justify-center group"
          >
            {videoError ? (
              <div className="text-center p-6 bg-zinc-900 w-full h-full flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                <p className="text-white font-bold">Erro ao carregar vídeo</p>
                <p className="text-zinc-400 text-sm mt-2">Verifique se o link está correto:</p>
                <code className="bg-black/50 p-2 rounded mt-2 text-xs text-yellow-500 break-all select-all">
                  {cleanVideoUrl}
                </code>
              </div>
            ) : (
              <ReactPlayer
                url={cleanVideoUrl}
                width="100%"
                height="100%"
                controls={true} // IMPORTANTE: Controles nativos sempre ativados para garantir play
                // REMOVIDO: playing={false} -> Isso causava o bug!
                onPlay={handlePlay}
                onEnded={() => setCanComplete(true)}
                onError={handleVideoError}
                config={{
                  youtube: { 
                    playerVars: { showinfo: 0, rel: 0 } 
                  }
                }}
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
              
              <Button 
                size="lg"
                onClick={handleComplete}
                disabled={!canComplete && !completedLessonIds.has(currentLesson.id)}
                className={cn(
                  "w-full sm:w-auto transition-all",
                  canComplete || completedLessonIds.has(currentLesson.id) 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isLastLesson ? "Concluir Curso" : "Próxima Aula"}
                {completedLessonIds.has(currentLesson.id) ? <CheckCircle className="ml-2 w-4 h-4" /> : <Play className="ml-2 w-4 h-4" />}
              </Button>
            </div>
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
