import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Função interna para limpar dados silenciosamente
  const clearLocalData = () => {
    setSession(null);
    setUser(null);
    localStorage.clear(); // Remove qualquer lixo de sessão
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Tenta pegar a sessão atual
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // Se der erro (Token Inválido/Fantasma), apenas limpa e segue a vida
          console.warn("Sessão inválida na inicialização (Isso é normal se o token expirou). Limpando...");
          clearLocalData();
        } else if (data.session) {
          if (mounted) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.error("Erro inesperado na Auth:", err);
        clearLocalData();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // 2. Listener para eventos futuros
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1. Faz o login no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. ATUALIZAÇÃO MANUAL (O Pulo do Gato)
      // Não esperamos o "onAuthStateChange", já definimos o user aqui para destravar a tela
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Erro no Login:", error);
      
      const message = error.message === "Invalid login credentials" 
        ? "E-mail ou senha incorretos." 
        : "Erro ao conectar. Tente novamente.";

      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // 1. Tenta avisar o Supabase que saiu
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      // 2. Limpa dados locais (independente de erro no Supabase)
      clearLocalData();
      
      // 3. FORÇA O REDIRECIONAMENTO (O Pulo do Gato)
      // Usamos window.location.href em vez de navigate.
      // Isso recarrega a página e joga o usuário para o login limpo.
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};