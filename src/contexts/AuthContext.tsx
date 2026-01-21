import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '@/integrations/supabase/client';
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

  // Função de limpeza agressiva
  const clearSession = async () => {
    console.warn("⚠️ Sessão inválida detectada. Limpando dados...");
    
    // 1. Limpa o estado local
    setSession(null);
    setUser(null);
    
    // 2. Limpa o Local Storage (onde o token fantasma vive)
    localStorage.clear(); 
    sessionStorage.clear();

    // 3. Garante o logout no Supabase
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        
        // 1. Tenta pegar a sessão atual
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
        } else {
          // Se não tem sessão, garante que tudo esteja limpo
          await clearSession();
        }

      } catch (error: any) {
        console.error("Erro na inicialização da Auth:", error);
        
        // SE DER O ERRO DO TOKEN FANTASMA, LIMPA TUDO
        if (
          error.message?.includes("Refresh Token Not Found") || 
          error.message?.includes("Invalid Refresh Token") ||
          error.message?.includes("json") // Erros de parse
        ) {
          await clearSession();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. Escuta mudanças em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth event: ${event}`);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        setUser(null);
        localStorage.clear(); // Limpeza extra por segurança
      } else if (session) {
        setSession(session);
        setUser(session.user);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Tratamento específico para credenciais erradas vs erro de sistema
      const message = error.message === "Invalid login credentials" 
        ? "E-mail ou senha incorretos." 
        : error.message;

      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      await clearSession(); // Usa nossa função de limpeza
      toast({
        title: "Saiu com sucesso",
        description: "Você foi desconectado.",
      });
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
