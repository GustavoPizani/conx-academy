import React, { useState } from 'react';
import { User, Lock, Bell, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/types/auth';

const Settings: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    newCourses: true,
    rankings: true,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas não são iguais.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const success = await updatePassword(newPassword);
    setIsLoading(false);

    if (success) {
      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
        </div>

        {/* Profile Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Perfil
            </CardTitle>
            <CardDescription>Suas informações pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded">
                  {user?.role && ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Equipe</p>
                <p className="font-medium text-foreground">{user?.teamName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pontos Totais</p>
                <p className="font-medium text-primary">{user?.points.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-surface border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-surface border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-surface border-border"
                  required
                />
              </div>

              <Button type="submit" variant="netflix" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </CardTitle>
            <CardDescription>Configure suas preferências de notificação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Novos Cursos</p>
                <p className="text-sm text-muted-foreground">Aviso quando novos cursos forem adicionados</p>
              </div>
              <Switch
                checked={notifications.newCourses}
                onCheckedChange={(checked) => setNotifications({ ...notifications, newCourses: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Atualizações de Ranking</p>
                <p className="text-sm text-muted-foreground">Notificar mudanças na sua posição</p>
              </div>
              <Switch
                checked={notifications.rankings}
                onCheckedChange={(checked) => setNotifications({ ...notifications, rankings: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
