'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  PlusCircle, 
  TabletSmartphone, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X,
  CalendarDays, 
  Scissors,     
  Users,
  ShieldCheck,
  CalendarPlus,
  UserCircle,
  BarChart3, // [NUEVO] Icono para Analytics/Finanzas
  BrainCogIcon,
  LayoutDashboardIcon,
  UserRoundCogIcon,
  CogIcon
} from 'lucide-react'; 
import { cn } from '@/lib/utils';
import AddClientDialog from '@/components/AddClientDialog'; 
import NewAppointmentDialog from '@/components/appointments/NewAppointmentDialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface SidebarProps {
  isDesktopCollapsed: boolean;
  isMobileOpen: boolean;
  toggleDesktopCollapse: () => void;
  closeMobileMenu: () => void;
  userRole?: string;
}

export default function Sidebar({ 
  isDesktopCollapsed, 
  isMobileOpen, 
  toggleDesktopCollapse,
  closeMobileMenu,
  userRole = 'employee'
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  // --- 1. CONFIGURACIÓN DEL MENÚ ---
  const allMenuItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboardIcon, 
      href: '/', 
      allowedRoles: ['admin', 'receptionist', 'employee'] 
    },
    { 
      name: 'Calendario', 
      icon: CalendarDays, 
      href: '/appointments', 
      allowedRoles: ['admin', 'receptionist', 'employee'] 
    },
    { 
      name: 'Clientes', 
      icon: Users, 
      href: '/admin/clients', 
      allowedRoles: ['admin', 'receptionist'] 
    },
    // --- NUEVO MODULO DE ANALYTICS / FINANZAS ---
    { 
      name: 'Finanzas', 
      icon: BarChart3, 
      href: '/admin/finance', 
      allowedRoles: ['admin', 'gerente'] 
    },
    { 
      name: 'Business Intelligence', 
      icon: BrainCogIcon, 
      href: '/intelligence', 
      allowedRoles: ['admin', 'gerente'] 
    },
    { 
      name: 'Servicios', 
      icon: Scissors, 
      href: '/admin/services', 
      allowedRoles: ['admin'] 
    },
    { 
      name: 'Equipo', 
      icon: UserRoundCogIcon, 
      href: '/admin/staff', 
      allowedRoles: ['admin'] 
    },
    { 
      name: 'Admin', 
      icon: CogIcon, 
      href: '/admin/users', 
      allowedRoles: ['admin'] 
    },
  ];

  const visibleMenuItems = allMenuItems.filter(item => item.allowedRoles.includes(userRole));
  const canCreate = ['admin', 'receptionist'].includes(userRole);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Error al cerrar sesión', { description: error.message });
      } else {
        toast.success('Sesión cerrada');
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error inesperado al cerrar sesión');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Ocultar sidebar en el Kiosco
  if (pathname?.startsWith('/checkin')) return null;

  return (
    <>
      {/* OVERLAY MÓVIL (Fondo oscuro al abrir menú en celular) */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity backdrop-blur-sm",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
      />

      {/* SIDEBAR CONTAINER */}
      <aside 
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen bg-slate-950 text-slate-300 border-r border-slate-800 transition-all duration-300 flex flex-col shadow-2xl",
          // Ancho dinámico en Desktop
          isDesktopCollapsed ? "w-[80px]" : "w-[260px]",
          // Posición dinámica en Móvil (slide-in)
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* LOGO AREA */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-800/50 shrink-0 relative bg-slate-950">
          {!isDesktopCollapsed && (
             <div className="flex items-center gap-3 animate-in fade-in duration-300">
               <div className="relative w-10 h-10">
                 <Image 
                   src="/Logo500x500.png" 
                   alt="Tail Society" 
                   fill 
                   className="object-contain rounded-full"
                   priority
                 />
               </div>
               <span className="font-bold text-lg text-white tracking-tight">Tail Society</span>
             </div>
          )}
          
          {/* Logo versión colapsada (solo icono) */}
          {isDesktopCollapsed && (
            <div className="w-full flex justify-center">
               <div className="relative w-10 h-10 group">
                 <Image 
                    src="/Logo500x500.png" 
                    alt="TS" 
                    fill 
                    className="object-contain rounded-full"
                    sizes="40px"
                 />
               </div>
            </div>
          )}

          {/* Botón cerrar en Móvil */}
          <button onClick={closeMobileMenu} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>

          {/* Botón colapsar en Desktop */}
          <button 
            onClick={toggleDesktopCollapse}
            className="hidden md:flex absolute -right-3 top-8 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 shadow-lg hover:scale-110 transition-all z-50"
          >
            {isDesktopCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          
          {/* BOTONES DE ACCIÓN RÁPIDA (Responsive) */}
          {canCreate && (
            <>
              {/* Nueva Cita */}
              <button 
                onClick={() => {
                    setAppointmentModalOpen(true);
                    closeMobileMenu(); 
                }}
                className={cn(
                  "flex items-center gap-3 w-full bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-lg shadow-white/5 mb-3 group relative overflow-hidden ring-1 ring-slate-200",
                  isDesktopCollapsed ? "justify-center p-3 rounded-xl aspect-square" : "px-4 py-3 rounded-xl"
                )}
              >
                <CalendarPlus size={isDesktopCollapsed ? 24 : 20} className={cn("shrink-0 transition-transform text-purple-600", !isDesktopCollapsed && "group-hover:scale-110")} />
                {!isDesktopCollapsed && <span className="font-bold text-sm">Nueva Cita</span>}
              </button>

              {/* Nuevo Cliente */}
              <button 
                onClick={() => {
                    setClientModalOpen(true);
                    closeMobileMenu();
                }}
                className={cn(
                  "flex items-center gap-3 w-full bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-900/20 mb-6 group relative overflow-hidden",
                  isDesktopCollapsed ? "justify-center p-3 rounded-xl aspect-square" : "px-4 py-3 rounded-xl"
                )}
              >
                <PlusCircle size={isDesktopCollapsed ? 24 : 20} className={cn("shrink-0 transition-transform", !isDesktopCollapsed && "group-hover:rotate-90")} />
                {!isDesktopCollapsed && <span className="font-bold text-sm">Nuevo Cliente</span>}
              </button>
            </>
          )}

          {/* LISTA DE ITEMS */}
          <div className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = item.href === '/' 
                ? pathname === '/' 
                : pathname?.startsWith(item.href);

              return (
                <Link 
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu} 
                  className={cn(
                    "group flex items-center rounded-xl transition-all relative overflow-hidden",
                    isDesktopCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                    isActive 
                      ? "bg-slate-800 text-white font-semibold shadow-inner" 
                      : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-100"
                  )}
                  title={isDesktopCollapsed ? item.name : undefined}
                >
                  <item.icon 
                    size={22} 
                    className={cn(
                      "shrink-0 transition-colors", 
                      isActive ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300"
                    )} 
                  />
                  
                  <span className={cn(
                    "whitespace-nowrap overflow-hidden transition-all duration-300",
                    isDesktopCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative"
                  )}>
                    {item.name}
                  </span>

                  {isActive && !isDesktopCollapsed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-l-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="my-4 border-t border-slate-800 mx-2"></div>

          {/* KIOSCO LINK */}
          <Link 
            href="/checkin" 
            onClick={closeMobileMenu}
            className={cn(
              "group flex items-center rounded-xl transition-all font-medium text-sm relative text-slate-400 hover:bg-slate-800 hover:text-green-400", 
              isDesktopCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
            )}
            title="Kiosco de Check-in"
          >
            <TabletSmartphone size={22} className="shrink-0 group-hover:animate-pulse" />
            <span className={cn("whitespace-nowrap overflow-hidden transition-all duration-300", isDesktopCollapsed ? "w-0 opacity-0 absolute" : "w-auto opacity-100 relative")}>
              Kiosco
            </span>
          </Link>
        </nav>

        {/* MODALES GLOBALES DEL SIDEBAR */}
        <AddClientDialog 
          isOpen={isClientModalOpen} 
          onOpenChange={setClientModalOpen} 
        />
        
        <NewAppointmentDialog 
          open={isAppointmentModalOpen} 
          onOpenChange={setAppointmentModalOpen}
        />

        {/* LOGOUT AREA */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isDesktopCollapsed ? (isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión') : undefined}
            className={cn(
              "flex items-center rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-colors text-sm font-medium text-slate-400 w-full disabled:opacity-50 disabled:cursor-not-allowed group relative",
              isDesktopCollapsed ? "justify-center p-3" : "px-4 py-2 gap-3"
            )}
          >
            <LogOut size={20} className={cn("shrink-0", isLoggingOut && "animate-spin")} />
            {!isDesktopCollapsed && <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>}
            
            {isDesktopCollapsed && !isLoggingOut && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Cerrar Sesión
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}