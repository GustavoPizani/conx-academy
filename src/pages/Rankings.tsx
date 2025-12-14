import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Award, TrendingUp, Users, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABELS, UserRole } from '@/types/auth';

interface RankingUser {
  id: string;
  name: string;
  teamName: string;
  points: number;
  coursesCompleted: number;
  role: UserRole;
  trend: 'up' | 'down' | 'same';
}

// Mock ranking data
const mockRankings: Record<string, RankingUser[]> = {
  students: [
    { id: '1', name: 'Ana Silva', teamName: 'Vendas SP', points: 4850, coursesCompleted: 15, role: 'student', trend: 'up' },
    { id: '2', name: 'Pedro Santos', teamName: 'Vendas RJ', points: 4720, coursesCompleted: 14, role: 'student', trend: 'up' },
    { id: '3', name: 'Maria Oliveira', teamName: 'Vendas SP', points: 4500, coursesCompleted: 13, role: 'student', trend: 'same' },
    { id: '4', name: 'João Costa', teamName: 'Vendas MG', points: 4350, coursesCompleted: 12, role: 'student', trend: 'down' },
    { id: '5', name: 'Carla Mendes', teamName: 'Vendas RS', points: 4200, coursesCompleted: 12, role: 'student', trend: 'up' },
    { id: '6', name: 'Lucas Ferreira', teamName: 'Vendas PR', points: 4100, coursesCompleted: 11, role: 'student', trend: 'same' },
    { id: '7', name: 'Fernanda Lima', teamName: 'Vendas SP', points: 3950, coursesCompleted: 11, role: 'student', trend: 'down' },
    { id: '8', name: 'Rafael Souza', teamName: 'Vendas RJ', points: 3800, coursesCompleted: 10, role: 'student', trend: 'up' },
    { id: '9', name: 'Juliana Alves', teamName: 'Vendas SC', points: 3650, coursesCompleted: 10, role: 'student', trend: 'same' },
    { id: '10', name: 'Bruno Martins', teamName: 'Vendas BA', points: 3500, coursesCompleted: 9, role: 'student', trend: 'up' },
  ],
  managers: [
    { id: 'm1', name: 'Carlos Gerente', teamName: 'Vendas SP', points: 7200, coursesCompleted: 22, role: 'manager', trend: 'up' },
    { id: 'm2', name: 'Patricia Lider', teamName: 'Vendas RJ', points: 6800, coursesCompleted: 20, role: 'manager', trend: 'same' },
    { id: 'm3', name: 'Roberto Chefe', teamName: 'Vendas MG', points: 6500, coursesCompleted: 19, role: 'manager', trend: 'up' },
    { id: 'm4', name: 'Mariana Boss', teamName: 'Vendas RS', points: 6200, coursesCompleted: 18, role: 'manager', trend: 'down' },
    { id: 'm5', name: 'André Gestor', teamName: 'Vendas PR', points: 5900, coursesCompleted: 17, role: 'manager', trend: 'same' },
  ],
  superintendents: [
    { id: 's1', name: 'João Superintendente', teamName: 'Regional Sul', points: 9500, coursesCompleted: 30, role: 'superintendent', trend: 'up' },
    { id: 's2', name: 'Lucia Regional', teamName: 'Regional Sudeste', points: 9200, coursesCompleted: 28, role: 'superintendent', trend: 'same' },
    { id: 's3', name: 'Marcos Diretor', teamName: 'Regional Norte', points: 8800, coursesCompleted: 27, role: 'superintendent', trend: 'up' },
    { id: 's4', name: 'Clara Executiva', teamName: 'Regional Nordeste', points: 8500, coursesCompleted: 25, role: 'superintendent', trend: 'down' },
  ],
};

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
      {/* Position */}
      <div className="w-10 flex items-center justify-center">
        {getMedalIcon(position)}
      </div>

      {/* Avatar */}
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">
          {user.name}{' '}
          <span className="text-muted-foreground font-normal">({user.teamName})</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {user.coursesCompleted} cursos concluídos
        </p>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2">
        {user.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {user.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
      </div>

      {/* Points */}
      <div className="text-right">
        <p className="text-lg font-bold text-primary">{user.points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </div>
  );
};

const TopThree: React.FC<{ users: RankingUser[] }> = ({ users }) => {
  const [first, second, third] = users;
  
  return (
    <div className="flex items-end justify-center gap-4 mb-8 pt-8">
      {/* Second Place */}
      {second && (
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Avatar className="h-16 w-16 border-4 border-gray-300 mb-2">
            <AvatarFallback className="bg-surface text-foreground text-lg font-bold">
              {second.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <Medal className="w-8 h-8 text-gray-300 mb-1" />
          <p className="text-sm font-semibold text-foreground text-center max-w-[100px] truncate">{second.name}</p>
          <p className="text-xs text-muted-foreground">{second.points.toLocaleString()} pts</p>
          <div className="w-24 h-20 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg mt-2" />
        </div>
      )}

      {/* First Place */}
      {first && (
        <div className="flex flex-col items-center animate-slide-up">
          <Avatar className="h-20 w-20 border-4 border-yellow-400 mb-2 ring-4 ring-yellow-400/30">
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {first.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <Crown className="w-10 h-10 text-yellow-400 mb-1" />
          <p className="text-base font-bold text-foreground text-center max-w-[120px] truncate">{first.name}</p>
          <p className="text-sm text-primary font-semibold">{first.points.toLocaleString()} pts</p>
          <div className="w-28 h-28 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg mt-2" />
        </div>
      )}

      {/* Third Place */}
      {third && (
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Avatar className="h-14 w-14 border-4 border-amber-600 mb-2">
            <AvatarFallback className="bg-surface text-foreground font-bold">
              {third.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
  const [activeTab, setActiveTab] = useState('students');

  // Determine which tabs the user can see based on their role
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Rankings</h1>
          </div>
          <p className="text-muted-foreground">
            Acompanhe sua posição e compare seu desempenho com outros colaboradores.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">#12</p>
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
                  <p className="text-2xl font-bold text-foreground">+3</p>
                  <p className="text-xs text-muted-foreground">Esta Semana</p>
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
                  <p className="text-2xl font-bold text-foreground">{user?.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Seus Pontos</p>
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
                  <p className="text-2xl font-bold text-foreground">247</p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings Tabs */}
        <Card className="bg-card border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList className="bg-surface w-full justify-start">
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

            {visibleTabs.map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <CardContent className="pt-6">
                  {/* Top 3 Podium */}
                  <TopThree users={mockRankings[tab].slice(0, 3)} />

                  {/* Full List */}
                  <div className="space-y-2">
                    {mockRankings[tab].map((rankUser, index) => (
                      <RankingCard key={rankUser.id} user={rankUser} position={index + 1} />
                    ))}
                  </div>
                </CardContent>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Rankings;
