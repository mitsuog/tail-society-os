import type { Metadata } from "next";
// import { Inter } from "next/font/google"; 
import "./globals.css";
import { Toaster } from "sonner";
import SidebarWrapper from "@/components/SidebarWrapper"; 
import { createClient } from "@/utils/supabase/server";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tail Society OS",
  description: "Sistema Operativo para Grooming y Spa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = 'employee';
  if (user) {
    const { data } = await supabase.from('user_roles').select('role').eq('id', user.id).single();
    if (data?.role) userRole = data.role;
  }

  return (
    <html lang="es">
      <body 
        // 1. El body se queda fijo para que el Sidebar nunca se mueva.
        className={`font-sans bg-slate-50 fixed inset-0 overflow-hidden flex`}
        suppressHydrationWarning={true}
      >
        <SidebarWrapper userRole={userRole} />
        
        {/* CORRECCIÓN DE SCROLL (ROOT CAUSE) */}
        <main className="flex-1 flex flex-col relative w-full h-full pt-14 md:pt-0 overflow-y-auto overflow-x-hidden">
             {/* EXPLICACIÓN TÉCNICA:
                1. 'overflow-y-auto': Habilita el scroll global para páginas largas (como Clientes).
                2. 'h-full': Permite que páginas tipo Dashboard (Nómina) tomen todo el alto y usen su propio scroll interno si quieren.
                3. 'pt-14': Protege el espacio del botón hamburguesa en móviles.
             */}
          {children}
        </main>
        
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}