import React from 'react';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { CourseCarousel } from '@/components/dashboard/CourseCarousel';
import { useAuth } from '@/contexts/AuthContext';

// Mock data
const featuredCourse = {
  id: '1',
  title: 'Técnicas Avançadas de Vendas B2B',
  description: 'Domine as estratégias mais eficazes para fechar negócios complexos no mercado corporativo. Aprenda com especialistas que já geraram milhões em vendas.',
  thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920&q=80',
  category: 'Vendas',
};

const continueCourses = [
  {
    id: '1',
    title: 'Fundamentos de Negociação',
    thumbnail: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
    duration: '4h 30min',
    lessons: 12,
    progress: 65,
  },
  {
    id: '2',
    title: 'Comunicação Assertiva',
    thumbnail: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=600&q=80',
    duration: '3h 15min',
    lessons: 8,
    progress: 40,
  },
  {
    id: '3',
    title: 'Gestão de Tempo',
    thumbnail: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&q=80',
    duration: '2h 45min',
    lessons: 10,
    progress: 20,
  },
];

const newCourses = [
  {
    id: '4',
    title: 'Liderança em Tempos de Crise',
    thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80',
    duration: '5h 00min',
    lessons: 15,
    rating: 4.9,
    isNew: true,
  },
  {
    id: '5',
    title: 'Marketing Digital para Vendedores',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    duration: '6h 20min',
    lessons: 20,
    rating: 4.8,
    isNew: true,
  },
  {
    id: '6',
    title: 'Inteligência Emocional no Trabalho',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
    duration: '4h 00min',
    lessons: 12,
    rating: 4.7,
    isNew: true,
  },
  {
    id: '7',
    title: 'Excel Avançado para Negócios',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    duration: '8h 30min',
    lessons: 25,
    rating: 4.9,
    isNew: true,
  },
  {
    id: '8',
    title: 'Apresentações de Impacto',
    thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80',
    duration: '3h 45min',
    lessons: 10,
    rating: 4.6,
    isNew: true,
  },
];

const recommendedCourses = [
  {
    id: '9',
    title: 'Atendimento ao Cliente de Excelência',
    thumbnail: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=600&q=80',
    duration: '4h 15min',
    lessons: 14,
    rating: 4.8,
  },
  {
    id: '10',
    title: 'Técnicas de Persuasão',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
    duration: '3h 30min',
    lessons: 9,
    rating: 4.7,
  },
  {
    id: '11',
    title: 'Gestão de Equipes Remotas',
    thumbnail: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80',
    duration: '5h 00min',
    lessons: 16,
    rating: 4.9,
  },
  {
    id: '12',
    title: 'Finanças Pessoais',
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80',
    duration: '4h 45min',
    lessons: 12,
    rating: 4.6,
  },
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroBanner course={featuredCourse} />

      {/* Course Carousels */}
      <div className="relative z-10 -mt-32 space-y-8 pb-8">
        {/* Continue Watching */}
        {continueCourses.length > 0 && (
          <CourseCarousel
            title={`Continuar Assistindo, ${user?.name.split(' ')[0]}`}
            courses={continueCourses}
            showProgress
          />
        )}

        {/* New Courses */}
        <CourseCarousel title="Novos Cursos" courses={newCourses} />

        {/* Recommended */}
        <CourseCarousel title="Recomendados para Você" courses={recommendedCourses} />

        {/* Popular in Sales */}
        <CourseCarousel title="Populares em Vendas" courses={[...newCourses].reverse()} />
      </div>
    </div>
  );
};

export default Dashboard;
