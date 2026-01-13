import React, { useState, useEffect } from 'react';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { CourseCarousel } from '@/components/dashboard/CourseCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { ContentItem } from '@/components/shared/ContentCard';

// A type for the featured course in the hero
interface FeaturedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category?: string; // Optional category
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const [featuredCourse, setFeaturedCourse] = useState<FeaturedCourse | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [watchAgain, setWatchAgain] = useState<ContentItem[]>([]);
  const [newCourses, setNewCourses] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // Fetch new courses and set the featured one
      const { data: recentCoursesData, error: recentCoursesError } = await supabase
        .from('courses')
        .select('*, lessons(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentCoursesError) {
        console.error("Error fetching new courses:", recentCoursesError);
      } else if (recentCoursesData) {
        // Set featured course (the newest one)
        const heroCourse = recentCoursesData[0];
        if (heroCourse) {
          setFeaturedCourse({
            id: heroCourse.id,
            title: heroCourse.title,
            description: heroCourse.description,
            thumbnail: heroCourse.cover_image,
            category: 'Lançamento' // Example category
          });
        }

        // Process for carousel
        const processedNewCourses = recentCoursesData.map(course => ({
          id: course.id,
          title: course.title,
          thumbnail: course.cover_image,
          duration: course.lessons?.reduce((sum: number, l: any) => sum + (l.duration || 0), 0),
          lessons: course.lessons?.length || 0,
          type: 'course' as 'course',
        }));
        setNewCourses(processedNewCourses);
      }

      // Fetch Continue Watching - using the progress table
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('lesson_id, viewed_at, is_completed')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false });

      if (progressError) {
        console.error("Error fetching progress:", progressError);
      } else if (progressData && progressData.length > 0) {
        // Get unique lesson IDs to fetch their courses
        const lessonIds = [...new Set(progressData.map((p: any) => p.lesson_id))];
        
        // Fetch lessons with their courses
        const { data: lessonsWithCourses } = await supabase
          .from('lessons')
          .select('id, course_id, courses!inner(*, lessons(*))')
          .in('id', lessonIds);

        // Build course map from lessons
        const courseMap = new Map<string, any>();
        for (const lesson of (lessonsWithCourses || [])) {
          const course = (lesson as any).courses;
          if (course && !courseMap.has(course.id)) {
            courseMap.set(course.id, course);
          }
        }

        const coursesToDisplay = Array.from(courseMap.values());

        // Get completed lesson IDs
        const completedLessonIds = new Set(
          progressData.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id)
        );

        const inProgressCourses: ContentItem[] = [];
        const completedCourses: ContentItem[] = [];

        coursesToDisplay.forEach(course => {
          const totalLessons = course.lessons.length;
          const completedLessonsCount = course.lessons.filter((l: any) => completedLessonIds.has(l.id)).length;
          const progress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

          const courseItem: ContentItem = {
            id: course.id,
            title: course.title,
            thumbnail: course.cover_image,
            duration: course.lessons?.reduce((sum: number, l: any) => sum + (l.duration || 0), 0),
            lessons: totalLessons,
            type: 'course' as 'course',
            progress: progress,
          };

          if (progress === 100) {
            completedCourses.push(courseItem);
          } else if (progress > 0) {
            inProgressCourses.push(courseItem);
          }
        });

        setContinueWatching(inProgressCourses.slice(0, 5));
        setWatchAgain(completedCourses.slice(0, 5));
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {featuredCourse && <HeroBanner course={featuredCourse} />}

      {/* Course Carousels */}
      <div className="relative z-10 -mt-20 space-y-12 pb-12 px-4 md:px-12">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <CourseCarousel
            title={`Continuar Assistindo, ${user?.name.split(' ')[0]}`}
            courses={continueWatching}
          />
        )}

        {/* Watch Again */}
        {watchAgain.length > 0 && (
          <CourseCarousel title="Assista Novamente" courses={watchAgain} />
        )}

        {/* New Courses */}
        {newCourses.length > 0 && (
            <CourseCarousel title="Novos Cursos" courses={newCourses} />
        )}
      </div>
    </div>
  );
};

export default Home;
