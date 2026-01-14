import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/hooks/useSession';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  
  // Initialize session tracking for logged-in users
  useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to change password if first login
  if (user?.isFirstLogin) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      {/* Main content area */}
      <main className="md:ml-20 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};
