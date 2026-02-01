'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, TabletSmartphone, LogOut, Dog, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isDesktopCollapsed: boolean;
  isMobileOpen: boolean;
  toggleDesktopCollapse: () => void;
  closeMobileMenu: () => void;
}

export default function Sidebar({ 
  isDesktopCollapsed, 
  isMobileOpen, 
  toggleDesktopCollapse,
  closeMobileMenu
}: SidebarProps) {
  const pathname = usePathname();

  if (pathname?.startsWith('/checkin')) return null;

  const menuItems = [
    { name: 'Dashboard', icon: Home, href: '/' },
    { name: 'Nuevo Cliente', icon: PlusCircle, href: '/nuevo' },
  ];

  return (
    <>
      {/* OVERLAY MÓVIL (Solo se usa en pantallas pequeñas) */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity backdrop-blur-sm",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
      />

      {/* SIDEBAR */}
      <aside 
        className={cn(
          "bg-slate-900 text-white border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-50",
          // MÓVIL: Posición Fixed (flotante)
          "fixed inset-y-0 left-0 md:relative",
          // ANCHOS Y VISIBILIDAD
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0",
          // ANCHO ESCRITORIO
          isDesktopCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        
        {/* HEADER */}
        <div className={cn("flex items-center h-16 bg-slate-950/30 border-b border-slate-800 shrink-0 transition-all overflow-hidden relative", 
            isDesktopCollapsed ? "justify-center px-0" : "px-5 justify-between"
        )}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Dog size={24} className="text-white" />
            </div>
            <div className={cn("transition-all duration-300 whitespace-nowrap", isDesktopCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
              <h1 className="font-bold text-lg leading-none">Tail Society</h1>
            </div>
          </div>
          
          {/* Botón cerrar móvil */}
          <button onClick={closeMobileMenu} className="md:hidden text-slate-400"><X size={20}/></button>
        </div>

        {/* BOTÓN COLAPSAR (Escritorio) - Ubicado sobre el borde */}
        <button 
          onClick={toggleDesktopCollapse}
          className="hidden md:flex absolute -right-3 top-20 bg-blue-600 hover:bg-blue-500 text-white p-1 rounded-full shadow-lg border-2 border-slate-950 z-50 items-center justify-center transition-transform hover:scale-110"
        >
          {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={closeMobileMenu}
                className={cn(
                  "group flex items-center rounded-xl transition-all font-medium text-sm relative",
                  isDesktopCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                  isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={22} className={cn("shrink-0", isActive && "text-white")} />
                <span className={cn("whitespace-nowrap overflow-hidden transition-all duration-300", 
                  isDesktopCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative")}>
                  {item.name}
                </span>
                
                {/* Tooltip */}
                {isDesktopCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none z-[60] shadow-xl">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}

          <div className="my-4 border-t border-slate-800 mx-2"></div>

          <Link href="/checkin" className={cn("group flex items-center rounded-xl transition-all font-medium text-sm relative text-slate-400 hover:bg-slate-800 hover:text-green-400", isDesktopCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3")}>
            <TabletSmartphone size={22} className="shrink-0" />
            <span className={cn("whitespace-nowrap overflow-hidden transition-all duration-300", isDesktopCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative")}>
              Kiosco
            </span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
          <button className={cn("flex items-center rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-colors text-sm font-medium text-slate-400 w-full", isDesktopCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3")}>
            <LogOut size={22} className="shrink-0" />
            <span className={cn("whitespace-nowrap overflow-hidden transition-all duration-300", isDesktopCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative")}>Salir</span>
          </button>
        </div>
      </aside>
    </>
  );
}