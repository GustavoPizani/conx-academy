import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Login: React.FC = () => {
  // --- Estados do Login ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  // --- Estados do Primeiro Acesso ---
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessSent, setFirstAccessSent] = useState(false);
  const [isFirstAccessOpen, setIsFirstAccessOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Lógica de Redirecionamento ---
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
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
      let msg = error.message;
      if (msg.includes("Invalid login")) msg = "E-mail ou senha incorretos.";

      toast({
        title: 'Erro no login',
        description: msg,
        variant: 'destructive',
      });
      setLocalLoading(false);
    }
  };

  // --- Lógica do Primeiro Acesso (Nova) ---
  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstAccessEmail.trim()) {
        setErrorMessage("Digite seu e-mail corporativo.");
        return;
    }

    setFirstAccessLoading(true);
    try {
        const emailToCheck = firstAccessEmail.trim().toLowerCase();

        // 1. Verifica se o usuário existe (RPC)
        const { data: exists, error: rpcError } = await supabase.rpc('check_user_exists', { 
            email_check: emailToCheck 
        });

        if (rpcError) throw rpcError;

        if (!exists) {
            setErrorMessage("Seu e-mail não foi cadastrado. Favor chamar o RH para realizar o cadastro.");
            setFirstAccessLoading(false);
            return;
        }

        // 2. Envia Link de Senha
        const origin = window.location.origin.replace(/\/$/, '');
        const { error } = await supabase.auth.resetPasswordForEmail(emailToCheck, {
            redirectTo: `${origin}/change-password`,
        });

        if (error) {
             if (error.message.includes("Rate limit")) throw new Error("Muitas tentativas. Aguarde um pouco.");
             throw error;
        }

        setFirstAccessSent(true);
        toast({
            title: "Link Enviado!",
            description: "Verifique seu e-mail para criar a senha.",
            className: "bg-green-600 text-white border-none"
        });

    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: error.message || "Falha ao enviar link.",
        });
    } finally {
        setFirstAccessLoading(false);
    }
  };

  const resetFirstAccess = () => {
      setFirstAccessSent(false);
      setFirstAccessEmail('');
      setErrorMessage(null);
      setIsFirstAccessOpen(false);
  }

  // Spinner Inicial
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

          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-sm text-muted-foreground">
              Esqueceu sua senha?{' '}
              <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                Recuperar acesso
              </Link>
            </p>

            {/* --- BOTÃO PRIMEIRO ACESSO (Inserido discretamente aqui) --- */}
            <div className="w-full border-t border-border/50 pt-6">
                 <Dialog open={isFirstAccessOpen} onOpenChange={(open) => { setIsFirstAccessOpen(open); if(!open) setErrorMessage(null); }}>
                    <DialogTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-primary/30 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                        >
                            Primeiro Acesso? Defina sua senha aqui
                        </Button>
                    </DialogTrigger>
                    
                    {/* MODAL DE PRIMEIRO ACESSO (Conteúdo) */}
                    <DialogContent className="sm:max-w-md bg-background border-border text-foreground">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <span className="bg-primary/10 p-2 rounded-full text-primary"><Lock className="w-5 h-5"/></span>
                                Primeiro Acesso
                            </DialogTitle>
                            <DialogDescription>
                                Se você foi cadastrado recentemente pelo RH, insira seu e-mail para criar sua senha.
                            </DialogDescription>
                        </DialogHeader>

                        {!firstAccessSent ? (
                            <form onSubmit={handleFirstAccess} className="space-y-4 py-2">
                                {errorMessage && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Atenção</AlertTitle>
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="fa-email">E-mail Corporativo</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="fa-email"
                                            placeholder="seu.nome@conx.com.br"
                                            className="pl-9"
                                            value={firstAccessEmail}
                                            onChange={(e) => { setFirstAccessEmail(e.target.value); setErrorMessage(null); }}
                                            required
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" variant="netflix" disabled={firstAccessLoading} className="w-full">
                                        {firstAccessLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                                        {firstAccessLoading ? 'Verificando...' : 'Enviar Link de Criação'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in">
                                <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">E-mail Enviado!</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Verifique a caixa de entrada de <strong>{firstAccessEmail}</strong>.<br/>
                                        Clique no link recebido para criar sua senha.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={resetFirstAccess} className="w-full mt-4">
                                    Voltar para Login
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;