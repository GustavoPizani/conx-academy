import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

type FavoriteType = 'course' | 'resource';

export function useFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('course_id, resource_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
      } else {
        const favoriteSet = new Set<string>();
        (data || []).forEach((fav: any) => {
          if (fav.course_id) favoriteSet.add(`course-${fav.course_id}`);
          if (fav.resource_id) favoriteSet.add(`resource-${fav.resource_id}`);
        });
        setFavorites(favoriteSet);
      }
      setIsLoading(false);
    };

    fetchFavorites();
  }, [user]);

  const isFavorite = useCallback((type: FavoriteType, id: string) => {
    return favorites.has(`${type}-${id}`);
  }, [favorites]);

  const toggleFavorite = useCallback(async (type: FavoriteType, id: string) => {
    if (!user) {
      toast({ title: 'Ação requer login', variant: 'destructive' });
      return;
    }

    const key = `${type}-${id}`;
    const currentlyFavorite = favorites.has(key);
    const newFavorites = new Set(favorites);

    if (currentlyFavorite) {
      newFavorites.delete(key);
      setFavorites(newFavorites);

      const deleteQuery = supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id);
      
      if (type === 'course') {
        await deleteQuery.eq('course_id', id);
      } else {
        await deleteQuery.eq('resource_id', id);
      }
    } else {
      newFavorites.add(key);
      setFavorites(newFavorites);

      if (type === 'course') {
        await supabase.from('favorites').insert({
          user_id: user.id,
          course_id: id,
        });
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          resource_id: id,
        });
      }
    }
  }, [favorites, user, toast]);

  return { isFavorite, toggleFavorite, isLoadingFavorites: isLoading };
}
