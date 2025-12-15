import React, { useState, useEffect } from 'react';
import { Play, Clock, BookOpen, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import AddCourseModal from '@/components/admin/AddCourseModal';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  published: boolean;
  lesson_count: number;
  total_duration: number;
  progress: number;
}

const Courses: React.FC = () => {
  const { isAdmin } = useUserRole();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCourses = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons(id, duration)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      setIsLoading(false);
      return;
    }

    const coursesWithStats: Course[] = (data || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      cover_image: course.cover_image,
      published: course.published,
      lesson_count: course.lessons?.length || 0,
      total_duration: course.lessons?.reduce((sum: number, l: any) => sum + (l.duration || 0), 0) || 0,
      progress: 0, // TODO: Calculate based on user progress
    }));

    setCourses(coursesWithStats);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
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
            <Button variant="netflix" onClick={() => setShowAddModal(true)}>
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
            {courses.map((course) => (
              <Card
                key={course.id}
                className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={course.cover_image || defaultImage}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                  {course.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0">
                      <Progress value={course.progress} className="h-1 rounded-none" />
                    </div>
                  )}
                  {!course.published && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-yellow-500/80 text-yellow-950 text-xs font-medium rounded">
                      Rascunho
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(course.total_duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lesson_count} aulas
                    </span>
                  </div>
                  {course.progress > 0 && (
                    <p className="text-xs text-primary mt-2 font-medium">
                      {course.progress === 100 ? 'Concluído ✓' : `${course.progress}% concluído`}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddCourseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchCourses}
      />
    </div>
  );
};

export default Courses;
