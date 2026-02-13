import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Play, BookOpen, Trophy, Settings, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// 1. Lista expandida com suporte a roles
const navItems = [
  { icon: Home, label: 'Início', href: '/home' },
  { icon: Play, label: 'Cursos', href: '/courses' },
  { icon: BookOpen, label: 'Biblioteca', href: '/library' },
  { icon: Trophy, label: 'Rankings', href: '/rankings' },
  { icon: Users, label: 'Usuários', href: '/admin/users', roles: ['admin'] },
  { icon: Activity, label: 'Análises', href: '/admin/analytics', roles: ['admin'] },
  { icon: Settings, label: 'Perfil', href: '/settings' },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // 2. Lógica de filtro idêntica à Sidebar
  const userRole = user?.user_metadata?.role || 'student';

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border md:hidden safe-area-bottom">
      {/* 3. Container com scroll horizontal caso tenha muitos itens para o Admin */}
      <div className="flex items-center justify-between h-16 px-2 overflow-x-auto no-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] gap-1 px-2 py-1 rounded-lg transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;