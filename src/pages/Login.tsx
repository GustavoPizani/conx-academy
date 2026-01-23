import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para o Primeiro Acesso
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [firstAccessSent, setFirstAccessSent] = useState(false);
  const [isFirstAccessOpen, setIsFirstAccessOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha e-mail e senha.",
      });
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      navigate('/');
    } catch (error: any) {
      console.error(error);
      let msg = "Verifique suas credenciais e tente novamente.";
      if (error.message.includes("Invalid login")) msg = "E-mail ou senha incorretos.";
      
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

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

        // 1. VERIFICAÇÃO: O usuário existe no banco?
        // Chama a função RPC que criamos no SQL
        const { data: exists, error: rpcError } = await supabase.rpc('check_user_exists', { 
            email_check: emailToCheck 
        });

        if (rpcError) throw rpcError;

        // 2. SE NÃO EXISTIR: Mostra erro e manda procurar o RH
        if (!exists) {
            setErrorMessage("Seu e-mail não foi cadastrado. Favor chamar o RH para realizar o cadastro.");
            setFirstAccessLoading(false);
            return;
        }

        // 3. SE EXISTIR: Envia o link de definição de senha
        // Remove a barra final da URL se houver (segurança de formatação)
        const origin = window.location.origin.replace(/\/$/, '');
        
        const { error } = await supabase.auth.resetPasswordForEmail(emailToCheck, {
            redirectTo: `${origin}/change-password`, // Redireciona para a tela certa
        });

        if (error) {
            // Se der erro de rate limit aqui, avisamos o usuário
            if (error.message.includes("Rate limit")) {
                throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
            }
            throw error;
        }

        setFirstAccessSent(true);
        toast({
            title: "Link Enviado!",
            description: "Verifique seu e-mail para criar sua senha.",
            className: "bg-green-600 text-white border-none"
        });

    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: error.message || "Não foi possível enviar o link.",
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414] bg-[url('/Conxlogologin.png')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
      
      <div className="w-full max-w-md px-4 z-10 animate-in fade-in zoom-in duration-500">
        <div className="mb-8 text-center">
            <img src="/logosidebar.png" alt="Logo" className="h-16 mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Conx Academy</h1>
            <p className="text-gray-400 mt-2">Plataforma de Treinamento Corporativo</p>
        </div>

        <Card className="bg-black/80 border-white/10 text-white backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Acessar Plataforma</CardTitle>
            <CardDescription className="text-gray-400">Entre com suas credenciais corporativas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-red-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-gray-400 hover:text-white"
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-red-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 transition-all duration-200"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
                {/* MODAL DE PRIMEIRO ACESSO */}
                <Dialog open={isFirstAccessOpen} onOpenChange={(open) => { setIsFirstAccessOpen(open); if(!open) setErrorMessage(null); }}>
                    <DialogTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="w-full border-white/20 hover:bg-white/10 hover:text-white text-gray-300 transition-colors"
                        >
                            Primeiro Acesso? Defina sua senha
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-[#1e1e1e] border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <span className="bg-red-600/20 p-2 rounded-full text-red-500"><Lock className="w-5 h-5"/></span>
                                Primeiro Acesso
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Se você foi cadastrado recentemente pelo RH, insira seu e-mail para criar sua senha de acesso.
                            </DialogDescription>
                        </DialogHeader>

                        {!firstAccessSent ? (
                            <form onSubmit={handleFirstAccess} className="space-y-4 py-2">
                                {errorMessage && (
                                    <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Atenção</AlertTitle>
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="fa-email">E-mail Corporativo</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                        <Input
                                            id="fa-email"
                                            placeholder="seu.nome@conx.com.br"
                                            className="pl-9 bg-black/20 border-white/10"
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
                                    <p className="text-sm text-gray-400 mt-2">
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
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/5 pt-4">
            <p className="text-xs text-gray-500">© 2024 Conx Academy. Todos os direitos reservados.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;