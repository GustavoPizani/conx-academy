import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'thiago@conxvendas.com.br': {
    password: 'Conx@2025',
    user: {
      id: '1',
      email: 'thiago@conxvendas.com.br',
      name: 'Thiago Admin',
      role: 'admin',
      points: 15000,
      isFirstLogin: false,
    },
  },
  'coordinator@conx.com': {
    password: 'demo123',
    user: {
      id: '2',
      email: 'coordinator@conx.com',
      name: 'Maria Coordenadora',
      role: 'coordinator',
      points: 12000,
      isFirstLogin: false,
    },
  },
  'super@conx.com': {
    password: 'demo123',
    user: {
      id: '3',
      email: 'super@conx.com',
      name: 'João Superintendente',
      role: 'superintendent',
      teamId: 'team-1',
      teamName: 'Regional Sul',
      points: 9500,
      isFirstLogin: false,
    },
  },
  'manager@conx.com': {
    password: 'demo123',
    user: {
      id: '4',
      email: 'manager@conx.com',
      name: 'Carlos Gerente',
      role: 'manager',
      teamId: 'team-2',
      teamName: 'Vendas SP',
      points: 7200,
      isFirstLogin: false,
    },
  },
  'student@conx.com': {
    password: 'demo123',
    user: {
      id: '5',
      email: 'student@conx.com',
      name: 'Ana Aluna',
      role: 'student',
      teamId: 'team-2',
      teamName: 'Vendas SP',
      points: 3400,
      isFirstLogin: true,
    },
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser = MOCK_USERS[email.toLowerCase()];
    
    if (mockUser && mockUser.password === password) {
      setUser(mockUser.user);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: 'E-mail ou senha incorretos' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!user) return false;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser({ ...user, isFirstLogin: false });
    return true;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
