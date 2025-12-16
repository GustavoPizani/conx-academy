import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Play, Clock, BookOpen, Headphones, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

export interface ContentItem {
  id: string;
  title: string;
  thumbnail: string | null;
  type: 'course' | 'book_pdf' | 'podcast_audio' | 'resource';
  duration?: number;
  lessons?: number;
  url?: string;
  progress?: number;
}

interface ContentCardProps {
  item: ContentItem;
}

const formatDuration = (minutes: number) => {
  const safeMinutes = minutes || 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

export const ContentCard: React.FC<ContentCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isCourse = item.type === 'course';
  const isCompleted = isCourse && item.progress === 100;
  const itemTypeForFavorite = isCourse ? 'course' : 'resource';

  const handleCardClick = () => {
    if (isCourse) {
      navigate(`/player/${item.id}`);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const defaultCourseImage = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80';
  const defaultBookCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80';
  const defaultPodcastCover = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80';

  const getImage = () => {
    if (item.thumbnail) return item.thumbnail;
    if (isCourse) return defaultCourseImage;
    if (item.type === 'book_pdf') return defaultBookCover;
    return defaultPodcastCover;
  };

  const getOverlayIcon = () => {
    if (isCourse) return <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />;
    if (item.type === 'book_pdf') return <BookOpen className="w-6 h-6 text-primary-foreground" />;
    if (item.type === 'podcast_audio') return <Headphones className="w-6 h-6 text-primary-foreground" />;
    return <ExternalLink className="w-6 h-6 text-primary-foreground" />;
  };

  return (
    <Card
      onClick={handleCardClick}
      className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl w-full"
    >
      <div className={cn("relative overflow-hidden", isCourse ? "aspect-video" : "aspect-[3/4]")}>
        <img
          src={getImage()}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
          isCompleted && "bg-black/60" // Darker overlay for completed
        )} />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
            {getOverlayIcon()}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(itemTypeForFavorite, item.id);
          }}
        >
          <Heart className={cn("w-4 h-4 transition-all", isFavorite(itemTypeForFavorite, item.id) ? 'text-red-500 fill-current' : 'text-white')} />
        </Button>

        {isCourse && !isCompleted && item.progress !== undefined && item.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={item.progress} className="h-1 rounded-none" />
          </div>
        )}

        {isCompleted && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-600/90 text-white text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            CONCLUÍDO
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className={cn(
          "font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors",
          isCompleted && "text-muted-foreground"
        )}>
          {item.title}
        </h3>
        {isCourse && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(item.duration || 0)}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{item.lessons || 0} aulas</span>
          </div>
        )}
        {isCourse && !isCompleted && item.progress !== undefined && item.progress > 0 && (
            <p className="text-xs text-primary mt-2 font-medium">
              {item.progress === 100 ? 'Concluído ✓' : `${item.progress}% concluído`}
            </p>
        )}
      </CardContent>
    </Card>
  );
};
