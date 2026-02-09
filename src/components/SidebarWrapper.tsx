'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation"; 
import Sidebar from "./Sidebar"; 
import { Menu } from "lucide-react";

interface SidebarWrapperProps {
  userRole: string;
}

export default function SidebarWrapper({ userRole }: SidebarWrapperProps) {
  const pathname = usePathname();
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // --- ESTADO DE MONTAJE (Evita errores de hidratación) ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado aún, no mostramos nada para evitar parpadeos
  if (!mounted) return null;

  // --- LÓGICA DE OCULTAMIENTO ---
  // Normalizamos la ruta (quitamos slash final y pasamos a minúsculas)
  const currentPath = pathname?.toLowerCase().replace(/\/$/, '') || '/';
  
  // Rutas prohibidas (Login, Checkin, Auth, etc)
  // Usamos 'includes' para ser más agresivos detectando la palabra 'login'
  const isHidden = 
    currentPath === '/login' || 
    currentPath.includes('/login') ||
    currentPath.includes('/checkin') ||
    currentPath.includes('/auth');

  if (isHidden) {
    return null; // ADIÓS SIDEBAR
  }

  return (
    <>
      {/* BOTÓN MÓVIL (Solo visible en celular) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* SIDEBAR REAL */}
      <Sidebar
        userRole={userRole}
        isDesktopCollapsed={isDesktopCollapsed}
        isMobileOpen={isMobileOpen}
        toggleDesktopCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        closeMobileMenu={() => setIsMobileOpen(false)}
      />
    </>
  );
}