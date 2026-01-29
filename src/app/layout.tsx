import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Users, LayoutDashboard, Settings, Menu } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tail Society OS",
  description: "CRM Profesional",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-slate-900`}>
        <div className="min-h-screen flex flex-col md:flex-row">
          
          {/* SIDEBAR (Fijo en Desktop) */}
          <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 md:h-screen md:sticky md:top-0 z-50">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-blue-400">Tail Society</h1>
                <p className="text-xs text-slate-400">Operating System</p>
              </div>
              {/* Botón menú solo visible en móvil (decorativo por ahora) */}
              <button className="md:hidden text-slate-400"><Menu size={24}/></button>
            </div>
            
            <nav className="p-4 space-y-2">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20 transition-colors">
                <Users size={20} />
                <span className="font-medium">Clientes & Mascotas</span>
              </Link>
              <div className="flex items-center gap-3 px-4 py-3 text-slate-500 cursor-not-allowed opacity-50">
                <LayoutDashboard size={20} />
                <span className="font-medium">Agenda (Próx)</span>
              </div>
            </nav>

            <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                <Settings size={18} />
                <span className="text-sm">Configuración</span>
              </div>
            </div>
          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <main className="flex-1 w-full p-4 md:p-8 lg:p-10 overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}