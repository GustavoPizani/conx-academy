export type UserRole = 'admin' | 'coordinator' | 'superintendent' | 'manager' | 'student';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  superintendent: 'Superintendente',
  manager: 'Gerente',
  student: 'Aluno',
};
