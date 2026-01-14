import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, Download, Search, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Interfaces para os dados
interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_name?: string;
  user_email?: string;
}

interface LessonView {
  id: string;
  user_id: string;
  started_at: string;
  watch_time_seconds: number | null;
  completed: boolean | null;
  user_name?: string;
  user_email?: string;
  lesson_title?: string;
}

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [lessonViews, setLessonViews] = useState<LessonView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState('sessions');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, lessonViewsRes, profilesRes, lessonsRes] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('id, user_id, started_at, ended_at, duration_seconds')
          .order('started_at', { ascending: false }),
        supabase
          .from('lesson_views')
          .select('id, user_id, lesson_id, started_at, watch_time_seconds, completed')
          .order('started_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, name, email'),
        supabase
          .from('lessons')
          .select('id, title')
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (lessonViewsRes.error) throw lessonViewsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      const lessonsMap = new Map(lessonsRes.data?.map(l => [l.id, l.title]) || []);
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, { name: p.name, email: p.email }]) || []);

      const enrichedSessions: UserSession[] = (sessionsRes.data || []).map(s => ({
        ...s,
        user_name: profilesMap.get(s.user_id)?.name,
        user_email: profilesMap.get(s.user_id)?.email,
      }));
      setSessions(enrichedSessions);

      const enrichedViews: LessonView[] = (lessonViewsRes.data || []).map(v => ({
        ...v,
        user_name: profilesMap.get(v.user_id)?.name,
        user_email: profilesMap.get(v.user_id)?.email,
        lesson_title: lessonsMap.get(v.lesson_id),
      }));
      setLessonViews(enrichedViews);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Erro ao buscar dados',
        description: 'Não foi possível carregar os dados de análise. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/home');
      return;
    }
    if (user?.role === 'admin') {
      fetchAnalytics();
    }
  }, [user?.role, navigate, fetchAnalytics]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.started_at);
      const matchesSearch = searchTerm.trim() === '' ||
        session.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.user_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !date?.from || (sessionDate >= date.from && sessionDate <= (date.to || date.from));

      return matchesSearch && matchesDate;
    });
  }, [sessions, searchTerm, date]);

  const filteredLessonViews = useMemo(() => {
    return lessonViews.filter(view => {
      const viewDate = new Date(view.started_at);
      const matchesSearch = searchTerm.trim() === '' ||
        view.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        view.user_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !date?.from || (viewDate >= date.from && viewDate <= (date.to || date.from));

      return matchesSearch && matchesDate;
    });
  }, [lessonViews, searchTerm, date]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Em andamento';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const exportToCSV = useCallback((type: 'sessions' | 'views') => {
    const dataToExport = type === 'sessions' ? filteredSessions : filteredLessonViews;
    if (dataToExport.length === 0) {
      toast({ title: 'Nenhum dado para exportar', description: 'Aplique filtros diferentes ou aguarde novos dados.', variant: 'default' });
      return;
    }

    const headers = type === 'sessions'
      ? ['Nome', 'Email', 'Início da Sessão', 'Fim da Sessão', 'Duração (s)']
      : ['Nome', 'Email', 'Aula', 'Data Visualização', 'Tempo Assistido (s)', 'Concluído'];

    const rows = dataToExport.map(item => {
      if (type === 'sessions') {
        const s = item as UserSession;
        return [
          `"${s.user_name || ''}"`,
          `"${s.user_email || ''}"`,
          `"${new Date(s.started_at).toLocaleString('pt-BR')}"`,
          `"${s.ended_at ? new Date(s.ended_at).toLocaleString('pt-BR') : 'Em andamento'}"`,
          s.duration_seconds || 0
        ].join(',');
      } else {
        const v = item as LessonView;
        return [
          `"${v.user_name || ''}"`,
          `"${v.user_email || ''}"`,
          `"${v.lesson_title || 'Aula desconhecida'}"`,
          `"${new Date(v.started_at).toLocaleString('pt-BR')}"`,
          v.watch_time_seconds || 0,
          v.completed ? 'Sim' : 'Não'
        ].join(',');
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredSessions, filteredLessonViews, toast]);

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

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface border-border"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd/MM/yy", { locale: ptBR })} -{' '}
                      {format(date.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, "dd/MM/yy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sessions">Sessões de Usuários</TabsTrigger>
              <TabsTrigger value="views">Aulas Visualizadas</TabsTrigger>
            </TabsList>
            <TabsContent value="sessions">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Sessões de Usuários</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredSessions.length} sessões encontradas.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('sessions')}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="hidden md:table-cell">Início</TableHead>
                        <TableHead className="hidden md:table-cell">Fim</TableHead>
                        <TableHead className="text-right">Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.length > 0 ? filteredSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-border">
                                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                  {session.user_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{session.user_name || 'Usuário desconhecido'}</p>
                                <p className="text-xs text-muted-foreground truncate">{session.user_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{new Date(session.started_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{session.ended_at ? new Date(session.ended_at).toLocaleString('pt-BR') : '-'}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatDuration(session.started_at, session.ended_at)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Nenhuma sessão encontrada para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="views">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Aulas Visualizadas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredLessonViews.length} visualizações encontradas.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV('views')}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Aula</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLessonViews.length > 0 ? filteredLessonViews.map((view) => (
                        <TableRow key={view.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-border">
                                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                  {view.user_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{view.user_name || 'Usuário desconhecido'}</p>
                                <p className="text-xs text-muted-foreground truncate">{view.user_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-foreground truncate" title={view.lesson_title}>
                              {view.lesson_title || 'Aula desconhecida'}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{new Date(view.started_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">
                            {view.completed ? (
                              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/40 dark:text-green-400">Concluído</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full dark:bg-yellow-900/40 dark:text-yellow-400">Em progresso</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Nenhuma aula encontrada para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;