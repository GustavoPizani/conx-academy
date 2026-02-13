import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav'; 
import { SidebarProvider } from '@/components/ui/sidebar';
import { Outlet } from 'react-router-dom'; // IMPORTANTE

export const MainLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        
        {/* Sidebar: Ajustada para ocupar espaço no flexbox em vez de ser apenas fixed */}
        <aside className="hidden md:flex flex-none h-full border-r border-border/50">
          <Sidebar />
          {/* Adicionamos uma div invisível para compensar a largura da sidebar fixed, 
              ou ajustamos a sidebar para relative se preferir. 
              Como sua sidebar é fixed w-20/w-64, vamos adicionar um spacer: */}
          <div className="w-20 group-hover:w-64 transition-all duration-300 ease-in-out invisible" />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          
          {/* Navegação Mobile apenas abaixo de 768px */}
          <div className="md:hidden flex-none">
            <MobileNav />
          </div>
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none bg-background p-4 md:p-0">
            {/* AQUI ESTÁ A CORREÇÃO: 
               Usamos <Outlet /> para renderizar as rotas filhas definidas no App.tsx 
            */}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;