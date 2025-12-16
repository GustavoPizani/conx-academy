import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard, ContentItem } from '@/components/shared/ContentCard';

interface CourseCarouselProps {
  title: string;
  courses: ContentItem[];
}

export const CourseCarousel: React.FC<CourseCarouselProps> = ({
  title,
  courses,
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
            className="flex-shrink-0 w-[280px] md:w-[300px]"
          >
            <ContentCard item={course} />
          </div>
        ))}
      </div>
    </div>
  );
};
