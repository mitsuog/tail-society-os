'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { Menu, Dog } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Estados
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // PÁGINAS SIN LAYOUT: Login y Kiosco
  if (pathname?.startsWith('/checkin') || pathname?.startsWith('/login') || pathname === '/login') {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    // CONTENEDOR FLEX PRINCIPAL (Ocupa toda la pantalla, sin scroll global)
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* 1. SIDEBAR */}
      {/* Es un elemento Flex, no Fixed. Ocupa su espacio físico real. */}
      <Sidebar 
        isDesktopCollapsed={isDesktopCollapsed}
        isMobileOpen={isMobileOpen}
        toggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        closeMobileMenu={() => setIsMobileOpen(false)}
      />

      {/* 2. AREA DE CONTENIDO (Lado Derecho) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Móvil (Solo visible en celular) */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
               <Menu className="text-slate-700" />
             </Button>
             <span className="font-bold text-slate-900 flex items-center gap-2">
               <Dog size={18} className="text-blue-600"/> Tail Society
             </span>
          </div>
        </header>

        {/* Main con Scroll Independiente */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      
    </div>
  );
}