import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Envia o e-mail de recuperação
      // O 'redirectTo' aponta para sua página de alterar senha existente
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/change-password`,
      });

      if (error) throw error;

      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada (e spam) para redefinir a senha.',
        className: 'bg-green-600 text-white border-none',
        duration: 6000,
      });
      
      // Limpa o campo
      setEmail('');

    } catch (error: any) {
      console.error('Erro reset:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar e-mail. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Lado Esquerdo - Branding (Igual ao Login) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZjY2MDAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
             <img src="/Conxlogologin.png" alt="Conx" className="h-10 w-auto object-contain mt-1" />
             <h2 className="font-display text-5xl tracking-wider text-foreground mt-2">ACADEMY</h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
            Recupere seu acesso e continue sua jornada de aprendizado e evolução profissional.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground">Recuperar Acesso</h2>
            <p className="text-muted-foreground mt-2">
              Digite o e-mail cadastrado na plataforma para receber o link de redefinição.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10 h-12 bg-surface border-border"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="netflix"
              size="lg" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Enviar Link de Recuperação'}
            </Button>
          </form>

          <div className="text-center mt-8">
            <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-2 font-medium">
              <ArrowLeft className="w-4 h-4" /> Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;