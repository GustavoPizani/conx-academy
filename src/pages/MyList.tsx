import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ContentCard, ContentItem } from '@/components/shared/ContentCard';

const MyList: React.FC = () => {
  const { user } = useAuth();
  const [favoriteCourses, setFavoriteCourses] = useState<ContentItem[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<ContentItem[]>([]);
  const [favoritePodcasts, setFavoritePodcasts] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyList = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const { data, error } = await supabase
        .from('favorites')
        .select('*, courses(*, lessons(*)), resources(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        setIsLoading(false);
        return;
      }

      const processedItems: ContentItem[] = [];
      
      for (const fav of (data || [])) {
        if ((fav as any).courses) {
          const course = (fav as any).courses;
          processedItems.push({
            id: course.id,
            title: course.title,
            thumbnail: course.cover_image,
            type: 'course' as const,
            lessons: course.lessons?.length || 0,
            duration: course.lessons?.reduce((sum: number, l: any) => sum + (l.duration || 0), 0) || 0,
          });
        } else if ((fav as any).resources) {
          const resource = (fav as any).resources;
          processedItems.push({
            id: resource.id,
            title: resource.title,
            thumbnail: resource.cover_image,
            type: resource.type as 'book_pdf' | 'podcast_audio',
            url: resource.url,
          });
        }
      }

      setFavoriteCourses(processedItems.filter(item => item.type === 'course'));
      setFavoriteBooks(processedItems.filter(item => item.type === 'book_pdf'));
      setFavoritePodcasts(processedItems.filter(item => item.type === 'podcast_audio'));
      setIsLoading(false);
    };

    fetchMyList();
  }, [user]);

  const hasFavorites = favoriteCourses.length > 0 || favoriteBooks.length > 0 || favoritePodcasts.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Minha Lista</h1>
          <p className="text-muted-foreground">Seus cursos e materiais favoritos em um só lugar.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !hasFavorites ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Sua lista está vazia</h3>
            <p className="text-muted-foreground">Adicione cursos e materiais à sua lista para vê-los aqui.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Cursos Section */}
            {favoriteCourses.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">Cursos Favoritos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteCourses.map(item => (
                    <ContentCard key={`course-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Livros Section */}
            {favoriteBooks.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">Livros Salvos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                  {favoriteBooks.map(item => (
                    <ContentCard key={`book-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Podcasts Section */}
            {favoritePodcasts.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">Podcasts Salvos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                  {favoritePodcasts.map(item => (
                    <ContentCard key={`podcast-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;