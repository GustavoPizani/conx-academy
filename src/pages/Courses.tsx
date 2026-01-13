import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, BookOpen, Plus, Loader2, MoreVertical, Heart, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import AddCourseModal from '@/components/admin/AddCourseModal';
import { useFavorites } from '@/hooks/useFavorites';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Lesson {
  id: string;
  title: string;
  video_url: string;
  duration: number;
  position: number;
  course_id: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  published: boolean;
  target_roles: string[];
  lesson_count: number;
  total_duration: number;
  progress: number;
  lessons?: Lesson[];
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      if (!user) return;
      
      // 1. Busca os cursos e lições
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lessons(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }

      // 2. Busca o progresso do usuário
      const { data: progressData } = await supabase
        .from('progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('is_completed', true);
      
      const completedLessonIds = new Set(progressData?.map((p: any) => p.lesson_id) || []);

      // 3. Processa os dados (CORREÇÃO AQUI)
      const coursesWithProgress: Course[] = (data || []).map((course: any) => {
        const lessons = course.lessons || [];
        const totalLessons = lessons.length;

        // Cálculo de duração: Prioriza o campo do banco, senão soma as aulas
        const dbDuration = course.duration || course.total_duration;
        const totalDuration = dbDuration || lessons.reduce((acc: number, l: any) => acc + (l.duration || 0), 0);

        // Contagem de aulas concluídas
        const completedLessonsCount = lessons.filter((l: any) => completedLessonIds.has(l.id)).length;
        
        // Cálculo da porcentagem (Aqui estava o erro: completedLessons vs completedLessonsCount)
        const progress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
        
        return {
          ...course,
          lesson_count: totalLessons,
          total_duration: totalDuration || 0, // Garante que não é NaN
          progress,
        };
      });

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error(error);
      toast({
          title: "Erro",
          description: "Falha ao carregar cursos",
          variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCourses();
  }, [user]);

  const formatDuration = (minutes: number) => {
    const safeMinutes = minutes || 0; // Proteção contra NaN
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    const { error } = await supabase.from('courses').delete().eq('id', courseToDelete);

    if (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o curso. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete));
      toast({
        title: 'Curso excluído',
        description: 'O curso foi removido com sucesso.',
      });
    }
    setCourseToDelete(null);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowAddModal(true);
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/player/${courseId}`);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Cursos</h1>
            <p className="text-muted-foreground">Explore todos os cursos disponíveis para você.</p>
          </div>
          
          {isAdmin() && (
            <Button variant="netflix" onClick={() => {
              setEditingCourse(null);
              setShowAddModal(true);
            }}>
              <Plus className="w-4 h-4" />
              Adicionar Curso
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum curso disponível</h3>
            <p className="text-muted-foreground">
              {isAdmin() ? 'Clique em "Adicionar Curso" para criar o primeiro curso.' : 'Novos cursos serão adicionados em breve.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isCompleted = course.progress === 100;
              return (
                <Card
                  key={course.id}
                  onClick={() => handleCourseClick(course.id)}
                  className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={course.cover_image || defaultImage}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    
                    {/* Overlay Escuro para Concluídos ou Hover */}
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                      isCompleted 
                        ? 'bg-black/60 opacity-100' 
                        : 'bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100'
                    }`} />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                    
                    {/* Botão de Favorito */}
                    <div className="absolute top-2 right-12 z-20">
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite('course', course.id);
                        }}
                      >
                        <Heart 
                          className={`w-4 h-4 transition-all duration-200 ${isFavorite('course', course.id) ? 'text-red-500 fill-current' : 'text-white'}`} 
                        />
                      </Button>
                    </div>

                    {/* Botão de Ações - Apenas Admin */}
                    {isAdmin() && (
                      <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCourse(course); }}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={(e) => { e.stopPropagation(); setCourseToDelete(course.id); }}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {/* Badge de Concluído */}
                    {isCompleted && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-600/90 text-white text-xs font-bold rounded-full flex items-center gap-1 z-10">
                        <CheckCircle className="w-3 h-3" />
                        CONCLUÍDO
                      </div>
                    )}

                    {/* Badge de Rascunho */}
                    {!course.published && (
                      <span className="absolute top-3 left-3 px-2 py-1 bg-yellow-500/80 text-yellow-950 text-xs font-medium rounded">
                        Rascunho
                      </span>
                    )}

                    {/* Barra de Progresso (se não concluído) */}
                    {course.progress > 0 && !isCompleted && (
                      <div className="absolute bottom-0 left-0 right-0">
                        <Progress value={course.progress} className="h-1 rounded-none" />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className={`font-semibold text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors ${isCompleted ? 'text-muted-foreground' : ''}`}>
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(course.total_duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.lesson_count || 0} aulas
                      </span>
                    </div>
                    
                    {isCompleted && (
                      <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                         Curso finalizado
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddCourseModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCourse(null);
        }}
        onSuccess={fetchCourses}
        initialData={editingCourse}
      />

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o curso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteCourse}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Courses;