import React from 'react';
import { Play, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const courses = [
  {
    id: '1',
    title: 'Técnicas Avançadas de Vendas B2B',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
    duration: '6h 30min',
    lessons: 18,
    progress: 0,
    category: 'Vendas',
  },
  {
    id: '2',
    title: 'Fundamentos de Negociação',
    thumbnail: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
    duration: '4h 30min',
    lessons: 12,
    progress: 65,
    category: 'Negociação',
  },
  {
    id: '3',
    title: 'Comunicação Assertiva',
    thumbnail: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=600&q=80',
    duration: '3h 15min',
    lessons: 8,
    progress: 40,
    category: 'Soft Skills',
  },
  {
    id: '4',
    title: 'Liderança em Tempos de Crise',
    thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80',
    duration: '5h 00min',
    lessons: 15,
    progress: 100,
    category: 'Liderança',
  },
  {
    id: '5',
    title: 'Marketing Digital para Vendedores',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    duration: '6h 20min',
    lessons: 20,
    progress: 25,
    category: 'Marketing',
  },
  {
    id: '6',
    title: 'Inteligência Emocional no Trabalho',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
    duration: '4h 00min',
    lessons: 12,
    progress: 0,
    category: 'Soft Skills',
  },
];

const Courses: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cursos</h1>
          <p className="text-muted-foreground">Explore todos os cursos disponíveis para você.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={course.thumbnail}
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
                <span className="absolute top-3 left-3 px-2 py-1 bg-surface/80 text-foreground text-xs font-medium rounded">
                  {course.category}
                </span>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {course.lessons} aulas
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
      </div>
    </div>
  );
};

export default Courses;
