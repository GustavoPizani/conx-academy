import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, Download, Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Interfaces para os dados
interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_name?: string;
  user_email?: string;
  manager_name?: string;
}

interface LessonView {
  id: string;
  user_id: string;
  lesson_id: string;
  started_at: string;
  watch_time_seconds: number | null;
  completed: boolean | null;
  user_name?: string;
  user_email?: string;
  lesson_title?: string;
  manager_name?: string;
  viewed_at?: string;
}

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [lessonViews, setLessonViews] = useState<LessonView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState('sessions');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, lessonViewsRes, profilesRes, lessonsRes, teamsRes, rolesRes] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('id, user_id, started_at, ended_at, duration_seconds')
          .order('started_at', { ascending: false }),
        supabase
          .from('lesson_views')
          .select('id, user_id, lesson_id, started_at, watch_time_seconds, completed, viewed_at')
          .order('started_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, name, email, team_id'),
        supabase
          .from('lessons')
          .select('id, title'),
        supabase
          .from('teams')
          .select('id, name'),
        supabase
          .from('user_roles')
          .select('user_id, role')
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (lessonViewsRes.error) throw lessonViewsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const lessonsMap = new Map(lessonsRes.data?.map(l => [l.id, l.title]) || []);
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, { name: p.name, email: p.email, team_id: p.team_id }]) || []);
      const rolesMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);

      const managers = (profilesRes.data || [])
        .filter(p => rolesMap.get(p.id) === 'manager')
        .map(p => ({ id: p.id, name: p.name, email: p.email, role: 'manager' }));
      
      const teamToManagerNameMap = new Map();
      teamsRes.data?.forEach(team => {
        if (team.name.startsWith('Time ')) {
          const managerName = team.name.replace('Time ', '');
          teamToManagerNameMap.set(team.id, managerName);
        }
      });

      const enrichedSessions: UserSession[] = (sessionsRes.data || []).map(s => ({
        ...s,
        user_name: profilesMap.get(s.user_id)?.name,
        user_email: profilesMap.get(s.user_id)?.email,
      }));
      setSessions(enrichedSessions);
      
      const allUsersForFilter: UserProfile[] = (profilesRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: rolesMap.get(p.id) || 'student',
      }));
      setAllUsers(allUsersForFilter);

      const enrichedViews: LessonView[] = (lessonViewsRes.data || []).map(v => {
        const profile = profilesMap.get(v.user_id);
        const teamId = profile?.team_id;
        const managerName = teamId ? teamToManagerNameMap.get(teamId) : undefined;
        return { ...v, user_name: profile?.name, user_email: profile?.email, lesson_title: lessonsMap.get(v.lesson_id), manager_name: managerName };
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
      if (selectedUserId && session.user_id !== selectedUserId) return false;
      const sessionDate = new Date(session.started_at);
      const matchesDate = !date?.from || (sessionDate >= date.from && sessionDate <= (date.to || date.from));
      return matchesDate;
    });
  }, [sessions, selectedUserId, date]);

  const filteredLessonViews = useMemo(() => {
    return lessonViews.filter(view => {
      if (selectedUserId && view.user_id !== selectedUserId) return false;
      const viewDate = new Date(view.started_at);
      const matchesDate = !date?.from || (viewDate >= date.from && viewDate <= (date.to || date.from));
      return matchesDate;
    });
  }, [lessonViews, selectedUserId, date]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Em andamento';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  const exportToXLSX = useCallback(() => {
    if (filteredSessions.length === 0 && filteredLessonViews.length === 0) {
      toast({ title: 'Nenhum dado para exportar', description: 'Aplique filtros diferentes ou aguarde novos dados.', variant: 'default' });
      return;
    }

    const wb = XLSX.utils.book_new();

    // Aba de Acessos
    const sessionsData = filteredSessions.map(s => ({
      'Nome': s.user_name ?? '',
      'Email': s.user_email ?? '',
      'Início da Sessão': new Date(s.started_at).toLocaleString('pt-BR'),
      'Fim da Sessão': s.ended_at ? new Date(s.ended_at).toLocaleString('pt-BR') : 'Em andamento',
      'Duração (s)': s.duration_seconds || 0,
    }));
    const wsAcessos = XLSX.utils.json_to_sheet(sessionsData);
    XLSX.utils.book_append_sheet(wb, wsAcessos, 'Acessos');

    // Aba de Aulas
    const viewsData = filteredLessonViews.map(v => ({
      'Nome Aluno': v.user_name ?? '',
      'Email Aluno': v.user_email ?? '',
      'Gerente': v.manager_name ?? 'N/A',
      'Aula': v.lesson_title ?? 'Aula desconhecida',
      'Data Visualização': new Date(v.started_at).toLocaleString('pt-BR'),
      'Tempo Assistido (s)': v.watch_time_seconds || 0,
      'Concluído': v.completed ? 'Sim' : 'Não',
    }));
    const wsAulas = XLSX.utils.json_to_sheet(viewsData);
    XLSX.utils.book_append_sheet(wb, wsAulas, 'Aulas');

    XLSX.writeFile(wb, `ConxAcademy_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Exportação Concluída',
      description: 'O arquivo XLSX foi baixado.',
    });
  }, [filteredSessions, filteredLessonViews, toast]);

  const selectedUserName = useMemo(() => {
    return allUsers.find(u => u.id === selectedUserId)?.name || "Filtrar por usuário...";
  }, [selectedUserId, allUsers]);

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
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full sm:w-[300px] justify-between">
                <span className="truncate">{selectedUserName}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Buscar por nome ou email..." />
                <CommandList>
                  <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="" onSelect={() => { setSelectedUserId(''); setComboboxOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", selectedUserId === '' ? "opacity-100" : "opacity-0")} />
                      Limpar filtro
                    </CommandItem>
                    {allUsers.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.name} ${u.email}`}
                        onSelect={() => {
                          setSelectedUserId(u.id === selectedUserId ? '' : u.id);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                        {u.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
          <>
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={exportToXLSX}>
                <Download className="w-4 h-4 mr-2" />
                Exportar para Excel (XLSX)
              </Button>
            </div>
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
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Aula</TableHead>
                        <TableHead className="hidden lg:table-cell">Gerente</TableHead>
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
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{view.manager_name || 'N/A'}</TableCell>
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
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Nenhuma aula encontrada para os filtros aplicados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs></>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;