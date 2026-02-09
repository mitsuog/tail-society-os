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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = 'employee';

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
      {/* CLAVE: h-screen y overflow-hidden aquí evitan que 'rebote' la página completa en iPhone */}
      <body 
        className={`${inter.className} bg-slate-50 flex h-screen w-screen overflow-hidden`}
        suppressHydrationWarning={true}
      >
        <SidebarWrapper userRole={userRole} />
        
        {/* Main con overflow-hidden para forzar el scroll solo en los hijos */}
        <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
          {children}
        </main>
        
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}