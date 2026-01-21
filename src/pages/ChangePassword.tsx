import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ChangePassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const { toast } = useToast();

  const userName = user?.user_metadata?.name || user?.email || 'Usuário';
  const firstName = userName.split(' ')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de Tamanho
    if (newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    // Validação de Igualdade
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas não são iguais.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Sua senha foi atualizada. Você será redirecionado.',
        className: "bg-green-600 text-white border-none"
      });
      
      // Pequeno delay para o usuário ler a mensagem antes de sair
      setTimeout(() => {
        navigate('/home');
      }, 1500);

    } catch (error: any) {
      console.error(error);
      
      let errorTitle = 'Erro ao alterar';
      let errorDesc = error.message || 'Não foi possível alterar a senha.';

      // TRATAMENTO ESPECÍFICO DO ERRO DE SENHA IGUAL
      if (error.message?.includes('different from the old password')) {
        errorTitle = 'Senha Repetida';
        errorDesc = 'A nova senha não pode ser igual à sua senha atual. Por favor, escolha uma diferente.';
      }

      toast({
        title: errorTitle,
        description: errorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <img src="/Conxlogologin.png" alt="Conx" className="h-10 w-auto object-contain mt-1" />
            <h2 className="font-display text-2xl tracking-wider text-foreground">ACADEMY</h2>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Alterar Senha
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Olá, <strong>{firstName}</strong>! Defina sua nova senha de acesso.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="h-12 bg-surface border-border focus:border-primary pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="h-12 bg-surface border-border focus:border-primary"
                required
              />
            </div>

            <Button
              type="submit"
              variant="netflix"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;