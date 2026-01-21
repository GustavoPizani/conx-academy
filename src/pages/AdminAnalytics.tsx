import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, Download, Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Interfaces Manuais (Sem dependência de Join)
interface SessionData {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_name?: string;
  user_email?: string;
}

interface LessonViewData {
  id: string;
  user_id: string;
  lesson_id: string;
  started_at: string;
  watch_time_seconds: number | null;
  completed: boolean | null;
  user_name?: string;
  user_email?: string;
  manager_name?: string;
  lesson_title?: string;
}

interface CourseProgressData {
  userId: string;
  userName: string;
  managerName: string;
  courseName: string;
  completionPercentage: number;
  status: 'CONCLUÍDO' | 'EM PROGRESSO' | 'NÃO INICIADO';
}

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isCoordinator } = useUserRole();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [lessonViews, setLessonViews] = useState<LessonViewData[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgressData[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string, name: string }[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [date, setDate] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState('sessions');

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingData(true);

      // 1. Busca Tabelas SEPARADAMENTE (Evita erro PGRST200)
      const [sessionsRes, viewsRes, profilesRes, lessonsRes, teamsRes, coursesRes] = await Promise.all([
        supabase.from('user_sessions').select('*').order('started_at', { ascending: false }).limit(200),
        supabase.from('lesson_views').select('*').order('started_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('id, name, email, team_id'),
        supabase.from('lessons').select('id, title, course_id'),
        supabase.from('teams').select('id, name'),
        supabase.from('courses').select('id, title')
      ]);

      if (sessionsRes.error) throw sessionsRes.error;

      // 2. Montagem de Dados (Join via JS)
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const lessonsMap = new Map(lessonsRes.data?.map(l => [l.id, l]) || []);
      const teamsMap = new Map(teamsRes.data?.map(t => [t.id, t.name]) || []);
      
      const processedSessions = (sessionsRes.data || []).map(s => {
        const p = profilesMap.get(s.user_id);
        return {
          ...s,
          user_name: p?.name || 'Desconhecido',
          user_email: p?.email || ''
        };
      });

      const processedViews = (viewsRes.data || []).map(v => {
        const p = profilesMap.get(v.user_id);
        const l = lessonsMap.get(v.lesson_id);
        const tName = p?.team_id ? teamsMap.get(p.team_id) : undefined;
        return {
          ...v,
          user_name: p?.name || 'Desconhecido',
          user_email: p?.email || '',
          manager_name: tName ? tName.replace('Time ', '') : 'N/A',
          lesson_title: l?.title || 'Aula removida'
        };
      });

      // 3. Progresso
      const progressList: CourseProgressData[] = [];
      const { data: progress } = await supabase.from('progress').select('user_id, lesson_id').eq('is_completed', true);

      if (progress && profilesRes.data && coursesRes.data && lessonsRes.data) {
         const lessonsPerCourse = new Map<string, number>();
         lessonsRes.data.forEach(l => lessonsPerCourse.set(l.course_id, (lessonsPerCourse.get(l.course_id) || 0) + 1));
         
         const userProgress = new Map<string, Map<string, number>>();
         const lessonToCourse = new Map(lessonsRes.data.map(l => [l.id, l.course_id]));

         progress.forEach(p => {
            const cId = lessonToCourse.get(p.lesson_id);
            if (cId) {
                if (!userProgress.has(p.user_id)) userProgress.set(p.user_id, new Map());
                const uCourses = userProgress.get(p.user_id)!;
                uCourses.set(cId, (uCourses.get(cId) || 0) + 1);
            }
         });

         profilesRes.data.forEach(p => {
            coursesRes.data?.forEach(c => {
                const total = lessonsPerCourse.get(c.id) || 0;
                if (total > 0) {
                    const completed = userProgress.get(p.id)?.get(c.id) || 0;
                    const pct = Math.round((completed / total) * 100);
                    if (completed > 0) {
                        progressList.push({
                            userId: p.id,
                            userName: p.name || 'Sem nome',
                            managerName: p.team_id ? teamsMap.get(p.team_id)?.replace('Time ', '') || 'N/A' : 'N/A',
                            courseName: c.title,
                            completionPercentage: pct,
                            status: pct >= 100 ? 'CONCLUÍDO' : 'EM PROGRESSO'
                        });
                    }
                }
            });
         });
      }

      setSessions(processedSessions);
      setLessonViews(processedViews);
      setCourseProgress(progressList);
      
      const uniqueUsers = Array.from(new Map(processedSessions.map(s => [s.user_id, { id: s.user_id, name: s.user_name || 'Usuário' }])).values());
      setAllUsers(uniqueUsers);

    } catch (error) {
      console.error('Erro Analytics:', error);
      toast({ title: 'Aviso', description: 'Erro ao carregar dados.', variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (!isAdmin() && !isCoordinator())) {
      navigate('/home');
      return;
    }
    fetchAnalytics();
  }, [user, authLoading, isAdmin, isCoordinator, navigate, fetchAnalytics]);

  // Filtros
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (selectedUserId && s.user_id !== selectedUserId) return false;
      const d = new Date(s.started_at);
      return !date?.from || (d >= date.from && d <= (date.to || date.from));
    });
  }, [sessions, selectedUserId, date]);

  const filteredLessonViews = useMemo(() => {
    return lessonViews.filter(v => {
      if (selectedUserId && v.user_id !== selectedUserId) return false;
      const d = new Date(v.started_at);
      return !date?.from || (d >= date.from && d <= (date.to || date.from));
    });
  }, [lessonViews, selectedUserId, date]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Em andamento';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  const exportToXLSX = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const sData = filteredSessions.map(s => ({
      'Nome': s.user_name, 'Email': s.user_email, 'Início': new Date(s.started_at).toLocaleString(), 'Duração': formatDuration(s.started_at, s.ended_at)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sData), 'Sessões');
    XLSX.writeFile(wb, 'Relatorio_Conx.xlsx');
  }, [filteredSessions]);

  const selectedUserName = allUsers.find(u => u.id === selectedUserId)?.name || "Filtrar por usuário...";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Análises da Plataforma</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
           <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-[300px] justify-between">
                {selectedUserName} <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
               <Command>
                 <CommandInput placeholder="Buscar..." />
                 <CommandList>
                    <CommandEmpty>Não encontrado.</CommandEmpty>
                    <CommandGroup>
                        <CommandItem value="todos" onSelect={() => { setSelectedUserId(''); setComboboxOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", !selectedUserId ? "opacity-100" : "opacity-0")} />Todos
                        </CommandItem>
                        {allUsers.map(u => (
                            <CommandItem key={u.id} value={u.name} onSelect={() => { setSelectedUserId(u.id); setComboboxOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />{u.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                 </CommandList>
               </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (date.to ? `${format(date.from, "dd/MM/yy")} - ${format(date.to, "dd/MM/yy")}` : format(date.from, "dd/MM/yy")) : "Selecione período"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} locale={ptBR} />
            </PopoverContent>
          </Popover>

          <Button variant="outline" className="ml-auto" onClick={exportToXLSX}>
            <Download className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>
        </div>

        {isLoadingData ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sessions">Sessões</TabsTrigger>
                    <TabsTrigger value="views">Aulas</TabsTrigger>
                </TabsList>

                <TabsContent value="sessions">
                    <Card><CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="text-right">Duração</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredSessions.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                          <div className="font-medium">{s.user_name}</div>
                                          <div className="text-xs text-muted-foreground">{s.user_email}</div>
                                        </TableCell>
                                        <TableCell>{new Date(s.started_at).toLocaleString()}</TableCell>
                                        <TableCell>{s.ended_at ? new Date(s.ended_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right">{formatDuration(s.started_at, s.ended_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>

                <TabsContent value="views">
                    <Card><CardContent className="p-0">
                         <Table>
                            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Aula</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredLessonViews.map(v => (
                                    <TableRow key={v.id}>
                                        <TableCell>
                                          <div className="font-medium">{v.user_name}</div>
                                          <div className="text-xs text-muted-foreground">{v.manager_name}</div>
                                        </TableCell>
                                        <TableCell>{v.lesson_title}</TableCell>
                                        <TableCell>{new Date(v.started_at).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                          {v.completed ? <span className="text-green-600 font-bold flex items-center justify-end gap-1"><Check className="w-3 h-3"/> Concluído</span> : <span className="text-yellow-600">Vendo</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;