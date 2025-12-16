import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, TrendingUp, Users, Crown, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/auth';

interface RankingUser {
  id: string;
  name: string;
  teamName: string;
  points: number;
  role: UserRole;
  trend: 'up' | 'down' | 'same';
}

const RankingCard: React.FC<{ user: RankingUser; position: number }> = ({ user, position }) => {
  const getMedalColor = (pos: number) => {
    switch (pos) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getMedalIcon = (pos: number) => {
    switch (pos) {
      case 1: return <Crown className={cn('w-6 h-6', getMedalColor(pos))} />;
      case 2: return <Medal className={cn('w-6 h-6', getMedalColor(pos))} />;
      case 3: return <Award className={cn('w-6 h-6', getMedalColor(pos))} />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{pos}</span>;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg transition-all duration-200 hover:bg-surface-hover',
        position <= 3 && 'bg-surface'
      )}
    >
      <div className="w-10 flex items-center justify-center">
        {getMedalIcon(position)}
      </div>

      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {user.name ? user.name.substring(0, 2).toUpperCase() : 'UR'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">
          {user.name}{' '}
          <span className="text-muted-foreground font-normal">({user.teamName})</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-primary">{user.points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">pts</p>
      </div>
    </div>
  );
};

const TopThree: React.FC<{ users: RankingUser[] }> = ({ users }) => {
  const [first, second, third] = users;
  
  return (
    <div className="flex items-end justify-center gap-4 mb-8 pt-8">
      {/* 2º Lugar */}
      {second && (
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Avatar className="h-16 w-16 border-4 border-gray-300 mb-2">
            <AvatarFallback className="bg-surface text-foreground text-lg font-bold">
              {second.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Medal className="w-8 h-8 text-gray-300 mb-1" />
          <p className="text-sm font-semibold text-foreground text-center max-w-[100px] truncate">{second.name}</p>
          <p className="text-xs text-muted-foreground">{second.points.toLocaleString()} pts</p>
          <div className="w-24 h-20 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg mt-2" />
        </div>
      )}

      {/* 1º Lugar */}
      {first && (
        <div className="flex flex-col items-center animate-slide-up">
          <Avatar className="h-20 w-20 border-4 border-yellow-400 mb-2 ring-4 ring-yellow-400/30">
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {first.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Crown className="w-10 h-10 text-yellow-400 mb-1" />
          <p className="text-base font-bold text-foreground text-center max-w-[120px] truncate">{first.name}</p>
          <p className="text-sm text-primary font-semibold">{first.points.toLocaleString()} pts</p>
          <div className="w-28 h-28 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg mt-2" />
        </div>
      )}

      {/* 3º Lugar */}
      {third && (
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Avatar className="h-14 w-14 border-4 border-amber-600 mb-2">
            <AvatarFallback className="bg-surface text-foreground font-bold">
              {third.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Award className="w-7 h-7 text-amber-600 mb-1" />
          <p className="text-sm font-semibold text-foreground text-center max-w-[90px] truncate">{third.name}</p>
          <p className="text-xs text-muted-foreground">{third.points.toLocaleString()} pts</p>
          <div className="w-20 h-14 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2" />
        </div>
      )}
    </div>
  );
};

const Rankings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado real dos dados
  const [rankings, setRankings] = useState<Record<string, RankingUser[]>>({
    students: [],
    managers: [],
    superintendents: [],
  });
  
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userMonthlyPoints, setUserMonthlyPoints] = useState<number>(0);

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [
        { data: profiles, error: profilesError },
        { data: teams, error: teamsError },
        { data: roles, error: rolesError },
        { data: pointsHistory, error: pointsError },
      ] = await Promise.all([
        supabase.from('profiles').select('id, name, team_id'),
        supabase.from('teams').select('id, name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_points_history').select('user_id, points').gte('created_at', startDate).lte('created_at', endDate),
      ]);

      if (profilesError || teamsError || rolesError || pointsError) {
        console.error('Error fetching ranking data:', { profilesError, teamsError, rolesError, pointsError });
        setIsLoading(false);
        return;
      }

      const teamMap = new Map(teams.map(t => [t.id, t.name]));
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

      const pointsMap = new Map<string, number>();
      pointsHistory.forEach(entry => {
        pointsMap.set(entry.user_id, (pointsMap.get(entry.user_id) || 0) + entry.points);
      });

      const allUsers: RankingUser[] = profiles.map(p => ({
        id: p.id,
        name: p.name || 'Usuário',
        teamName: p.team_id ? teamMap.get(p.team_id) || 'N/A' : 'N/A',
        points: pointsMap.get(p.id) || 0,
        role: (roleMap.get(p.id) as UserRole) || 'student',
        trend: 'same', 
      }));

      const groupedRankings: Record<string, RankingUser[]> = {
        students: allUsers.filter(u => u.role === 'student').sort((a, b) => b.points - a.points),
        managers: allUsers.filter(u => u.role === 'manager').sort((a, b) => b.points - a.points),
        superintendents: allUsers.filter(u => u.role === 'superintendent').sort((a, b) => b.points - a.points),
      };

      setRankings(groupedRankings);

      if (user) {
        setUserMonthlyPoints(pointsMap.get(user.id) || 0);
        
        const roleKey = user.role === 'admin' || user.role === 'coordinator' ? 'students' : (user.role + 's').replace('ss', 's');
        const targetList = groupedRankings[user.role === 'student' ? 'students' : user.role === 'manager' ? 'managers' : 'superintendents'] || groupedRankings.students;
        
        const position = targetList.findIndex(u => u.id === user.id) + 1;
        setUserPosition(position > 0 ? position : null);
      }

      setIsLoading(false);
    };

    fetchRankings();
  }, [user]);

  const visibleTabs = useMemo(() => {
    if (!user) return [];
    switch (user.role) {
      case 'admin':
      case 'coordinator':
        return ['students', 'managers', 'superintendents'];
      case 'superintendent':
        return ['students', 'managers', 'superintendents'];
      case 'manager':
        return ['students', 'managers'];
      case 'student':
      default:
        return ['students'];
    }
  }, [user?.role]);

  const tabLabels: Record<string, string> = {
    students: 'Alunos',
    managers: 'Gerentes',
    superintendents: 'Superintendentes',
  };

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground">Rankings Mensal</h1>
                </div>
                <p className="text-muted-foreground">
                    Acompanhe sua posição e compare seu desempenho neste mês.
                </p>
            </div>
            
            {user?.role === 'admin' && (
                <Button 
                variant="outline" 
                onClick={() => navigate('/admin/ranking-config')}
                className="gap-2"
                >
                <Settings className="w-4 h-4" />
                Configurar Pontos
                </Button>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{userPosition ? `#${userPosition}` : '-'}</p>
                  <p className="text-xs text-muted-foreground">Sua Posição</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">Mês</p>
                  <p className="text-xs text-muted-foreground">Atual</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{userMonthlyPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Seus Pontos (Mês)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(rankings.students.length + rankings.managers.length + rankings.superintendents.length) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList className="bg-surface w-full justify-start overflow-x-auto">
                {visibleTabs.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {tabLabels[tab]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>

            {visibleTabs.map((tab) => {
              // CORREÇÃO AQUI: Usar rankings[tab] em vez de mockRankings
              const currentList = rankings[tab] || [];
              return (
                <TabsContent key={tab} value={tab} className="mt-0">
                    <CardContent className="pt-6">
                    {currentList.length > 0 ? (
                        <>
                            <TopThree users={currentList.slice(0, 3)} />
                            <div className="space-y-2">
                                {currentList.map((rankUser, index) => (
                                    <RankingCard key={rankUser.id} user={rankUser} position={index + 1} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            Nenhum dado de ranking para este grupo neste mês.
                        </div>
                    )}
                    </CardContent>
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Rankings;