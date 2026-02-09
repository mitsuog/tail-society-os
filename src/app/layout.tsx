import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import SidebarWrapper from "@/components/SidebarWrapper"; 
import { createClient } from "@/utils/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tail Society OS",
  description: "Sistema Operativo para Grooming y Spa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. OBTENER ROL DEL USUARIO EN EL SERVIDOR
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = 'employee'; // Rol por defecto (el más restringido)

  if (user) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (data?.role) {
      userRole = data.role;
    }
  }

  return (
    <html lang="es">
      <body 
        className={`${inter.className} bg-slate-50 flex h-screen overflow-hidden`}
        // ESTA LÍNEA EVITA EL ERROR DE HYDRATION CAUSADO POR EXTENSIONES
        suppressHydrationWarning={true}
      >
        {/* 2. PASAR EL ROL AL COMPONENTE CLIENTE */}
        <SidebarWrapper userRole={userRole} />
        
        <main className="flex-1 overflow-y-auto relative w-full">
          {children}
        </main>
        
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}