import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Lógica de Redirecionamento (MANTIDA PARA NÃO TRAVAR) ---
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/home');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setLocalLoading(true);
      const result = await login(email.trim(), password);
      
      if (result.success) {
        toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
        // O useEffect cuida do redirecionamento
      } else {
        throw new Error(result.error || "Falha ao entrar");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: 'Erro no login',
        description: error.message || "Verifique suas credenciais.",
        variant: 'destructive',
      });
      setLocalLoading(false);
    }
  };

  // Se estiver carregando, mostra apenas um spinner centralizado limpo
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* LADO ESQUERDO - BRANDING (Visual Original Restaurado) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradiente de Fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        {/* Padrão de Bolinhas (Pattern) */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZjY2MDAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        
        {/* Conteúdo da Marca */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div>
              <img src="/Conxlogologin.png" alt="Conx" className="h-10 w-auto object-contain mt-1" />
              <h2 className="font-display text-5xl tracking-wider text-foreground mt-2">ACADEMY</h2>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
            Plataforma oficial de treinamento e aprendizado da CONX Vendas pra corretores.
            Aprenda, conquiste pontos e suba no ranking.
          </p>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-10">
            <img src="/Conxlogologin.png" alt="Conx" className="h-8 w-auto object-contain" />
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-foreground">Entrar</h2>
            <p className="text-muted-foreground mt-2">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12 bg-surface border-border focus:border-primary"
                required
                autoComplete="email" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 bg-surface border-border focus:border-primary pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="netflix" // Usa o estilo laranja original
              size="lg"
              className="w-full"
              disabled={localLoading}
            >
              {localLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Esqueceu sua senha?{' '}
            {/* Link atualizado para apontar para a rota correta */}
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">
              Recuperar acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;