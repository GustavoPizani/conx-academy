import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Play, 
  BookOpen, 
  Trophy, 
  Settings, 
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/types/auth';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Início', href: '/home' },
  { icon: Play, label: 'Cursos', href: '/courses' },
  { icon: BookOpen, label: 'Biblioteca', href: '/library' },
  { icon: Trophy, label: 'Rankings', href: '/rankings' },
  { icon: Users, label: 'Usuários', href: '/admin/users', roles: ['admin'] },
  { icon: Activity, label: 'Análises', href: '/admin/analytics', roles: ['admin'] },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out hidden md:flex flex-col',
        isExpanded ? 'w-64' : 'w-20'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <Link to="/home" className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <img
          src="/logosidebar.png"
          alt="Conx Logo"
          className="h-10 w-auto object-contain"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span
                className={cn(
                  'font-medium whitespace-nowrap transition-opacity duration-300',
                  isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
            isExpanded ? 'bg-sidebar-accent' : ''
          )}
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            className={cn(
              'flex-1 min-w-0 transition-opacity duration-300',
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role && ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className={cn(
            'w-full mt-2 justify-start text-muted-foreground hover:text-destructive',
            !isExpanded && 'justify-center px-0'
          )}
          onClick={logout}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span
            className={cn(
              'ml-3 transition-opacity duration-300',
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
            )}
          >
            Sair
          </span>
        </Button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-20 w-6 h-6 bg-sidebar-accent border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
};
