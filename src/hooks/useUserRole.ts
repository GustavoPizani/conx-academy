import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_HIERARCHY } from '@/types/auth';

export const useUserRole = () => {
  const { user } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isCoordinator = (): boolean => hasRole('coordinator');
  const isSuperintendent = (): boolean => hasRole('superintendent');
  const isManager = (): boolean => hasRole('manager');
  const isStudent = (): boolean => hasRole('student');

  const canManageUsers = (): boolean => isAdmin();
  const canManageContent = (): boolean => isAdmin();
  const canViewAllRankings = (): boolean => isAdmin() || isCoordinator();
  const canEditOwnEmail = (): boolean => isAdmin();

  return {
    role: user?.role,
    hasRole,
    hasMinRole,
    isAdmin,
    isCoordinator,
    isSuperintendent,
    isManager,
    isStudent,
    canManageUsers,
    canManageContent,
    canViewAllRankings,
    canEditOwnEmail,
  };
};
