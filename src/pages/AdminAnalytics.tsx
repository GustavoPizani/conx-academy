import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, BookOpen, Loader2, Clock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Interfaces para os dados
interface UserSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface LessonView {
  id: string;
  viewed_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
  lessons: {
    title: string;
  } | null;
}

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [lessonViews, setLessonViews] = useState<LessonView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/home');
      return;
    }

    if (user?.role === 'admin') {
      fetchAnalytics();
    }
  }, [user?.role, navigate]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    const [sessionsRes, lessonViewsRes] = await Promise.all([
      supabase
        .from('user_sessions')
        .select('id, started_at, ended_at, profiles(name, email)')
        .order('started_at', { ascending: false })
        .limit(20),
      supabase
        .from('lesson_views')
        .select('id, viewed_at, profiles(name, email), lessons(title)')
        .order('viewed_at', { ascending: false })
        .limit(20)
    ]);

    if (sessionsRes.error) {
      console.error('Error fetching user sessions:', sessionsRes.error);
    } else {
      setSessions(sessionsRes.data as UserSession[]);
    }

    if (lessonViewsRes.error) {
      console.error('Error fetching lesson views:', lessonViewsRes.error);
    } else {
      setLessonViews(lessonViewsRes.data as LessonView[]);
    }

    setIsLoading(false);
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Em andamento';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Análises da Plataforma</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Acompanhe as sessões de usuários e visualizações de aulas em tempo real.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Sessions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  <CardTitle className="text-lg">Últimas Sessões de Usuários</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.length > 0 ? sessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {session.profiles?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{session.profiles?.name || 'Usuário desconhecido'}</p>
                        <p className="text-sm text-muted-foreground truncate">{new Date(session.started_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(session.started_at, session.ended_at)}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">Nenhuma sessão de usuário encontrada.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lesson Views */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <CardTitle className="text-lg">Últimas Aulas Visualizadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lessonViews.length > 0 ? lessonViews.map((view) => (
                    <div key={view.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {view.profiles?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{view.profiles?.name || 'Usuário desconhecido'}</p>
                        <p className="text-sm text-muted-foreground truncate" title={view.lessons?.title}>
                          Viu: <span className="font-medium text-foreground/90">{view.lessons?.title || 'Aula desconhecida'}</span>
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          <span>{new Date(view.viewed_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">Nenhuma visualização de aula encontrada.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;