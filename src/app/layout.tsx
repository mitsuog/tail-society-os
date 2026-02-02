import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"; // Asegúrate que la ruta sea correcta
import DashboardShell from "@/components/DashboardShell"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tail Society OS",
  description: "Gestión Veterinaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* Agregamos 'suppressHydrationWarning' aquí. 
         Esto silencia el error causado por extensiones del navegador 
         que modifican el body (como ColorZilla, Grammarly, etc).
      */}
      <body 
        className={`${inter.className} bg-slate-50`} 
        suppressHydrationWarning={true}
      >
        {/* El Shell maneja todo el layout */}
        <DashboardShell>
          {children}
        </DashboardShell>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}