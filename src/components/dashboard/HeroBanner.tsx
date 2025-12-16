import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroBannerProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    category?: string;
  };
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ course }) => {
  const navigate = useNavigate();

  return (
    <div className="relative h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={course.thumbnail || ''}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end pb-20 md:pb-32 px-4 md:px-8 lg:px-16">
        <div className="max-w-2xl animate-fade-in">
          {/* Category Badge */}
          {course.category && <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-sm font-medium rounded-full mb-4">
            {course.category}
          </span>}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
            {course.title}
          </h1>

          {/* Description */}
          {course.description && <p className="text-lg text-muted-foreground mb-6 line-clamp-3 max-w-xl">
            {course.description}
          </p>}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-6 pt-4">
            <Button 
              variant="netflix" 
              size="xl" 
              className="gap-2"
              onClick={() => navigate(`/player/${course.id}`)}
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Assistir Agora
            </Button>
            <Button 
              variant="netflixOutline" 
              size="xl" 
              className="gap-2"
              onClick={() => navigate('/my-list')}
            >
              <Plus className="w-5 h-5" />
              Minha Lista
            </Button>
            <Button 
              variant="icon" size="icon" className="w-14 h-14"
              onClick={() => navigate(`/player/${course.id}`)}
            >
              <Info className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
