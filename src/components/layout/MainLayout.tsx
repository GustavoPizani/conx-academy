import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar"; // <--- CHAVES ADICIONADAS AQUI
import { MobileNav } from "./MobileNav"; // MANTENHA AS CHAVES AQUI TAMBÉM

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar Desktop */}
      {/* SIDEBAR DESKTOP:
         Removemos o wrapper fixo 'w-64'.
         A Sidebar agora é autônoma (fixed) e controla sua própria largura.
      */}
      <div className="hidden lg:block z-50">
        <Sidebar />
      </div>

      {/* Conteúdo Principal */}
      {/* CONTEÚDO PRINCIPAL:
         Ajustamos o padding-left (pl) para 'lg:pl-20'.
         Isso reserva apenas o espaço da barra FECHADA (80px).
         Assim o site ocupa a tela toda corretamente.
      */}
      <div className="flex-1 flex flex-col lg:pl-20 w-full transition-all duration-300">
        
        {/* Navegação Mobile */}
        <div className="sticky top-0 z-40 lg:hidden">
          <MobileNav />
        </div>
        
        {/* Área de Conteúdo */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};