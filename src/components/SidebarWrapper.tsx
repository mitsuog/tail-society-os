'use client';

import { useState } from "react";
import Sidebar from "./Sidebar"; // Asegúrate de que Sidebar.tsx esté en la misma carpeta
import { Menu } from "lucide-react";

interface SidebarWrapperProps {
  userRole: string;
}

export default function SidebarWrapper({ userRole }: SidebarWrapperProps) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* BOTÓN MÓVIL (Solo visible en celular para ABRIR el menú) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* EL SIDEBAR REAL */}
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