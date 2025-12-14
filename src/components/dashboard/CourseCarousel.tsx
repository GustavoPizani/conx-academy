import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  lessons: number;
  progress?: number;
  rating?: number;
  isNew?: boolean;
}

interface CourseCarouselProps {
  title: string;
  courses: Course[];
  showProgress?: boolean;
}

export const CourseCarousel: React.FC<CourseCarouselProps> = ({
  title,
  courses,
  showProgress = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group">
      <h2 className="text-xl font-semibold text-foreground mb-4 px-4 md:px-8">{title}</h2>
      
      {/* Navigation Arrows */}
      <Button
        variant="icon"
        size="icon"
        className="absolute left-0 top-1/2 translate-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background hidden md:flex"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      
      <Button
        variant="icon"
        size="icon"
        className="absolute right-0 top-1/2 translate-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background hidden md:flex"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-4"
      >
        {courses.map((course) => (
          <div
            key={course.id}
            className="card-netflix flex-shrink-0 w-[280px] md:w-[300px] group/card"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
              
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/50">
                  <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>

              {/* New Badge */}
              {course.isNew && (
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">
                    NOVO
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              {showProgress && course.progress !== undefined && (
                <div className="absolute bottom-0 left-0 right-0">
                  <Progress value={course.progress} className="h-1 rounded-none bg-muted" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover/card:text-primary transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </span>
                <span>{course.lessons} aulas</span>
                {course.rating && (
                  <span className="flex items-center gap-1 text-primary">
                    <Star className="w-4 h-4" fill="currentColor" />
                    {course.rating}
                  </span>
                )}
              </div>

              {showProgress && course.progress !== undefined && (
                <p className="text-xs text-muted-foreground mt-2">
                  {course.progress}% concluído
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
