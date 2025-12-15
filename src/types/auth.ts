export type UserRole = 'admin' | 'coordinator' | 'superintendent' | 'manager' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId?: string;
  teamName?: string;
  points: number;
  isFirstLogin: boolean;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  parentTeamId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Role hierarchy for permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  coordinator: 4,
  superintendent: 3,
  manager: 2,
  student: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  superintendent: 'Superintendente',
  manager: 'Gerente',
  student: 'Aluno',
};
