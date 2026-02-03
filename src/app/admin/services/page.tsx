import { Metadata } from "next";
import ServicesManagement from "@/components/dashboard/ServicesManagement";

export const metadata: Metadata = {
  title: "Catálogo de Servicios | Administración",
  description: "Gestiona precios, categorías y duración de los servicios.",
};

export default function ServicesPage() {
  return (
    // Ajustamos la altura restando la altura aproximada del Navbar (ej. 64px o 4rem)
    // para que el scroll interno de la tabla funcione correctamente sin doble barra de scroll.
    <div className="h-[calc(100vh-4rem)] p-6 w-full max-w-[1600px] mx-auto">
      <div className="h-full">
        <ServicesManagement />
      </div>
    </div>
  );
}