import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
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
      <body className={`${inter.className} bg-slate-50`}>
        {/* El Shell maneja todo el layout */}
        <DashboardShell>
          {children}
        </DashboardShell>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}