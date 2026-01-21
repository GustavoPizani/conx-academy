import { useCallback } from 'react';
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();

  // 1. Identificação da Role
  const role = user?.user_metadata?.role || 'student';

  // 2. Verificadores de Cargo (Memoizados para evitar loops)
  const isAdmin = useCallback(() => role === 'admin', [role]);
  
  const isCoordinator = useCallback(() => role === 'coordinator' || role === 'admin', [role]);
  
  const isSuperintendent = useCallback(() => role === 'superintendent' || role === 'admin', [role]);
  
  const isManager = useCallback(() => role === 'manager' || role === 'admin' || role === 'superintendent', [role]);

  // 3. Permissões Específicas
  const canEditOwnEmail = useCallback(() => true, []);
  const canManageUsers = useCallback(() => role === 'admin', [role]);
  const canViewAnalytics = useCallback(() => role === 'admin' || role === 'coordinator', [role]);
  const canCreateContent = useCallback(() => role === 'admin', [role]);
  const canConfigureSystem = useCallback(() => role === 'admin', [role]);

  return {
    role,
    isAdmin,
    isCoordinator,
    isSuperintendent,
    isManager,
    canEditOwnEmail,
    canManageUsers,
    canViewAnalytics,
    canCreateContent,
    canConfigureSystem
  };
};